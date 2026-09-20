import {
  ChallengeStatus,
  ProjectStatus,
  SeverityLevel,
  PriorityLevel,
  PrototypeStatus,
  TestStatus,
  PilotStatus,
  DeploymentStatus,
  OutcomeVerificationStatus,
  SolutionMemoryStatus,
} from '@sicp/shared';

/**
 * Human-readable title mapping for ChallengeStatus
 */
export const CHALLENGE_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  AI_ANALYZED: 'AI Analyzed',
  UNDER_GOV_REVIEW: 'Awaiting Review',
  NEEDS_MORE_INFO: 'More Info Requested',
  PENDING_VALIDATION: 'Awaiting Review',
  PENDING_REVIEW: 'Awaiting Review',
  VALIDATED: 'Government Validated',
  APPROVED: 'Approved',
  REJECTED: 'Referral Actioned',
  ASSIGNED_TO_UNIVERSITY: 'Routed to University',
  ROUTED_TO_UNIVERSITY: 'Routed to University',
  UNIVERSITY_ACCEPTED: 'University Accepted',
  PROPOSAL_SUBMITTED: 'Proposal Under Review',
  PROPOSAL_APPROVED: 'Proposal Approved',
  TEAM_FORMED: 'Team Formed',
  IN_DEVELOPMENT: 'R&D in Progress',
  IN_RESEARCH: 'In Research',
  SOLUTION_PROPOSED: 'Solution Proposed',
  IN_PILOT: 'Pilot Active',
  PILOT_STAGE: 'Pilot Stage',
  DEPLOYED: 'Solution Deployed',
  VERIFIED_OUTCOME: 'Verified Outcome',
  RESOLVED: 'Civic Issue Resolved',
  MERGED_INTO_SYSTEMIC: 'Merged Systemic Cluster',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export function formatChallengeStatus(status: string): string {
  return CHALLENGE_STATUS_LABELS[status] || formatEnumToHuman(status);
}

/**
 * Human-readable title mapping for ProjectStatus
 */
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assigned to University',
  ACCEPTED: 'University Accepted',
  RESEARCH: 'Active Research',
  PROPOSAL: 'Proposal Stage',
  APPROVED: 'Proposal Approved',
  TEAM_FORMING: 'Forming Team',
  PROTOTYPE: 'Prototype Lab',
  TESTING: 'Test & Validation',
  PILOT: 'Pilot Active',
  DEPLOYMENT: 'Scaled Deployment',
  DEPLOYED: 'Scaled Deployment',
  COMPLETED: 'Completed & Verified',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
  FAILED: 'Terminated',
  ARCHIVED: 'Archived',
};

export function formatProjectStatus(status: string): string {
  return PROJECT_STATUS_LABELS[status] || formatEnumToHuman(status);
}

/**
 * Human-readable title mapping for SeverityLevel
 */
export const SEVERITY_LABELS: Record<string, string> = {
  [SeverityLevel.LOW]: 'Low Severity',
  [SeverityLevel.MODERATE]: 'Moderate Severity',
  [SeverityLevel.SEVERE]: 'Severe Issue',
  [SeverityLevel.CATASTROPHIC]: 'Catastrophic Emergency',
};

export function formatSeverity(severity: string): string {
  return SEVERITY_LABELS[severity] || formatEnumToHuman(severity);
}

/**
 * Human-readable title mapping for PriorityLevel
 */
export const PRIORITY_LABELS: Record<string, string> = {
  [PriorityLevel.LOW]: 'Low Priority',
  [PriorityLevel.MEDIUM]: 'Medium Priority',
  [PriorityLevel.HIGH]: 'High Priority',
  [PriorityLevel.CRITICAL]: 'Critical SLA Priority',
};

export function formatPriority(priority: string): string {
  return PRIORITY_LABELS[priority] || formatEnumToHuman(priority);
}

/**
 * Human-readable mapping for SLA escalation status
 */
export function formatSlaStatus(hoursRemaining: number, escalationStatus?: string): {
  label: string;
  badgeVariant: 'success' | 'warning' | 'destructive' | 'secondary';
  isUrgent: boolean;
} {
  if (escalationStatus === 'ESCALATED' || hoursRemaining <= 0) {
    return {
      label: hoursRemaining <= 0 ? 'SLA Breached' : 'Escalated SLA',
      badgeVariant: 'destructive',
      isUrgent: true,
    };
  }
  if (hoursRemaining <= 24) {
    return {
      label: `Critical (${Math.max(1, Math.round(hoursRemaining))}h left)`,
      badgeVariant: 'warning',
      isUrgent: true,
    };
  }
  if (hoursRemaining <= 48) {
    return {
      label: `Review Pending (${Math.round(hoursRemaining)}h)`,
      badgeVariant: 'secondary',
      isUrgent: false,
    };
  }
  return {
    label: 'SLA On Track',
    badgeVariant: 'success',
    isUrgent: false,
  };
}

/**
 * Generic Enum Formatter converting SCREAMING_SNAKE_CASE to Title Case
 */
export function formatEnumToHuman(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Indian Rupee Currency Formatter
 */
export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Relative or localized date formatter
 */
export function formatRelativeDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Recently';
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffHours = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoDate;
  }
}
