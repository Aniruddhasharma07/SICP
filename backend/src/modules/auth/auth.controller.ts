import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, refreshSchema } from './auth.schemas';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export class AuthController {
  private static setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await AuthService.register(validated, {
        requestId,
        ipAddress: req.ip,
      });

      AuthController.setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await AuthService.login(validated, {
        requestId,
        userAgent: req.header('user-agent'),
        ipAddress: req.ip,
      });

      AuthController.setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = refreshSchema.parse(req.body);
      const token = parsed.refreshToken || req.cookies?.refreshToken;
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new UnauthorizedError('No refresh token provided');
      }
      const requestId = (res.locals.requestId as string) || 'unknown';

      const result = await AuthService.refresh(token.trim(), {
        requestId,
        ipAddress: req.ip,
      });

      AuthController.setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.body.refreshToken || req.cookies?.refreshToken;
      const requestId = (res.locals.requestId as string) || 'unknown';
      await AuthService.logout(token, req.user?.id, { requestId, ipAddress: req.ip });

      res.clearCookie('refreshToken');
      sendSuccess(res, { loggedOut: true }, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.getMe(req.user!.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async demoSwitch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (res.locals.requestId as string) || 'req-demo-switch';
      const result = await AuthService.demoSwitch(req.body, {
        requestId,
        userAgent: req.header('user-agent'),
        ipAddress: req.ip,
      });

      AuthController.setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
