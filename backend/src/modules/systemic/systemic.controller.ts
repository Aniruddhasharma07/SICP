import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { SystemicIncidentService } from '../../domain/intelligence/systemic-incident.service';
import { SentinelChoice, UserRole } from '@sicp/shared';

export class SystemicController {
  /**
   * List all active systemic incidents
   */
  public static async listIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, category, district } = req.query as {
        status?: string;
        category?: string;
        district?: string;
      };

      const incidents = await SystemicIncidentService.listIncidents({ status, category, district });
      sendSuccess(res, incidents, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get 24-point Root Cause Dossier by Incident ID
   */
  public static async getIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incidentId = req.params.id;
      const incident = await SystemicIncidentService.getIncidentById(incidentId);
      sendSuccess(res, incident, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get graph topology with computed impact coloring
   */
  public static async getGraph(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incidentId = req.params.id;
      const incident = await SystemicIncidentService.getIncidentById(incidentId);
      sendSuccess(res, incident.graph, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Submit citizen sentinel probe response
   */
  public static async submitSentinelResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { probeRequestId, choice, feedbackText, latitude, longitude } = req.body as {
        probeRequestId: string;
        choice: SentinelChoice;
        feedbackText?: string;
        latitude?: number;
        longitude?: number;
      };

      const result = await SystemicIncidentService.submitSentinelResponse({
        probeRequestId,
        userId: req.user?.id || null,
        choice,
        feedbackText,
        latitude,
        longitude,
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Authoritative Government Officer validation of leading hypothesis
   */
  public static async validateHypothesis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incidentId = req.params.id;
      const { hypothesisId, reason } = req.body as {
        hypothesisId: string;
        reason: string;
      };

      const actorId = req.user?.id || 'officer-gov-01';
      const actorRole = (req.user?.role as UserRole) || UserRole.GOVERNMENT_OFFICER;
      const actorName = req.user?.email || 'Er. Rajesh Varma (Executive Engineer, PHED)';

      const updated = await SystemicIncidentService.validateHypothesis({
        incidentId,
        hypothesisId,
        reason,
        actorId,
        actorName,
        actorRole,
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Dispatch municipal field team
   */
  public static async dispatchFieldTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incidentId = req.params.id;
      const { instructions, targetNodeIds } = req.body as {
        instructions: string;
        targetNodeIds: string[];
      };

      const actorId = req.user?.id || 'officer-gov-01';
      const actorRole = (req.user?.role as UserRole) || UserRole.GOVERNMENT_OFFICER;
      const actorName = req.user?.email || 'PHED Dispatch Officer';

      const updated = await SystemicIncidentService.dispatchFieldTeam({
        incidentId,
        instructions: instructions || 'Conduct acoustic pipeline leak detection and measure static/residual pressures.',
        targetNodeIds: targetNodeIds || [],
        actorId,
        actorName,
        actorRole,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create multidisciplinary intervention project for University & Industry
   */
  public static async createProjectIntervention(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incidentId = req.params.id;
      const { projectTitle, projectDescription, targetDomain, estimatedBudget } = req.body as {
        projectTitle: string;
        projectDescription: string;
        targetDomain: string;
        estimatedBudget?: number;
      };

      const actorId = req.user?.id || 'officer-gov-01';
      const actorRole = (req.user?.role as UserRole) || UserRole.GOVERNMENT_OFFICER;

      const result = await SystemicIncidentService.createProjectIntervention({
        incidentId,
        projectTitle: projectTitle || 'Kolar Feeder Main 4 Hydrodynamic Stabilization & Acoustic Monitoring',
        projectDescription: projectDescription || 'University R&D and Industry CSR project to model water hammer, deploy acoustic sensor nodes, and repair sub-soil main rupture.',
        targetDomain: targetDomain || 'WATER_DISTRIBUTION',
        estimatedBudget: estimatedBudget || 1500000,
        actorId,
        actorRole,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get executive rapid demonstration scenario
   */
  public static async getDemoScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scenario = SystemicIncidentService.initControlledDemoScenario();
      sendSuccess(res, scenario, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reset demonstration scenario to initial state
   */
  public static async resetDemoScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scenario = SystemicIncidentService.initControlledDemoScenario();
      sendSuccess(res, scenario, 200);
    } catch (err) {
      next(err);
    }
  }
}
