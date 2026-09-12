import { PriorityEngine } from '../src/domain/intelligence/priority.engine';
import { PriorityLevel, SeverityLevel } from '@sicp/shared';

describe('PriorityEngine - Transparent Weighted Priority Scoring', () => {
  it('calculates low priority for low-severity, single-person civic issues', () => {
    const result = PriorityEngine.calculate({
      severity: SeverityLevel.LOW,
      urgency: PriorityLevel.LOW,
      affectedPopulation: 2,
      durationMonths: 1,
      communityVotesCount: 0,
      evidenceCount: 0,
    });

    expect(result.score).toBeLessThan(25);
    expect(result.priorityLevel).toBe(PriorityLevel.LOW);
    expect(result.explanation).toContain('Score');
  });

  it('calculates medium priority for moderate civic issues with regular community backing', () => {
    const result = PriorityEngine.calculate({
      severity: SeverityLevel.MODERATE,
      urgency: PriorityLevel.MEDIUM,
      affectedPopulation: 350,
      durationMonths: 4,
      communityVotesCount: 15,
      evidenceCount: 1,
    });

    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(75);
    expect(result.priorityLevel).toBe(PriorityLevel.MEDIUM);
  });

  it('calculates critical priority for catastrophic, high-urgency issues impacting thousands', () => {
    const result = PriorityEngine.calculate({
      severity: SeverityLevel.CATASTROPHIC,
      urgency: PriorityLevel.CRITICAL,
      affectedPopulation: 15000,
      durationMonths: 14,
      communityVotesCount: 120,
      evidenceCount: 4,
    });

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.priorityLevel).toBe(PriorityLevel.CRITICAL);
    expect(result.factorBreakdown.severityScore).toBe(100);
    expect(result.factorBreakdown.urgencyScore).toBe(100);
  });
});
