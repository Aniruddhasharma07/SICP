import { Request, Response, NextFunction } from 'express';
import { SolutionService } from './solution.service';
import { sendSuccess } from '../../utils/response';

export class SolutionController {
  /**
   * POST /api/v1/solutions/draft-from-project/:projectId
   */
  public static async generateDraftFromProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const user = req.user!;
      const result = await SolutionService.generateDraftFromProject({
        projectId,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-draft-solution',
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/solutions
   */
  public static async createSolutionMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const result = await SolutionService.createSolutionMemory({
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-create-solution',
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/solutions/:id
   */
  public static async updateSolutionMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const result = await SolutionService.updateSolutionMemory({
        id,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-update-solution',
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/solutions/:id/review
   */
  public static async reviewSolutionMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const result = await SolutionService.reviewSolutionMemory({
        id,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-review-solution',
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/solutions/:id
   */
  public static async getSolutionMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      const result = await SolutionService.getSolutionMemory(id, user?.role);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/solutions
   */
  public static async searchSolutions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { query, category, problemType, outcomeStatus, reusabilityClass, evidenceLevel, status, limit, offset, projectId } = req.query;

      const result = await SolutionService.searchSolutions(
        {
          query: query ? String(query) : undefined,
          category: category ? String(category) : undefined,
          problemType: problemType as any,
          outcomeStatus: outcomeStatus as any,
          reusabilityClass: reusabilityClass as any,
          evidenceLevel: evidenceLevel as any,
          status: status as any,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
          ...((projectId ? { projectId: String(projectId) } : {}) as any),
        },
        user?.role
      );
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/solutions/compare
   */
  public static async compareSolutions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { solutionIds } = req.body;
      const result = await SolutionService.compareSolutions(solutionIds, user?.role);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/solutions/historical/challenge/:challengeId
   */
  public static async getChallengeHistoricalSolutions(req: Request, res: Response, next: NextFunction) {
    try {
      const { challengeId } = req.params;
      const user = req.user;
      const result = await SolutionService.getChallengeHistoricalSolutions(challengeId, user?.role);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/knowledge/analytics
   */
  public static async getKnowledgeAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SolutionService.getKnowledgeAnalytics();
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/knowledge/institutional/:organizationId
   */
  public static async getInstitutionalLearning(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const result = await SolutionService.getInstitutionalLearning(organizationId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/knowledge/assistant
   */
  public static async askKnowledgeAssistant(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const result = await SolutionService.askKnowledgeAssistant({
        request: req.body,
        userRole: user?.role || ('CITIZEN' as any),
        userId: user?.id,
        requestId: (req as any).requestId || 'req-knowledge-assistant',
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
