import { ChallengeStatus, UserRole, TransitionRule } from '@sicp/shared';

/**
 * Strict Phase 1 Challenge Transition Rules.
 * DRAFT -> SUBMITTED -> UNDER_GOV_REVIEW -> NEEDS_MORE_INFO -> APPROVED
 * and UNDER_GOV_REVIEW -> REJECTED.
 * Any other transition is rejected.
 */
export const CHALLENGE_TRANSITIONS: readonly TransitionRule<ChallengeStatus>[] = [
  {
    from: ChallengeStatus.DRAFT,
    to: ChallengeStatus.SUBMITTED,
    allowedRoles: [
      UserRole.CITIZEN,
      UserRole.COMMUNITY_GROUP,
      UserRole.PRI,
      UserRole.ULB,
      UserRole.STUDENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Submit draft challenge for government review',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.SUBMITTED,
    to: ChallengeStatus.UNDER_GOV_REVIEW,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer begins formal review',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.SUBMITTED,
    to: ChallengeStatus.APPROVED,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer directly validates and approves challenge for academic routing',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.UNDER_GOV_REVIEW,
    to: ChallengeStatus.NEEDS_MORE_INFO,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer requests additional details or evidence from submitter',
    requiresReason: true,
  },
  {
    from: ChallengeStatus.NEEDS_MORE_INFO,
    to: ChallengeStatus.SUBMITTED,
    allowedRoles: [
      UserRole.CITIZEN,
      UserRole.COMMUNITY_GROUP,
      UserRole.PRI,
      UserRole.ULB,
      UserRole.STUDENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Submitter provides requested information and resubmits',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.UNDER_GOV_REVIEW,
    to: ChallengeStatus.APPROVED,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer approves challenge for university matching',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.UNDER_GOV_REVIEW,
    to: ChallengeStatus.REJECTED,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer rejects challenge',
    requiresReason: true,
  },
  {
    from: ChallengeStatus.APPROVED,
    to: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer routes approved challenge to university',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.UNDER_GOV_REVIEW,
    to: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officer directly routes challenge to university',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
    to: ChallengeStatus.IN_RESEARCH,
    allowedRoles: [
      UserRole.UNIVERSITY_ADMIN,
      UserRole.FACULTY,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'University accepts assignment and enters research/team formation phase',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
    to: ChallengeStatus.APPROVED,
    allowedRoles: [
      UserRole.UNIVERSITY_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'University declines assignment with mandatory reason, reverting challenge for re-routing',
    requiresReason: true,
  },
  {
    from: ChallengeStatus.IN_RESEARCH,
    to: ChallengeStatus.SOLUTION_PROPOSED,
    allowedRoles: [
      UserRole.FACULTY,
      UserRole.UNIVERSITY_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Faculty team submits solution proposal for government review',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.SOLUTION_PROPOSED,
    to: ChallengeStatus.IN_PILOT,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government approves solution proposal and activates project execution',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.SOLUTION_PROPOSED,
    to: ChallengeStatus.IN_RESEARCH,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government requests revisions on solution proposal',
    requiresReason: true,
  },
  {
    from: ChallengeStatus.IN_PILOT,
    to: ChallengeStatus.DEPLOYED,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.UNIVERSITY_ADMIN,
      UserRole.FACULTY,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Solution passes readiness gate and is deployed into the community',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.DEPLOYED,
    to: ChallengeStatus.RESOLVED,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Government officially verifies positive citizen outcome and marks challenge resolved',
    requiresReason: false,
  },
  {
    from: ChallengeStatus.DEPLOYED,
    to: ChallengeStatus.UNDER_GOV_REVIEW,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Deployment outcome requires re-evaluation or citizen reported recurring issues',
    requiresReason: true,
  },
  {
    from: ChallengeStatus.RESOLVED,
    to: ChallengeStatus.UNDER_GOV_REVIEW,
    allowedRoles: [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Recurrence detected on resolved challenge; reopening for official review',
    requiresReason: true,
  },
] as const;

export function findValidTransitionRule(
  from: ChallengeStatus,
  to: ChallengeStatus
): TransitionRule<ChallengeStatus> | undefined {
  return CHALLENGE_TRANSITIONS.find(t => t.from === from && t.to === to);
}
