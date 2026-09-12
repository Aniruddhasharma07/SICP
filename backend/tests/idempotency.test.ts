import { idempotencyMiddleware } from '../src/core/middlewares/idempotency.middleware';
import { prisma } from '../src/database/prisma';
import { Request, Response, NextFunction } from 'express';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    idempotencyRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Idempotency Key Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: 'POST',
      url: '/api/v1/challenges',
      header: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      locals: { requestId: 'req-idem-1' },
    };
    mockNext = jest.fn();
  });

  it('bypasses GET requests even if header is present', () => {
    mockReq.method = 'GET';
    mockReq.header.mockReturnValue('key-123');

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(prisma.idempotencyRecord.findUnique).not.toHaveBeenCalled();
  });

  it('bypasses mutating requests when Idempotency-Key header is absent', () => {
    mockReq.header.mockReturnValue(undefined);

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(prisma.idempotencyRecord.findUnique).not.toHaveBeenCalled();
  });

  it('replays cached response when valid idempotency record exists', async () => {
    mockReq.header.mockReturnValue('idem-key-abc');
    const cachedBody = { success: true, data: { id: 'c-999', title: 'Created once' } };

    (prisma.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue({
      key: 'idem-key-abc',
      responseStatus: 201,
      responseBody: cachedBody,
      expiresAt: new Date(Date.now() + 1000000),
    });

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    // Wait for promise resolution in middleware
    await new Promise(process.nextTick);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Idempotency-Replay', 'true');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(cachedBody);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next() and intercepts json to cache response when key is new', async () => {
    mockReq.header.mockReturnValue('new-idem-key');
    (prisma.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.idempotencyRecord.create as jest.Mock).mockResolvedValue({ id: 'rec-1' });

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockNext).toHaveBeenCalled();

    // Trigger intercepted json response
    mockRes.statusCode = 201;
    mockRes.json({ success: true, data: { id: 'new-id' } });

    expect(prisma.idempotencyRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'new-idem-key',
        responseStatus: 201,
      }),
    });
  });
});