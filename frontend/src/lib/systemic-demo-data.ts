import { SystemicIncidentSummaryDto, SystemicIncidentDto } from '@sicp/shared';

// Isolated types; zero fake runtime demo fixtures.
export const DEMO_INCIDENT_SUMMARY: SystemicIncidentSummaryDto = null as any;
export const GAMHARIA_INCIDENT_SUMMARY: SystemicIncidentSummaryDto = null as any;
export const INITIAL_DEMO_INCIDENT: SystemicIncidentDto = null as any;
export const GAMHARIA_DEMO_INCIDENT: SystemicIncidentDto = null as any;

export function applyDemoSentinelNormal(current: SystemicIncidentDto): SystemicIncidentDto {
  return current;
}

export function applyGamhariaSentinelNormal(current: SystemicIncidentDto): SystemicIncidentDto {
  return current;
}
