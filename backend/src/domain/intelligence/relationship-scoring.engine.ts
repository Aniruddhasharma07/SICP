import { RelationshipType, RelationshipFactorBreakdown, SeverityLevel } from '@sicp/shared';
import { SpatialPolicyEngine } from './spatial-policy.engine';

export interface ChallengeScoringEntity {
  id: string;
  title: string;
  description: string;
  category: string;
  severity?: SeverityLevel | string | null;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  state?: string | null;
  createdAt?: Date | string | null;
  rootCause?: string | null;
  durationMonths?: number | null;
  evidenceCount?: number;
}

export interface RelationshipScoringResult {
  relationType: RelationshipType;
  confidenceScore: number; // 0.0 to 1.0
  factorBreakdown: RelationshipFactorBreakdown;
  distanceMeters: number | null;
  sharedInfrastructure: string | null;
  reasoning: string;
  recommendedAction: 'MERGE_CANDIDATE' | 'LINK_SYSTEMIC' | 'FLAG_RECURRING' | 'KEEP_SEPARATE' | 'EXPERT_REVIEW_REQUIRED';
  requiresHumanReview: boolean;
}

export class RelationshipScoringEngine {
  private static readonly STOP_WORDS = new Set([
    'the', 'is', 'at', 'which', 'on', 'in', 'a', 'an', 'and', 'or', 'for', 'of',
    'to', 'from', 'with', 'by', 'this', 'that', 'there', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but',
    'if', 'into', 'our', 'their', 'we', 'they', 'it', 'its', 'near', 'area'
  ]);

  private static readonly RELATED_CATEGORY_GROUPS: Array<Set<string>> = [
    new Set(['WATER', 'WATER_SUPPLY', 'DRAINAGE', 'DRAINAGE_BLOCKAGE', 'SANITATION', 'SEWAGE']),
    new Set(['ROADS', 'ROAD_POTHOLE', 'TRANSPORT', 'TRAFFIC', 'STREETLIGHT', 'LIGHTING']),
    new Set(['ROADS', 'ROAD_POTHOLE', 'TRANSPORT', 'DRAINAGE', 'DRAINAGE_BLOCKAGE', 'SANITATION', 'FLOOD_ENVIRONMENTAL', 'ROADS_TRANSPORT']),
    new Set(['AGRICULTURE', 'IRRIGATION', 'WATER', 'WATER_SUPPLY', 'ENVIRONMENT']),
    new Set(['ELECTRICITY', 'ELECTRICITY_NETWORK', 'POWER', 'LIGHTING', 'ENERGY']),
    new Set(['ENVIRONMENT', 'FLOOD_ENVIRONMENTAL', 'DISASTER', 'POLLUTION', 'WASTE_MANAGEMENT']),
    new Set(['HEALTH', 'SANITATION', 'SEWAGE', 'POLLUTION', 'HOSPITAL']),
  ];

  /**
   * Tokenize text into n-grams (unigrams + bigrams)
   */
  public static extractTokens(text: string): { unigrams: Set<string>; bigrams: Set<string> } {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !this.STOP_WORDS.has(w));

    const unigrams = new Set(words);
    const bigrams = new Set<string>();

    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]}_${words[i + 1]}`);
    }

    return { unigrams, bigrams };
  }

  /**
   * Jaccard similarity across unigrams and bigrams
   */
  public static calculateTokenSimilarity(text1: string, text2: string): number {
    const tokens1 = this.extractTokens(text1);
    const tokens2 = this.extractTokens(text2);

    const calcJaccard = (setA: Set<string>, setB: Set<string>): number => {
      if (setA.size === 0 || setB.size === 0) return 0;
      let intersection = 0;
      for (const item of setA) {
        if (setB.has(item)) intersection++;
      }
      const union = new Set([...setA, ...setB]).size;
      return union === 0 ? 0 : intersection / union;
    };

    const unigramScore = calcJaccard(tokens1.unigrams, tokens2.unigrams);
    const bigramScore = calcJaccard(tokens1.bigrams, tokens2.bigrams);

    return Math.round((unigramScore * 0.6 + bigramScore * 0.4) * 100);
  }

  /**
   * Infrastructure entity detection (regex patterns and keywords)
   */
  public static detectInfrastructure(text: string): string[] {
    const matches: string[] = [];
    const patterns = [
      /\b(?:nh|sh|state highway|national highway|ring road)[\s-]*\d+[a-z]?\b/gi,
      /\b(?:ward|sector|block|phase)[\s-]*\d+[a-z]?\b/gi,
      /\b(?:substation|feeder|transformer|pipeline|canal|bridge|culvert|pump house|treatment plant|water tank|drain|sewer)[\s-]+[a-z0-9]+\b/gi,
      /\b[a-z0-9]+(?:\s+(?:pipeline|substation|feeder|canal|bridge|culvert|pump house|treatment plant|transformer|water tank|drain|sewer))\b/gi,
    ];

    for (const pat of patterns) {
      const found = text.match(pat);
      if (found) {
        for (const item of found) {
          matches.push(item.trim().toLowerCase());
        }
      }
    }

    return Array.from(new Set(matches));
  }

  /**
   * Evaluate the complete 7-factor explainable relationship scoring
   */
  public static evaluate(
    subject: ChallengeScoringEntity,
    target: ChallengeScoringEntity
  ): RelationshipScoringResult {
    // 1. Problem Semantic Similarity (Title 50%, Description 50%)
    const titleSim = this.calculateTokenSimilarity(subject.title, target.title);
    const descSim = this.calculateTokenSimilarity(subject.description, target.description);
    const problemSimilarity = Math.min(100, Math.round(titleSim * 0.55 + descSim * 0.45));

    // 2. Geographic Proximity via SpatialPolicyEngine
    const distanceMeters = SpatialPolicyEngine.calculateDistanceMeters(
      subject.latitude,
      subject.longitude,
      target.latitude,
      target.longitude
    );

    const hasSubjectLocation = Boolean(
      (subject.latitude != null && subject.longitude != null) ||
      (subject.district && subject.district.trim().length > 0) ||
      (subject.state && subject.state.trim().length > 0)
    );
    const hasTargetLocation = Boolean(
      (target.latitude != null && target.longitude != null) ||
      (target.district && target.district.trim().length > 0) ||
      (target.state && target.state.trim().length > 0)
    );
    const hasBothLocations = hasSubjectLocation && hasTargetLocation;

    const isSameState = hasBothLocations && !!subject.state && !!target.state && subject.state.trim().toLowerCase() === target.state.trim().toLowerCase();
    const isSameDistrict = isSameState && !!subject.district && !!target.district && subject.district.trim().toLowerCase() === target.district.trim().toLowerCase();
    const isDifferentState = hasBothLocations && !!subject.state && !!target.state && subject.state.trim().toLowerCase() !== target.state.trim().toLowerCase();
    const isDifferentDistrict = hasBothLocations && (
      isDifferentState ||
      (!!subject.district && !!target.district && subject.district.trim().toLowerCase() !== target.district.trim().toLowerCase())
    );

    let locationSimilarity = 0;
    if (!hasBothLocations) {
      locationSimilarity = 0;
    } else if (distanceMeters !== null) {
      const proximityResult = SpatialPolicyEngine.evaluateProximityScore(
        subject.category,
        distanceMeters
      );
      locationSimilarity = proximityResult.score;

      // Distance penalty if explicitly cross-district or cross-state without policy permission
      if (isDifferentDistrict && !proximityResult.policyUsed.allowCrossDistrictSystemic) {
        locationSimilarity = Math.min(locationSimilarity, 15);
      }
    } else {
      // Missing coordinates: fallback to administrative boundaries
      if (isSameDistrict) {
        locationSimilarity = 60;
      } else if (isSameState && !isDifferentDistrict) {
        locationSimilarity = 30;
      } else if (isDifferentState) {
        locationSimilarity = 0;
      } else {
        locationSimilarity = 10;
      }
    }

    // 3. Category & Domain Compatibility
    let categoryCompatibility = 15;
    const normSubCat = subject.category.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const normTgtCat = target.category.trim().toUpperCase().replace(/[\s-]+/g, '_');

    if (normSubCat === normTgtCat) {
      categoryCompatibility = 100;
    } else {
      for (const group of this.RELATED_CATEGORY_GROUPS) {
        if (
          Array.from(group).some(g => normSubCat.includes(g) || g.includes(normSubCat)) &&
          Array.from(group).some(g => normTgtCat.includes(g) || g.includes(normTgtCat))
        ) {
          categoryCompatibility = 70;
          break;
        }
      }
    }

    // 4. Infrastructure & Named Entity Overlap
    const subEntities = this.detectInfrastructure(`${subject.title} ${subject.description}`);
    const tgtEntities = this.detectInfrastructure(`${target.title} ${target.description}`);
    
    let sharedInfrastructure: string | null = null;
    let infrastructureOverlap = 10;

    const commonEntities = subEntities.filter(e => tgtEntities.includes(e));
    if (commonEntities.length > 0) {
      sharedInfrastructure = commonEntities.join(', ');
      infrastructureOverlap = 100;
    } else if (subEntities.length > 0 && tgtEntities.length > 0) {
      // Check partial token overlap between entities
      const subTokens = subEntities.flatMap(e => e.split(/\s+/));
      const tgtTokens = tgtEntities.flatMap(e => e.split(/\s+/));
      const commonTokens = subTokens.filter(t => t.length > 3 && tgtTokens.includes(t));
      if (commonTokens.length > 0) {
        sharedInfrastructure = commonTokens[0];
        infrastructureOverlap = 65;
      }
    }

    // 5. Root-Cause Alignment
    let rootCauseSimilarity = 20;
    const subRoot = subject.rootCause || '';
    const tgtRoot = target.rootCause || '';

    if (subRoot && tgtRoot) {
      rootCauseSimilarity = this.calculateTokenSimilarity(subRoot, tgtRoot);
    } else {
      // Check causal keywords and semantic cause clusters within descriptions and titles
      const subFull = `${subject.title} ${subject.description}`.toLowerCase();
      const tgtFull = `${target.title} ${target.description}`.toLowerCase();

      const causeClusters = [
        ['broken', 'damaged', 'burst', 'rupture', 'leak', 'leaking', 'crack', 'cracked', 'collapsed', 'fracture', 'pothole', 'unpaved', 'failed', 'faulty', 'blast', 'explode', 'exploded', 'explosion', 'fire', 'burnt', 'spark', 'short circuit', 'power cut', 'power failure', 'blackout', 'outage', 'tripping'],
        ['clogged', 'choked', 'overflow', 'dumping', 'waste', 'blockage', 'debris'],
        ['drainage', 'waterlog', 'waterlogging', 'stormwater', 'runoff', 'monsoon', 'inundation', 'pooling', 'culvert', 'catchment'],
        ['contaminated', 'dirty', 'yellow', 'smelly', 'odor', 'bacterial', 'toxic', 'sewage', 'pollution'],
        ['dry', 'shortage', 'low pressure', 'scarcity', 'depletion', 'borewell', 'groundwater', 'aquifer'],
      ];

      const subClusterIdxs = causeClusters.map((cluster, i) => cluster.some(w => subFull.includes(w)) ? i : -1).filter(i => i !== -1);
      const tgtClusterIdxs = causeClusters.map((cluster, i) => cluster.some(w => tgtFull.includes(w)) ? i : -1).filter(i => i !== -1);

      const commonClusters = subClusterIdxs.filter(i => tgtClusterIdxs.includes(i));
      if (commonClusters.length > 0) {
        rootCauseSimilarity = 75;
      } else if (subClusterIdxs.length > 0 && tgtClusterIdxs.length > 0) {
        // Conflicting causal clusters (e.g. physical pipe rupture vs groundwater depletion/contamination)
        rootCauseSimilarity = 15;
      } else {
        rootCauseSimilarity = Math.max(35, Math.round(problemSimilarity * 0.5));
      }
    }

    // 6. Evidence & Severity Consistency
    let evidenceConsistency = 50;
    const subSev = (subject.severity || 'MODERATE').toString().toUpperCase();
    const tgtSev = (target.severity || 'MODERATE').toString().toUpperCase();
    let sevScore = 80;
    if (subSev === tgtSev) sevScore = 100;
    else if ((subSev === 'SEVERE' && tgtSev === 'CATASTROPHIC') || (subSev === 'MODERATE' && tgtSev === 'SEVERE')) sevScore = 75;
    else sevScore = 40;

    const subEvCount = subject.evidenceCount || 0;
    const tgtEvCount = target.evidenceCount || 0;
    let evScore = 50;
    if (subEvCount > 0 && tgtEvCount > 0) evScore = 90;
    else if (subEvCount > 0 || tgtEvCount > 0) evScore = 65;

    evidenceConsistency = Math.round(sevScore * 0.6 + evScore * 0.4);

    // 7. Temporal Relationship
    let temporalDays = 0;
    if (subject.createdAt && target.createdAt) {
      const d1 = new Date(subject.createdAt).getTime();
      const d2 = new Date(target.createdAt).getTime();
      temporalDays = Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
    }

    let temporalRelationship = 25;
    if (temporalDays <= 7) temporalRelationship = 100;
    else if (temporalDays <= 30) temporalRelationship = 85;
    else if (temporalDays <= 90) temporalRelationship = 65;
    else if (temporalDays <= 180) temporalRelationship = 45;
    else temporalRelationship = 20;

    const factorBreakdown: RelationshipFactorBreakdown = {
      problemSimilarity,
      locationSimilarity,
      categoryCompatibility,
      infrastructureOverlap,
      rootCauseSimilarity,
      evidenceConsistency,
      temporalRelationship,
    };

    // Calculate Primary Classification & Weighted Confidence
    let relationType: RelationshipType = RelationshipType.INDEPENDENT;
    let confidenceScore = 0.0;
    let recommendedAction: RelationshipScoringResult['recommendedAction'] = 'KEEP_SEPARATE';
    let reasoning = '';
    let requiresHumanReview = true;

    const spatialPolicy = SpatialPolicyEngine.getPolicy(subject.category);

    // RULE 0: Missing Location Context
    // If either challenge lacks location, DUPLICATE and RECURRING are strictly DISALLOWED
    if (!hasBothLocations) {
      if (categoryCompatibility >= 70 && problemSimilarity >= 30) {
        relationType = RelationshipType.RELATED;
        confidenceScore = Math.round(0.55 * problemSimilarity + 0.45 * categoryCompatibility) / 100;
        recommendedAction = 'KEEP_SEPARATE';
        reasoning = 'Thematic category overlap without verified location context. Retained as separate reports; location is required to evaluate duplicates.';
        requiresHumanReview = false;
      } else {
        relationType = RelationshipType.INDEPENDENT;
        confidenceScore = Math.max(0.05, Math.round((100 - problemSimilarity) * 0.5) / 100);
        recommendedAction = 'KEEP_SEPARATE';
        reasoning = 'No location provided and distinct or broad descriptions. Kept as independent reports.';
        requiresHumanReview = false;
      }
    }
    // RULE 1: Level 6 - Different States (NEVER duplicate, NEVER local merge)
    else if (isDifferentState) {
      if (sharedInfrastructure !== null && spatialPolicy.allowCrossDistrictSystemic) {
        relationType = RelationshipType.SYSTEMIC_ROOT_CAUSE;
        confidenceScore = Math.round(0.35 * rootCauseSimilarity + 0.35 * infrastructureOverlap + 0.30 * categoryCompatibility) / 100;
        recommendedAction = 'LINK_SYSTEMIC';
        reasoning = `Interstate relationship on shared regional infrastructure asset "${sharedInfrastructure}". Maintained as distinct reports under interstate systemic grouping.`;
        requiresHumanReview = true;
      } else if (categoryCompatibility >= 70 && problemSimilarity >= 30) {
        relationType = RelationshipType.RELATED;
        confidenceScore = Math.round(0.60 * problemSimilarity + 0.40 * categoryCompatibility) / 100;
        recommendedAction = 'KEEP_SEPARATE';
        reasoning = 'Different states. Maintained as independent reports; potential national or high-level policy correlation only.';
        requiresHumanReview = false;
      } else {
        relationType = RelationshipType.INDEPENDENT;
        confidenceScore = Math.max(0.05, Math.round((100 - problemSimilarity) * 0.5) / 100);
        recommendedAction = 'KEEP_SEPARATE';
        reasoning = 'Different states with distinct civic domains. Confirmed as independent reports.';
        requiresHumanReview = false;
      }
    }
    // RULE 2: Level 5 - Different Districts in Same State (NEVER duplicate)
    else if (isDifferentDistrict) {
      // Cross-district systemic only if policy allows AND shared infrastructure or high root cause similarity
      if (spatialPolicy.allowCrossDistrictSystemic && (sharedInfrastructure !== null || rootCauseSimilarity >= 65)) {
        relationType = RelationshipType.SYSTEMIC_ROOT_CAUSE;
        confidenceScore = Math.round(0.35 * rootCauseSimilarity + 0.30 * infrastructureOverlap + 0.20 * categoryCompatibility + 0.15 * locationSimilarity) / 100;
        recommendedAction = 'LINK_SYSTEMIC';
        const infraText = sharedInfrastructure ? ` on shared asset "${sharedInfrastructure}"` : '';
        reasoning = `Cross-district shared infrastructure defect detected in ${subject.state || 'region'}${infraText}. Grouped as systemic regional candidate; individual reports preserved.`;
        requiresHumanReview = true;
      } else if (categoryCompatibility >= 70 && problemSimilarity >= 30) {
        relationType = RelationshipType.RELATED;
        confidenceScore = Math.round(0.55 * problemSimilarity + 0.35 * categoryCompatibility + 0.10 * locationSimilarity) / 100;
        recommendedAction = 'KEEP_SEPARATE';
        reasoning = `Different districts within ${subject.state || 'the state'}. Retained as independent reports with shared domain interest.`;
        requiresHumanReview = false;
      } else {
        relationType = RelationshipType.INDEPENDENT;
        confidenceScore = Math.max(0.05, Math.round((100 - problemSimilarity) * 0.5) / 100);
        recommendedAction = 'KEEP_SEPARATE';
        reasoning = 'Different districts with distinct problem characteristics. Confirmed as independent reports.';
        requiresHumanReview = false;
      }
    }
    // RULE 3: Level 1-4 (Same District / Local Vicinity)
    // Check for RECURRING (chronic gap in time, same location/infrastructure)
    else if (
      temporalDays >= 60 &&
      locationSimilarity >= 70 &&
      (problemSimilarity >= 55 || infrastructureOverlap >= 65)
    ) {
      relationType = RelationshipType.RECURRING;
      confidenceScore = Math.round(
        (0.35 * locationSimilarity +
         0.25 * problemSimilarity +
         0.20 * infrastructureOverlap +
         0.20 * rootCauseSimilarity)
      ) / 100;
      recommendedAction = 'FLAG_RECURRING';
      reasoning = `Temporal recurrence detected (${temporalDays} days apart). Incident occurs at the same asset/location, indicating chronic recurring failure.`;
      requiresHumanReview = true;
    }
    // Check for DUPLICATE (close proximity, high semantic similarity, same category, recent, NOT divergent root cause)
    else if (
      locationSimilarity >= 65 &&
      categoryCompatibility >= 70 &&
      (problemSimilarity >= 60 || (locationSimilarity >= 90 && problemSimilarity >= 45)) &&
      rootCauseSimilarity >= 25 // Enforce that root causes do not sharply conflict
    ) {
      relationType = RelationshipType.DUPLICATE;
      confidenceScore = Math.round(
        (0.35 * problemSimilarity +
         0.35 * locationSimilarity +
         0.15 * categoryCompatibility +
         0.10 * infrastructureOverlap +
         0.05 * temporalRelationship)
      ) / 100;
      recommendedAction = confidenceScore >= 0.85 ? 'MERGE_CANDIDATE' : 'EXPERT_REVIEW_REQUIRED';
      const distStr = distanceMeters !== null ? `${distanceMeters}m away` : 'in same immediate locality';
      reasoning = `High geographic proximity (${distStr}) with ${problemSimilarity}% problem semantic similarity and identical category. Strong duplicate candidate.`;
      requiresHumanReview = confidenceScore < 0.90;
    }
    // Same immediate area & category, but divergent root causes / symptoms -> classify as RELATED
    else if (
      locationSimilarity >= 65 &&
      categoryCompatibility >= 70 &&
      rootCauseSimilarity < 25
    ) {
      relationType = RelationshipType.RELATED;
      confidenceScore = Math.round(
        (0.40 * locationSimilarity +
         0.35 * categoryCompatibility +
         0.25 * problemSimilarity)
      ) / 100;
      recommendedAction = 'KEEP_SEPARATE';
      const distStr = distanceMeters !== null ? `${distanceMeters}m away` : 'in same immediate locality';
      reasoning = `Located in the same immediate area (${distStr}) and domain, but reports describe different symptoms or divergent root causes. Maintained as separate related challenges.`;
      requiresHumanReview = false;
    }
    // Check for SYSTEMIC_ROOT_CAUSE (shared infrastructure, common upstream root cause, shared network)
    // Supports cross-category systemic relationships (e.g. road damage + drain overflow sharing drainage root cause)
    else if (
      (rootCauseSimilarity >= 60 && locationSimilarity >= 60) ||
      ((rootCauseSimilarity >= 60 || infrastructureOverlap >= 60) &&
        categoryCompatibility >= 70 &&
        (locationSimilarity >= 25 || sharedInfrastructure !== null))
    ) {
      relationType = RelationshipType.SYSTEMIC_ROOT_CAUSE;
      confidenceScore = Math.round(
        (0.35 * rootCauseSimilarity +
         0.25 * infrastructureOverlap +
         0.15 * locationSimilarity +
         0.15 * categoryCompatibility +
         0.10 * evidenceConsistency)
      ) / 100;
      recommendedAction = 'LINK_SYSTEMIC';
      const infraDetail = sharedInfrastructure ? ` on shared asset "${sharedInfrastructure}"` : '';
      reasoning = `Shared root-cause indicators (${rootCauseSimilarity}% root cause alignment)${infraDetail}. Suggests systemic upstream infrastructure defect rather than isolated incident.`;
      requiresHumanReview = true;
    }
    // Check for RELATED (thematic overlap)
    else if (
      categoryCompatibility >= 70 &&
      problemSimilarity >= 30 &&
      // Localized physical assets (e.g. streetlight, pothole) beyond their maximum boundary radius are independent assets, not related
      (spatialPolicy.allowCrossDistrictSystemic || locationSimilarity > 0 || distanceMeters === null)
    ) {
      relationType = RelationshipType.RELATED;
      confidenceScore = Math.round(
        (0.50 * problemSimilarity +
         0.30 * categoryCompatibility +
         0.20 * locationSimilarity)
      ) / 100;
      recommendedAction = 'KEEP_SEPARATE';
      reasoning = `Thematic category overlap (${categoryCompatibility}%) and moderate conceptual similarity (${problemSimilarity}%). Retained as separate actionable items.`;
      requiresHumanReview = false;
    }
    // INDEPENDENT
    else {
      relationType = RelationshipType.INDEPENDENT;
      confidenceScore = Math.max(0.05, Math.round((100 - problemSimilarity) * 0.5) / 100);
      recommendedAction = 'KEEP_SEPARATE';
      reasoning = 'Disjoint geographic and semantic characteristics. Confirmed as independent problems.';
      requiresHumanReview = false;
    }

    // Clamp confidenceScore between 0.01 and 0.99
    confidenceScore = Math.min(0.99, Math.max(0.01, confidenceScore));

    return {
      relationType,
      confidenceScore,
      factorBreakdown,
      distanceMeters,
      sharedInfrastructure,
      reasoning,
      recommendedAction,
      requiresHumanReview,
    };
  }
}
