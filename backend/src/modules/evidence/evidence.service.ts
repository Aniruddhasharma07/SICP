import { prisma } from '../../database/prisma';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { ChallengeEvidenceDto, AuditAction } from '@sicp/shared';
import { AuditService } from '../audit/audit.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
]);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface RegisterEvidenceParams {
  challengeId: string;
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  requestId: string;
  ipAddress?: string;
}

export class EvidenceService {
  public static async registerEvidence(params: RegisterEvidenceParams): Promise<ChallengeEvidenceDto> {
    if (!ALLOWED_MIME_TYPES.has(params.mimeType.toLowerCase())) {
      throw new ValidationError(`Unsupported file type '${params.mimeType}'. Allowed types: JPEG, PNG, WEBP, PDF, MP4.`);
    }

    if (params.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(`File size exceeds limit of 15MB. Provided: ${(params.sizeBytes / (1024 * 1024)).toFixed(2)}MB.`);
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: params.challengeId },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', params.challengeId);
    }

    const evidence = await prisma.challengeEvidence.create({
      data: {
        challengeId: params.challengeId,
        fileKey: params.fileKey,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storageBucket: 'challenge-evidence',
        uploadedById: params.uploadedById,
      },
    });

    await AuditService.record({
      actorId: params.uploadedById,
      action: AuditAction.EVIDENCE_UPLOAD,
      resource: 'ChallengeEvidence',
      resourceId: evidence.id,
      newState: { fileKey: evidence.fileKey, originalName: evidence.originalName, mimeType: evidence.mimeType },
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    return {
      id: evidence.id,
      challengeId: evidence.challengeId,
      fileKey: evidence.fileKey,
      originalName: evidence.originalName,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      storageBucket: evidence.storageBucket,
      uploadedById: evidence.uploadedById,
      createdAt: evidence.createdAt.toISOString(),
    };
  }
}
