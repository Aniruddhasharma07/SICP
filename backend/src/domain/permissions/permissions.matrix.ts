import { UserRole } from '@sicp/shared';

export type Permission =
  | 'challenge:create'
  | 'challenge:view'
  | 'challenge:update'
  | 'challenge:submit'
  | 'challenge:review'
  | 'challenge:request_info'
  | 'challenge:approve'
  | 'challenge:reject'
  | 'evidence:upload'
  | 'org:create'
  | 'org:view'
  | 'org:update'
  | 'org:verify_submit'
  | 'org:verify_review'
  | 'audit:view'
  | 'system:manage'
  | 'university:manage'
  | 'team:create'
  | 'team:manage'
  | 'proposal:create'
  | 'proposal:submit'
  | 'proposal:review'
  | 'partnership:manage'
  | 'funding:manage'
  | 'project:manage'
  | 'prototype:create'
  | 'prototype:submit'
  | 'prototype:review'
  | 'prototype:approve'
  | 'testing:create'
  | 'testing:execute'
  | 'testing:review'
  | 'pilot:create'
  | 'pilot:approve'
  | 'pilot:manage'
  | 'deployment:create'
  | 'deployment:approve'
  | 'deployment:execute'
  | 'outcome:submit'
  | 'outcome:review'
  | 'outcome:verify'
  | 'innovation:create'
  | 'innovation:verify'
  | 'citizen:feedback'
  | 'solution:view'
  | 'solution:create'
  | 'solution:edit'
  | 'solution:review'
  | 'solution:publish'
  | 'solution:compare'
  | 'knowledge:search'
  | 'knowledge:analytics'
  | 'knowledge:assistant'
  | 'knowledge:admin'
  | 'reports:export';

/**
 * Centralized RBAC Permission Matrix for all 15 SICP roles.
 * Phase 1 fully activates and tests: CITIZEN, GOVERNMENT_OFFICER, UNIVERSITY_ADMIN, SYSTEM_ADMIN.
 * Phase 4 expands: FACULTY, STUDENT, RESEARCH_ASSISTANT, INDUSTRY_PARTNER, STARTUP, MSME, CSR_ORGANIZATION.
 * Phase 6 adds: Solution memory, semantic knowledge retrieval, institutional learning, and AI assistant permissions.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.CITIZEN]: [
    'challenge:create',
    'challenge:view',
    'challenge:update',
    'challenge:submit',
    'evidence:upload',
    'org:create',
    'org:view',
    'citizen:feedback',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.COMMUNITY_GROUP]: [
    'challenge:create',
    'challenge:view',
    'challenge:update',
    'challenge:submit',
    'evidence:upload',
    'org:view',
    'org:verify_submit',
    'citizen:feedback',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.PRI]: [
    'challenge:create',
    'challenge:view',
    'challenge:update',
    'challenge:submit',
    'evidence:upload',
    'org:view',
    'citizen:feedback',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.ULB]: [
    'challenge:create',
    'challenge:view',
    'challenge:update',
    'challenge:submit',
    'evidence:upload',
    'org:view',
    'citizen:feedback',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.GOVERNMENT_DEPARTMENT]: [
    'challenge:view',
    'challenge:review',
    'challenge:request_info',
    'challenge:approve',
    'challenge:reject',
    'org:create',
    'org:view',
    'org:verify_review',
    'audit:view',
    'proposal:review',
    'funding:manage',
    'project:manage',
    'prototype:review',
    'prototype:approve',
    'testing:review',
    'pilot:approve',
    'deployment:approve',
    'outcome:review',
    'outcome:verify',
    'innovation:verify',
    'solution:view',
    'solution:create',
    'solution:edit',
    'solution:review',
    'solution:publish',
    'solution:compare',
    'knowledge:search',
    'knowledge:analytics',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.GOVERNMENT_OFFICER]: [
    'challenge:view',
    'challenge:review',
    'challenge:request_info',
    'challenge:approve',
    'challenge:reject',
    'org:create',
    'org:view',
    'org:verify_review',
    'audit:view',
    'proposal:review',
    'funding:manage',
    'project:manage',
    'prototype:review',
    'prototype:approve',
    'testing:review',
    'pilot:approve',
    'deployment:approve',
    'outcome:review',
    'outcome:verify',
    'innovation:create',
    'innovation:verify',
    'solution:view',
    'solution:create',
    'solution:edit',
    'solution:review',
    'solution:publish',
    'solution:compare',
    'knowledge:search',
    'knowledge:analytics',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.UNIVERSITY_ADMIN]: [
    'challenge:view',
    'org:create',
    'org:view',
    'org:update',
    'org:verify_submit',
    'university:manage',
    'team:create',
    'team:manage',
    'proposal:create',
    'proposal:submit',
    'partnership:manage',
    'funding:manage',
    'project:manage',
    'prototype:create',
    'prototype:submit',
    'testing:create',
    'testing:execute',
    'pilot:create',
    'pilot:manage',
    'deployment:create',
    'deployment:execute',
    'outcome:submit',
    'innovation:create',
    'solution:view',
    'solution:create',
    'solution:edit',
    'solution:compare',
    'knowledge:search',
    'knowledge:analytics',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.FACULTY]: [
    'challenge:view',
    'evidence:upload',
    'org:view',
    'university:manage',
    'team:create',
    'team:manage',
    'proposal:create',
    'proposal:submit',
    'partnership:manage',
    'funding:manage',
    'project:manage',
    'prototype:create',
    'prototype:submit',
    'testing:create',
    'testing:execute',
    'pilot:create',
    'pilot:manage',
    'deployment:create',
    'deployment:execute',
    'outcome:submit',
    'innovation:create',
    'solution:view',
    'solution:create',
    'solution:edit',
    'solution:compare',
    'knowledge:search',
    'knowledge:analytics',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.STUDENT]: [
    'challenge:create',
    'challenge:view',
    'challenge:update',
    'challenge:submit',
    'evidence:upload',
    'org:view',
    'proposal:create',
    'prototype:create',
    'testing:create',
    'testing:execute',
    'pilot:manage',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.RESEARCH_ASSISTANT]: [
    'challenge:view',
    'evidence:upload',
    'org:view',
    'proposal:create',
    'prototype:create',
    'testing:create',
    'testing:execute',
    'pilot:manage',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.INDUSTRY_PARTNER]: [
    'challenge:view',
    'org:create',
    'org:view',
    'org:update',
    'org:verify_submit',
    'partnership:manage',
    'funding:manage',
    'testing:execute',
    'pilot:manage',
    'deployment:execute',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.STARTUP]: [
    'challenge:view',
    'org:create',
    'org:view',
    'org:update',
    'org:verify_submit',
    'partnership:manage',
    'funding:manage',
    'prototype:create',
    'testing:execute',
    'pilot:manage',
    'deployment:execute',
    'innovation:create',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.MSME]: [
    'challenge:view',
    'org:create',
    'org:view',
    'org:update',
    'org:verify_submit',
    'partnership:manage',
    'funding:manage',
    'testing:execute',
    'pilot:manage',
    'deployment:execute',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.CSR_ORGANIZATION]: [
    'challenge:view',
    'org:create',
    'org:view',
    'org:update',
    'org:verify_submit',
    'partnership:manage',
    'funding:manage',
    'pilot:manage',
    'deployment:execute',
    'solution:view',
    'solution:compare',
    'knowledge:search',
    'knowledge:assistant',
    'reports:export',
  ],
  [UserRole.SYSTEM_ADMIN]: [
    'challenge:create',
    'challenge:view',
    'challenge:update',
    'challenge:submit',
    'challenge:review',
    'challenge:request_info',
    'challenge:approve',
    'challenge:reject',
    'evidence:upload',
    'org:create',
    'org:view',
    'org:update',
    'org:verify_submit',
    'org:verify_review',
    'audit:view',
    'system:manage',
    'university:manage',
    'team:create',
    'team:manage',
    'proposal:create',
    'proposal:submit',
    'proposal:review',
    'partnership:manage',
    'funding:manage',
    'project:manage',
    'prototype:create',
    'prototype:submit',
    'prototype:review',
    'prototype:approve',
    'testing:create',
    'testing:execute',
    'testing:review',
    'pilot:create',
    'pilot:approve',
    'pilot:manage',
    'deployment:create',
    'deployment:approve',
    'deployment:execute',
    'outcome:submit',
    'outcome:review',
    'outcome:verify',
    'innovation:create',
    'innovation:verify',
    'citizen:feedback',
    'solution:view',
    'solution:create',
    'solution:edit',
    'solution:review',
    'solution:publish',
    'solution:compare',
    'knowledge:search',
    'knowledge:analytics',
    'knowledge:assistant',
    'knowledge:admin',
    'reports:export',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function getUserPermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
