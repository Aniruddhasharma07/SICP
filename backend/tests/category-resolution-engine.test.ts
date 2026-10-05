import { CategoryResolutionEngine } from '../src/domain/intelligence/category-resolution.engine';
import { SeverityLevel, PriorityLevel } from '@sicp/shared';

describe('CategoryResolutionEngine & Population-by-Problem-Type Engine', () => {
  test('Correctly identifies public washroom / sanitation issue and assigns footfall population extent', () => {
    const res = CategoryResolutionEngine.resolve(
      'Lack of Public washroom Facilities in my city',
      'The public toilet complex near Kosi bus stand is closed and in disrepair, forcing people into open defecation.'
    );

    expect(res.canonicalCategory).toBe('Sanitation & Drainage');
    expect(res.domainKey).toBe('SANITATION');
    expect(res.extentType).toBe('PUBLIC_FOOTFALL');
    expect(res.estimatedPopulation).toBeGreaterThanOrEqual(2500);
    expect(res.estimatedPopulation).toBeLessThanOrEqual(15000);
    expect(res.populationProvenance).toContain('sanitary facilities');
    expect(res.severity).toBe(SeverityLevel.SEVERE);
    expect(res.priority).toBe(PriorityLevel.CRITICAL);
  });

  test('Correctly identifies road problem and calculates population as daily commuters', () => {
    const res = CategoryResolutionEngine.resolve(
      'Dangerous pothole craters on Kosi-Mathura highway',
      'Large crater holes causing severe vehicle axle damage and traffic jams on the main arterial road.'
    );

    expect(res.canonicalCategory).toBe('Roads & Transport');
    expect(res.domainKey).toBe('ROAD_TRANSPORT');
    expect(res.extentType).toBe('ROAD_COMMUTERS');
    expect(res.estimatedPopulation).toBeGreaterThanOrEqual(4500);
    expect(res.estimatedPopulation).toBeLessThanOrEqual(25000);
    expect(res.populationProvenance).toContain('daily commuters');
  });

  test('Correctly identifies flood / inundation problem and calculates population as village residents', () => {
    const res = CategoryResolutionEngine.resolve(
      'Village waterlogging and monsoon flood inundation',
      'Heavy rains have caused village flood water to enter homes and submerge agrarian settlements.'
    );

    expect(res.canonicalCategory).toBe('Environment & Waste');
    expect(res.domainKey).toBe('FLOOD_ENVIRONMENT');
    expect(res.extentType).toBe('VILLAGE_FLOOD_EXPOSED');
    expect(res.estimatedPopulation).toBeGreaterThanOrEqual(650);
    expect(res.estimatedPopulation).toBeLessThanOrEqual(4200);
    expect(res.populationProvenance).toContain('village residents exposed to floodwater');
    expect(res.severity).toBe(SeverityLevel.SEVERE);
    expect(res.priority).toBe(PriorityLevel.HIGH);
  });

  test('Correctly identifies water scarcity problem and calculates population as locality residents', () => {
    const res = CategoryResolutionEngine.resolve(
      'Severe drinking water scarcity in locality',
      'Municipal tap water has stopped for 10 days, contaminated saline water in borewells.'
    );

    expect(res.canonicalCategory).toBe('Water Supply');
    expect(res.domainKey).toBe('WATER_SUPPLY');
    expect(res.extentType).toBe('LOCALITY_RESIDENTS');
    expect(res.estimatedPopulation).toBeGreaterThanOrEqual(1200);
    expect(res.estimatedPopulation).toBeLessThanOrEqual(12000);
    expect(res.populationProvenance).toContain('neighborhood households');
  });

  test('Preserves citizen-provided population if already explicitly specified', () => {
    const res = CategoryResolutionEngine.resolve(
      'Potholes on road',
      'Damaged road surface.',
      'Roads & Transport',
      55000 // citizen provided
    );

    expect(res.estimatedPopulation).toBe(55000);
    expect(res.populationStatus).toBe('CITIZEN_PROVIDED');
  });

  test('Does not blindly trust incorrect category from user if keywords strongly contradict it', () => {
    // Citizen chose "Roads & Transport" from dropdown by accident, but entered a toilet problem
    const res = CategoryResolutionEngine.resolve(
      'Lack of Public washroom Facilities in my locality',
      'Urinals and washrooms broken with foul smell.',
      'Roads & Transport'
    );

    expect(res.canonicalCategory).toBe('Sanitation & Drainage');
    expect(res.extentType).toBe('PUBLIC_FOOTFALL');
  });
});
