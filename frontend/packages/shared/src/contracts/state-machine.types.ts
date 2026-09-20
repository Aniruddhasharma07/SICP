import { UserRole } from '../enums/roles.enum';

export interface StateTransitionContext<TEntity = unknown> {
  entityId: string;
  fromState: string;
  toState: string;
  actorId: string;
  actorRole: UserRole;
  actorOrganizationId?: string;
  reason?: string;
  entity: TEntity;
  metadata?: Record<string, unknown>;
}

export interface TransitionRule<TState extends string = string> {
  from: TState;
  to: TState;
  allowedRoles: readonly UserRole[];
  description: string;
  requiresReason?: boolean;
}

export interface StateTransitionResult<TEntity = unknown> {
  success: boolean;
  previousState: string;
  newState: string;
  entity: TEntity;
  transitionTimestamp: string;
  auditLogId: string;
  timelineId: string;
}
