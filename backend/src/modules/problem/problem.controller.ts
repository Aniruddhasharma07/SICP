import { Request, Response, NextFunction } from 'express';
import { ProblemGroupingService } from '../../domain/intelligence/problem-grouping.service';
import { SystemicInvestigationEngine } from '../../domain/intelligence/providers/systemic-investigation.engine';
import { prisma } from '../../database/prisma';
import { sendSuccess } from '../../utils/response';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { SelfHealingService } from './self-healing.service';
import { SolutionRetrievalEngine } from '../../domain/intelligence/solution-retrieval.engine';

export class ProblemController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        title,
        description,
        category,
        latitude,
        longitude,
        locationName,
        district,
        state,
        wardNumber,
        cityCorporation,
        isAnonymous,
      } = req.body;

      if (!title || !description || !category) {
        throw new ValidationError('title, description, and category are required');
      }

      const problem = await ProblemGroupingService.submitProblem({
        title,
        description,
        category,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationName,
        district,
        state,
        wardNumber,
        cityCorporation,
        submitterId: req.user?.id,
        isAnonymous,
      });

      sendSuccess(res, problem, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const problem = await prisma.problem.findUnique({
        where: { id: req.params.id },
        include: {
          group: {
            include: {
              challenge: {
                include: { evidence: true },
              },
              members: {
                include: { problem: true },
              },
              solutionMemories: true,
            },
          },
          challengeLinks: {
            include: {
              challenge: {
                include: { evidence: true },
              },
            },
          },
          overrideLogs: {
            orderBy: { createdAt: 'desc' },
          },
          clarificationRequests: {
            include: {
              responses: true,
            },
          },
        },
      });

      if (!problem) {
        throw new NotFoundError('Problem', req.params.id);
      }

      const challengeEvidence =
        problem.challengeLinks?.[0]?.challenge?.evidence ||
        (problem.group as any)?.challenge?.evidence ||
        [];

      sendSuccess(
        res,
        {
          ...problem,
          evidence: challengeEvidence,
          mediaUrls: challengeEvidence.map((e: any) =>
            e.fileKey.startsWith('http') || e.fileKey.startsWith('data:')
              ? e.fileKey
              : `/api/v1/evidence/${e.fileKey}`
          ),
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await SelfHealingService.runOnce().catch(() => {});
      const { category, district, status, submitterId, myOnly, ids, limit, offset } = req.query;
      const take = limit ? parseInt(limit as string) : 50;
      const skip = offset ? parseInt(offset as string) : 0;

      const where: any = {};
      if (category) where.category = category as string;
      if (district) where.district = { contains: district as string, mode: 'insensitive' };
      if (status) where.status = status as any;
      if (submitterId) {
        where.submitterId = submitterId as string;
      } else if (myOnly === 'true' && req.user?.id) {
        where.submitterId = req.user.id;
      }

      if (ids) {
        const idList = (ids as string).split(',').map(s => s.trim()).filter(Boolean);
        if (idList.length > 0) {
          const currentSubmitterId = where.submitterId;
          delete where.submitterId;
          where.OR = [
            { id: { in: idList } },
            ...(currentSubmitterId ? [{ submitterId: currentSubmitterId }] : []),
          ];
        }
      }

      const [problems, total] = await Promise.all([
        prisma.problem.findMany({
          where,
          take,
          skip,
          orderBy: { createdAt: 'desc' },
          include: {
            group: {
              select: {
                id: true,
                title: true,
                relationshipStrength: true,
                challengeId: true,
                challenge: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    category: true,
                    severity: true,
                    priority: true,
                  },
                },
              },
            },
            challengeLinks: {
              include: {
                challenge: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    category: true,
                    severity: true,
                    priority: true,
                  },
                },
              },
            },
          },
        }),
        prisma.problem.count({ where }),
      ]);

      sendSuccess(res, { items: problems, total, limit: take, offset: skip }, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async removeFromGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId, reason } = req.body;
      if (!groupId || !reason) {
        throw new ValidationError('groupId and reason are required to remove a problem from a group');
      }

      const result = await ProblemGroupingService.removeProblemFromGroup(
        req.params.id,
        groupId,
        reason,
        req.user?.id
      );

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async detachGroupFromChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, reason } = req.body;
      if (!challengeId || !reason) {
        throw new ValidationError('challengeId and reason are required to split a group into a new challenge');
      }

      const result = await ProblemGroupingService.removeGroupFromChallenge(
        req.params.id,
        challengeId,
        reason,
        req.user?.id
      );

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async override(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { severity, priority, affectedPopulation, reason } = req.body;
      if (!reason) {
        throw new ValidationError('A recorded justification reason is required for government overrides.');
      }

      const result = await ProblemGroupingService.applyGovernmentOverride(req.params.id, {
        severity,
        priority,
        affectedPopulation: affectedPopulation !== undefined ? parseInt(affectedPopulation) : undefined,
        reason,
        officerId: req.user?.id,
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getInvestigation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const investigation = await SystemicInvestigationEngine.getInvestigation(req.params.id);
      sendSuccess(res, investigation, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async validateInvestigation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hypothesisTitle, reason } = req.body;
      if (!hypothesisTitle || !reason) {
        throw new ValidationError('hypothesisTitle and reason are required for government validation');
      }

      const result = await ProblemGroupingService.validateInvestigation(
        req.params.id,
        hypothesisTitle,
        reason,
        req.user?.id
      );

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getSolutionMemory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;

      // Group-level solution memory
      const groups = await prisma.problemGroup.findMany({
        where: { challengeId },
        include: { solutionMemories: true },
      });

      const groupMemories = groups.flatMap((g) =>
        g.solutionMemories.map((m) => ({
          ...m,
          groupTitle: g.title,
          scope: 'GROUP_PROBLEM_TYPE',
        }))
      );

      // Challenge-level systemic solution memory
      let challengeMemories = await prisma.solutionMemory.findMany({
        where: { challengeId },
        take: 10,
      });

      // If no memory is explicitly tagged with this challengeId, query live precedents via SolutionRetrievalEngine!
      if (challengeMemories.length === 0) {
        const challenge = await prisma.challenge.findUnique({
          where: { id: challengeId },
        });

        if (challenge) {
          const livePrecedents = await SolutionRetrievalEngine.retrieveRelevantSolutions({
            challengeId: challenge.id,
            title: challenge.title,
            description: challenge.description,
            category: challenge.category,
            district: challenge.district,
            state: challenge.state,
            limit: 6,
          });

          sendSuccess(res, {
            challengeId,
            groupLevel: groupMemories,
            challengeLevel: livePrecedents.map((m) => ({
              id: m.memoryId,
              title: m.title,
              intervention: m.technicalApproach || m.title,
              classification:
                m.outcomeStatus === 'SUCCESSFUL' || m.outcomeStatus === 'EFFECTIVE'
                  ? 'PREVIOUSLY_WORKED'
                  : m.outcomeStatus === 'FAILED' || m.outcomeStatus === 'INEFFECTIVE'
                  ? 'NOT_WORKED'
                  : 'MIXED_OUTCOME',
              evidenceSource: m.verifiedImpact || m.whatWorked || 'State Innovation Repository Verified Outcome',
              scope: 'CHALLENGE_SYSTEMIC_CAUSE',
              domain: m.challengeCategory,
              relevanceScore: m.relevanceScore,
              reusabilityScore: m.reusabilityScore,
              whatWorked: m.whatWorked,
              whatFailed: m.whatFailed,
              knownLimitations: m.knownLimitations,
              lessonsLearned: m.lessonsLearned,
            })),
          }, 200);
          return;
        }
      }

      sendSuccess(res, {
        challengeId,
        groupLevel: groupMemories,
        challengeLevel: challengeMemories.map((m) => ({
          id: m.id,
          title: m.title,
          intervention: m.technicalApproach || m.title,
          classification: m.outcomeStatus === 'SUCCESSFUL' ? 'PREVIOUSLY_WORKED' : m.outcomeStatus === 'FAILED' ? 'NOT_WORKED' : 'MIXED_OUTCOME',
          evidenceSource: m.reusabilityExplanation || m.whatWorked || 'State Innovation Repository Verified Outcome',
          scope: 'CHALLENGE_SYSTEMIC_CAUSE',
          domain: m.challengeCategory,
        })),
      }, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async addGroupSolutionMemory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, intervention, classification, evidenceSource } = req.body;
      if (!title || !intervention) {
        throw new ValidationError('title and intervention are required');
      }

      const memory = await prisma.groupSolutionMemory.create({
        data: {
          groupId: req.params.id,
          title,
          intervention,
          classification: classification || 'PREVIOUSLY_WORKED',
          evidenceSource: evidenceSource || 'Field Maintenance Log',
        },
      });

      sendSuccess(res, memory, 201);
    } catch (err) {
      next(err);
    }
  }
}

