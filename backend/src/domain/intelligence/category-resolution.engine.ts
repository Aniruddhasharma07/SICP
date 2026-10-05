import { PriorityLevel, SeverityLevel } from '@sicp/shared';
import { AiServiceClient } from './ai-service.client';
import { logger } from '../../utils/logger';

export interface ResolvedCategoryAndExtent {
  canonicalCategory: string; // e.g. 'Sanitation & Drainage', 'Roads & Transport', 'Water Supply'
  domainKey: 'SANITATION' | 'WATER_SUPPLY' | 'ROAD_TRANSPORT' | 'FLOOD_ENVIRONMENT' | 'ELECTRICITY' | 'HEALTHCARE' | 'EDUCATION' | 'AGRICULTURE' | 'GENERIC';
  extentType: 'ROAD_COMMUTERS' | 'VILLAGE_FLOOD_EXPOSED' | 'LOCALITY_RESIDENTS' | 'PUBLIC_FOOTFALL' | 'GENERAL_CIVIC';
  estimatedPopulation: number;
  populationStatus: 'ESTIMATED_BENCHMARK' | 'CITIZEN_PROVIDED' | 'LOCALITY_EXTENT';
  populationProvenance: string;
  severity: SeverityLevel;
  priority: PriorityLevel;
}

export interface AiResolvedCategoryAndExtent {
  canonicalCategory: string;
  domainKey: ResolvedCategoryAndExtent['domainKey'];
  extentType: ResolvedCategoryAndExtent['extentType'];
  estimatedPopulation: number | null;
  populationStatus: 'KNOWN' | 'UNKNOWN';
  populationProvenance: string;
  severity: SeverityLevel;
  priority: PriorityLevel;
  confidenceScore: number;
  normalizedStatement?: string;
  reasoningSummary?: string;
  rootCauses?: Array<{ hypothesis: string; confidence: number; systemicIndicator?: boolean }>;
  isAiResolved: boolean;
}

export class CategoryResolutionEngine {
  private static readonly DOMAIN_PATTERNS: Array<{
    domainKey: ResolvedCategoryAndExtent['domainKey'];
    canonicalCategory: string;
    extentType: ResolvedCategoryAndExtent['extentType'];
    keywords: string[];
    strongIndicators: RegExp[];
  }> = [
    {
      domainKey: 'SANITATION',
      canonicalCategory: 'Sanitation & Drainage',
      extentType: 'PUBLIC_FOOTFALL',
      keywords: [
        'washroom', 'toilet', 'urinal', 'restroom', 'latrine', 'sulabh', 'sanitation',
        'sewer', 'sewage', 'drainage', 'drain', 'nallah', 'gutter', 'manhole', 'septic',
        'public bath', 'defecation', 'waste water', 'foul smell'
      ],
      strongIndicators: [
        /\b(?:public\s+)?(?:washroom|toilet|urinal|latrine|restroom)s?\b/i,
        /\b(?:sewer|drainage|sewage|open\s+defecation)\b/i,
      ],
    },
    {
      domainKey: 'WATER_SUPPLY',
      canonicalCategory: 'Water Supply',
      extentType: 'LOCALITY_RESIDENTS',
      keywords: [
        'drinking water', 'water supply', 'pipeline', 'pipe leak', 'pipe burst', 'tap water',
        'borewell', 'handpump', 'water tanker', 'water scarcity', 'saline water', 'fluoride',
        'arsenic', 'water pressure', 'potable water', 'water shortage'
      ],
      strongIndicators: [
        /\b(?:drinking\s+)?water\s+(?:supply|shortage|scarcity|pipeline|leak|tanker)\b/i,
        /\b(?:borewell|handpump|tap\s+water)\b/i,
      ],
    },
    {
      domainKey: 'FLOOD_ENVIRONMENT',
      canonicalCategory: 'Environment & Waste',
      extentType: 'VILLAGE_FLOOD_EXPOSED',
      keywords: [
        'flood', 'inundation', 'waterlogging', 'water logging', 'submerged', 'overflow',
        'river overflow', 'rain water', 'monsoon flood', 'dam overflow', 'lake overflow'
      ],
      strongIndicators: [
        /\b(?:flood|inundat|waterlogg|submerg)\w*\b/i,
        /\bwater\s+logged\b/i,
      ],
    },
    {
      domainKey: 'ROAD_TRANSPORT',
      canonicalCategory: 'Roads & Transport',
      extentType: 'ROAD_COMMUTERS',
      keywords: [
        'pothole', 'crater', 'asphalt', 'bitumen', 'road', 'street', 'highway',
        'expressway', 'flyover', 'bridge', 'culvert', 'traffic', 'pavement',
        'footpath', 'divider', 'speed breaker', 'bus stop', 'transit', 'commute'
      ],
      strongIndicators: [
        /\b(?:pothole|road\s+damage|asphalt|highway|flyover|bridge|traffic\s+jam)\b/i,
      ],
    },
    {
      domainKey: 'ELECTRICITY',
      canonicalCategory: 'Electricity & Lighting',
      extentType: 'LOCALITY_RESIDENTS',
      keywords: [
        'streetlight', 'street light', 'power cut', 'blackout', 'load shedding',
        'transformer', 'voltage', 'hanging wire', 'electric pole', 'power outage'
      ],
      strongIndicators: [
        /\b(?:street\s*light|power\s+cut|transformer|blackout|electric\s+pole)\b/i,
      ],
    },
    {
      domainKey: 'HEALTHCARE',
      canonicalCategory: 'Healthcare & Public Health',
      extentType: 'LOCALITY_RESIDENTS',
      keywords: [
        'healthcare', 'health care', 'health facility', 'healthcare facility', 'hospital', 'clinic',
        'health centre', 'health center', 'phc', 'chc', 'doctor', 'medicine', 'dispensary', 'medical',
        'dengue', 'malaria', 'epidemic', 'ambulance', 'vaccine', 'public health'
      ],
      strongIndicators: [
        /\b(?:healthcare|health\s+care|health\s+cent(?:re|er)|healthcare\s+facility|hospital|clinic|phc|chc|dispensary|doctor|medical|dengue|malaria|public\s+health)\b/i,
      ],
    },
    {
      domainKey: 'EDUCATION',
      canonicalCategory: 'Education & Schools',
      extentType: 'LOCALITY_RESIDENTS',
      keywords: [
        'education', 'educational', 'school', 'schools', 'classroom', 'college',
        'teacher', 'teachers', 'student', 'students', 'university', 'coaching',
        'tuition', 'learning', 'anganwadi', 'study', 'teaching', 'blackboard'
      ],
      strongIndicators: [
        /\b(?:education|educational|school|schools|classroom|college|students?|teachers?|university|coaching|anganwadi)\b/i,
      ],
    },
    {
      domainKey: 'AGRICULTURE',
      canonicalCategory: 'Agriculture & Irrigation',
      extentType: 'VILLAGE_FLOOD_EXPOSED',
      keywords: [
        'crop', 'farm', 'farmer', 'irrigation', 'canal', 'fertilizer', 'seed', 'harvest'
      ],
      strongIndicators: [
        /\b(?:crop|farmer|irrigation|canal)\b/i,
      ],
    },
  ];

  /**
   * Resolves category and analyzes extent from title, description, and raw category.
   */
  public static resolve(
    title: string,
    description: string,
    rawCategory?: string | null,
    providedPopulation?: number | null
  ): ResolvedCategoryAndExtent {
    const fullText = `${title || ''} ${description || ''}`.toLowerCase();

    // 1. Check strong regex matches
    let matchedPattern = this.DOMAIN_PATTERNS.find(p =>
      p.strongIndicators.some(regex => regex.test(fullText))
    );

    // 2. Keyword density count if no strong regex match
    if (!matchedPattern) {
      let maxHits = 0;
      for (const pattern of this.DOMAIN_PATTERNS) {
        let hits = 0;
        for (const kw of pattern.keywords) {
          if (fullText.includes(kw)) hits++;
        }
        if (hits > maxHits) {
          maxHits = hits;
          matchedPattern = pattern;
        }
      }
    }

    // 3. Fallback to rawCategory if keyword count was 0
    if (!matchedPattern && rawCategory) {
      const rawUpper = rawCategory.toUpperCase();
      matchedPattern = this.DOMAIN_PATTERNS.find(p =>
        p.canonicalCategory.toUpperCase().includes(rawUpper) ||
        p.domainKey === rawUpper
      );
    }

    // Default fallback: Sanitation if keywords include washroom/toilet, otherwise Roads or General
    const finalPattern = matchedPattern || {
      domainKey: 'GENERIC' as const,
      canonicalCategory: rawCategory || 'General Civic Issue',
      extentType: 'LOCALITY_RESIDENTS' as const,
      keywords: [],
      strongIndicators: [],
    };

    // 4. Extent analysis for population based on problem type
    let population = providedPopulation && providedPopulation > 0 ? providedPopulation : 0;
    let populationStatus: ResolvedCategoryAndExtent['populationStatus'] = 'ESTIMATED_BENCHMARK';
    let populationProvenance = '';

    if (population > 0) {
      populationStatus = 'CITIZEN_PROVIDED';
      populationProvenance = 'Citizen Provided Affected Count';
    } else {
      // Analyze textual extent scale:
      const isCityScale = /\b(?:city|municipal|town|district|all\s+residents)\b/i.test(fullText);
      const isVillageScale = /\b(?:village|gram|panchayat|rural|basti)\b/i.test(fullText);
      const isLocalityScale = /\b(?:locality|colony|ward|sector|mohalla|neighborhood|street)\b/i.test(fullText);

      switch (finalPattern.extentType) {
        case 'ROAD_COMMUTERS':
          // Number of people traveling by road (commuters)
          population = isCityScale ? 22000 : isLocalityScale ? 4500 : 8500;
          populationProvenance = `Corridor Mobility Model: daily commuters traveling road segment (${isCityScale ? 'Arterial' : 'Collector'} road)`;
          break;

        case 'VILLAGE_FLOOD_EXPOSED':
          // Number of people in village / exposed in inundation perimeter
          population = isVillageScale ? 950 : isCityScale ? 4200 : 650;
          populationProvenance = `Inundation Exposure Model: village residents exposed to floodwater`;
          break;

        case 'LOCALITY_RESIDENTS':
          // Number of people living in locality deprived of service (water, power)
          population = isCityScale ? 12000 : isVillageScale ? 1200 : 3200;
          populationProvenance = `Locality Census Model: neighborhood households deprived of essential service`;
          break;

        case 'PUBLIC_FOOTFALL':
          // Number of public citizens/commuters deprived of public sanitation facility
          population = isCityScale ? 8500 : isLocalityScale ? 2800 : 4500;
          populationProvenance = `Public Amenities Footfall Model: daily citizens deprived of sanitary facilities`;
          break;

        default:
          population = 2500;
          populationProvenance = 'Municipal Ward Benchmark';
      }
    }

    // 5. Dynamic Severity & Priority determination based on problem type and extent
    const { severity, priority } = this.calculatePriorityAndSeverity(finalPattern.domainKey, population, fullText);

    return {
      canonicalCategory: finalPattern.canonicalCategory,
      domainKey: finalPattern.domainKey,
      extentType: finalPattern.extentType,
      estimatedPopulation: population,
      populationStatus,
      populationProvenance,
      severity,
      priority,
    };
  }

  private static calculatePriorityAndSeverity(
    domainKey: ResolvedCategoryAndExtent['domainKey'],
    population: number,
    fullText: string
  ): { severity: SeverityLevel; priority: PriorityLevel } {
    const isSevereWord = /\b(?:danger|hazard|accident|death|injur|overflow|choke|burst|stink|contamination)\b/i.test(fullText);

    switch (domainKey) {
      case 'ROAD_TRANSPORT':
        // Roads: commuters
        if (population >= 20000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.SEVERE };
        if (population >= 5000) return { priority: PriorityLevel.HIGH, severity: isSevereWord ? SeverityLevel.SEVERE : SeverityLevel.MODERATE };
        if (population >= 1000) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
        return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };

      case 'FLOOD_ENVIRONMENT':
        // Flood: village exposed
        if (population >= 1000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.CATASTROPHIC };
        if (population >= 300) return { priority: PriorityLevel.HIGH, severity: SeverityLevel.SEVERE };
        if (population >= 50) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
        return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };

      case 'WATER_SUPPLY':
      case 'SANITATION':
        // Water / Sanitation: locality households / public footfall
        if (population >= 5000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.SEVERE };
        if (population >= 1500) return { priority: PriorityLevel.HIGH, severity: isSevereWord ? SeverityLevel.SEVERE : SeverityLevel.MODERATE };
        if (population >= 300) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
        return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };

      default:
        if (population >= 10000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.SEVERE };
        if (population >= 3000) return { priority: PriorityLevel.HIGH, severity: SeverityLevel.MODERATE };
        if (population >= 800) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
        return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };
    }
  }

  /**
   * Maps AI analysis output (domain, category, problemType, normalized text) to SICP canonical categories.
   */
  public static mapAiResultToCanonical(
    rawDomain?: string | null,
    rawCategory?: string | null,
    rawProblemType?: string | null,
    normalizedText?: string | null
  ): {
    canonicalCategory: string;
    domainKey: ResolvedCategoryAndExtent['domainKey'];
    extentType: ResolvedCategoryAndExtent['extentType'];
  } {
    const typeUpper = (rawProblemType || '').trim().toUpperCase();
    const catUpper = (rawCategory || '').trim().toUpperCase();
    const domainUpper = (rawDomain || '').trim().toUpperCase();

    // ─────────────────────────────────────────────────────────────
    // TIER 1: Model's Explicit ProblemType Enum (Highest Precision)
    // ─────────────────────────────────────────────────────────────
    if (typeUpper === 'SANITATION_SERVICE') {
      return {
        canonicalCategory: 'Sanitation & Drainage',
        domainKey: 'SANITATION',
        extentType: 'PUBLIC_FOOTFALL',
      };
    }
    if (typeUpper === 'ROAD_USAGE') {
      return {
        canonicalCategory: 'Roads & Transport',
        domainKey: 'ROAD_TRANSPORT',
        extentType: 'ROAD_COMMUTERS',
      };
    }
    if (typeUpper === 'WATER_SUPPLY') {
      return {
        canonicalCategory: 'Water Supply',
        domainKey: 'WATER_SUPPLY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (typeUpper === 'HEALTHCARE_SERVICE') {
      return {
        canonicalCategory: 'Healthcare & Public Health',
        domainKey: 'HEALTHCARE',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (typeUpper === 'ELECTRICITY_NETWORK') {
      return {
        canonicalCategory: 'Electricity & Lighting',
        domainKey: 'ELECTRICITY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (typeUpper === 'EDUCATION_SERVICE') {
      return {
        canonicalCategory: 'Education & Schools',
        domainKey: 'EDUCATION',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (typeUpper === 'AGRICULTURE_DEPENDENCY') {
      return {
        canonicalCategory: 'Agriculture & Irrigation',
        domainKey: 'AGRICULTURE',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }
    if (typeUpper === 'FLOOD_ENVIRONMENTAL') {
      return {
        canonicalCategory: 'Environment & Waste',
        domainKey: 'FLOOD_ENVIRONMENT',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 2: Model's Explicit Category String
    // ─────────────────────────────────────────────────────────────
    if (/SANITATION|DRAINAGE|SEWER|SEWAGE|TOILET|WASHROOM|GUTTER|MANHOLE/i.test(catUpper)) {
      return {
        canonicalCategory: 'Sanitation & Drainage',
        domainKey: 'SANITATION',
        extentType: 'PUBLIC_FOOTFALL',
      };
    }
    if (/ROAD|TRANSPORT|POTHOLE|HIGHWAY|BRIDGE|TRAFFIC|PAVEMENT|ASPHALT/i.test(catUpper)) {
      return {
        canonicalCategory: 'Roads & Transport',
        domainKey: 'ROAD_TRANSPORT',
        extentType: 'ROAD_COMMUTERS',
      };
    }
    if (/WATER SUPPLY|POTABLE|DRINKING WATER|PIPELINE|BOREWELL|HANDPUMP/i.test(catUpper)) {
      return {
        canonicalCategory: 'Water Supply',
        domainKey: 'WATER_SUPPLY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/HEALTHCARE|HOSPITAL|CLINIC|DISPENSARY|DOCTOR|PHC|CHC|HEALTH FACILIT/i.test(catUpper)) {
      return {
        canonicalCategory: 'Healthcare & Public Health',
        domainKey: 'HEALTHCARE',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/ELECTRIC|LIGHTING|POWER|STREETLIGHT|TRANSFORMER|BLACKOUT/i.test(catUpper)) {
      return {
        canonicalCategory: 'Electricity & Lighting',
        domainKey: 'ELECTRICITY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/EDUCATION|SCHOOL|COLLEGE|CLASSROOM|TEACHER|STUDENT/i.test(catUpper)) {
      return {
        canonicalCategory: 'Education & Schools',
        domainKey: 'EDUCATION',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/AGRICULTUR|IRRIGATION|FARM|CROP|CANAL/i.test(catUpper)) {
      return {
        canonicalCategory: 'Agriculture & Irrigation',
        domainKey: 'AGRICULTURE',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }
    if (/FLOOD|ENVIRONMENT|DISASTER|HAZARD|POLLUTION/i.test(catUpper)) {
      return {
        canonicalCategory: 'Environment & Waste',
        domainKey: 'FLOOD_ENVIRONMENT',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 3: Model's Domain String
    // ─────────────────────────────────────────────────────────────
    if (/SANITATION/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Sanitation & Drainage',
        domainKey: 'SANITATION',
        extentType: 'PUBLIC_FOOTFALL',
      };
    }
    if (/TRANSPORT/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Roads & Transport',
        domainKey: 'ROAD_TRANSPORT',
        extentType: 'ROAD_COMMUTERS',
      };
    }
    if (/WATER RESOURCES/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Water Supply',
        domainKey: 'WATER_SUPPLY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/ENERGY/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Electricity & Lighting',
        domainKey: 'ELECTRICITY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/EDUCATION/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Education & Schools',
        domainKey: 'EDUCATION',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }
    if (/AGRICULTUR/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Agriculture & Irrigation',
        domainKey: 'AGRICULTURE',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }
    if (/ENVIRONMENT/i.test(domainUpper)) {
      return {
        canonicalCategory: 'Environment & Waste',
        domainKey: 'FLOOD_ENVIRONMENT',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }
    if (/PUBLIC HEALTH/i.test(domainUpper) && !/SANITATION|DRAIN|SEWER/i.test(catUpper)) {
      return {
        canonicalCategory: 'Healthcare & Public Health',
        domainKey: 'HEALTHCARE',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 4: Semantic Problem Analysis Fallback (Physical Asset Priority)
    // ─────────────────────────────────────────────────────────────
    const textUpper = (normalizedText || '').toUpperCase();

    // Sanitation & Drainage: Physical drainage, sewers, toilets, washrooms
    if (/\b(?:DRAIN|DRAINAGE|SEWER|SEWAGE|GUTTER|MANHOLE|TOILET|WASHROOM|URINAL|LATRINE|DEFECATION|SEPTIC)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Sanitation & Drainage',
        domainKey: 'SANITATION',
        extentType: 'PUBLIC_FOOTFALL',
      };
    }

    // Roads & Transport: Carriageway, pavement, potholes, traffic
    if (/\b(?:ROAD|POTHOLE|POTHOLES|HIGHWAY|CARRIAGEWAY|ASPHALT|PAVEMENT|BITUMEN|BRIDGE|FLYOVER|TRAFFIC)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Roads & Transport',
        domainKey: 'ROAD_TRANSPORT',
        extentType: 'ROAD_COMMUTERS',
      };
    }

    // Water Supply: Drinking/potable water, pipeline, tap water, borewell, handpump
    if (/\b(?:DRINKING WATER|POTABLE|WATER SUPPLY|WATER PIPELINE|PIPE LEAK|PIPE BURST|TAP WATER|BOREWELL|HANDPUMP|WATER TANKER|WATER SCARCITY|WATER SHORTAGE)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Water Supply',
        domainKey: 'WATER_SUPPLY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }

    // Healthcare & Public Health: Medical facilities, clinics, hospitals, dispensaries, doctors
    if (/\b(?:HEALTHCARE|HOSPITAL|CLINIC|DISPENSARY|PHC|CHC|DOCTOR|DOCTORS|NURSE|NURSES|AMBULANCE|MEDICINE|MEDICINES|VACCINE|EPIDEMIC|HEALTH FACILIT)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Healthcare & Public Health',
        domainKey: 'HEALTHCARE',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }

    // Electricity & Lighting
    if (/\b(?:ELECTRIC|ELECTRICITY|POWER CUT|BLACKOUT|STREETLIGHT|STREET LIGHT|TRANSFORMER|VOLTAGE|HANGING WIRE|POWER OUTAGE)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Electricity & Lighting',
        domainKey: 'ELECTRICITY',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }

    // Education & Schools
    if (/\b(?:SCHOOL|SCHOOLS|CLASSROOM|COLLEGE|TEACHER|TEACHERS|STUDENT|STUDENTS|ANGANWADI)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Education & Schools',
        domainKey: 'EDUCATION',
        extentType: 'LOCALITY_RESIDENTS',
      };
    }

    // Agriculture & Irrigation
    if (/\b(?:CROP|CROPS|FARM|FARMER|FARMERS|IRRIGATION|CANAL|HARVEST)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Agriculture & Irrigation',
        domainKey: 'AGRICULTURE',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }

    // Environment & Waste
    if (/\b(?:FLOOD|FLOODING|INUNDATION|WATERLOGGING|WATER LOGGING|GARBAGE DUMP|SOLID WASTE|POLLUTION)\b/i.test(textUpper)) {
      return {
        canonicalCategory: 'Environment & Waste',
        domainKey: 'FLOOD_ENVIRONMENT',
        extentType: 'VILLAGE_FLOOD_EXPOSED',
      };
    }

    return {
      canonicalCategory: rawCategory || 'General Civic Issue',
      domainKey: 'GENERIC',
      extentType: 'GENERAL_CIVIC',
    };
  }

  /**
   * Authoritative AI-powered category, severity, and extent resolution using the live Gemini model.
   * Strictly adheres to NO FAKE DATA: does not invent arbitrary population counts when unprovided.
   */
  public static async resolveWithAi(
    title: string,
    description: string,
    rawCategory?: string | null,
    providedPopulation?: number | null,
    options?: { requestId?: string }
  ): Promise<AiResolvedCategoryAndExtent> {
    try {
      const aiResponse = await AiServiceClient.analyzeChallenge(
        {
          title,
          description: description || '',
          category: rawCategory || 'General',
          affectedPopulation: providedPopulation,
        },
        options?.requestId
      );

      const mapping = this.mapAiResultToCanonical(
        aiResponse.primaryProblem?.domain || (aiResponse as any).domain,
        aiResponse.primaryProblem?.category || aiResponse.category,
        aiResponse.primaryProblem?.problemType || aiResponse.problemType,
        `${title} ${description} ${aiResponse.normalizedStatement || ''}`
      );

      // NO FAKE DATA: Never invent population numbers. If citizen did not provide it, set to null with UNKNOWN.
      const hasCitizenPop = typeof providedPopulation === 'number' && providedPopulation > 0;
      const estimatedPopulation = hasCitizenPop ? providedPopulation : null;
      const populationStatus = hasCitizenPop ? 'KNOWN' : 'UNKNOWN';
      const populationProvenance = hasCitizenPop
        ? 'Citizen-reported affected count'
        : 'Unavailable (insufficient evidence from problem report)';

      // Severity mapping
      let severity = SeverityLevel.MODERATE;
      const rawSev = (aiResponse.estimatedSeverity || '').toUpperCase();
      if (rawSev === 'CATASTROPHIC') severity = SeverityLevel.CATASTROPHIC;
      else if (rawSev === 'SEVERE') severity = SeverityLevel.SEVERE;
      else if (rawSev === 'LOW') severity = SeverityLevel.LOW;

      // Urgency / Priority mapping
      let priority = PriorityLevel.MEDIUM;
      const rawPrio = (aiResponse.preliminaryPriority || '').toUpperCase();
      if (rawPrio === 'CRITICAL') priority = PriorityLevel.CRITICAL;
      else if (rawPrio === 'HIGH') priority = PriorityLevel.HIGH;
      else if (rawPrio === 'LOW') priority = PriorityLevel.LOW;

      // Extract high-confidence root cause hypotheses (>= 0.65)
      const rootCauses: Array<{ hypothesis: string; confidence: number; systemicIndicator?: boolean }> = [];
      if (Array.isArray(aiResponse.rootCauseHypothesesItems) && aiResponse.rootCauseHypothesesItems.length > 0) {
        for (const item of aiResponse.rootCauseHypothesesItems) {
          const conf = typeof item.confidence === 'number' ? item.confidence : 0.7;
          if (conf >= 0.65) {
            rootCauses.push({
              hypothesis: item.cause || item.reasoning || '',
              confidence: conf,
              systemicIndicator: true,
            });
          }
        }
      } else if (Array.isArray(aiResponse.rootCauseHypotheses) && aiResponse.rootCauseHypotheses.length > 0) {
        for (const hyp of aiResponse.rootCauseHypotheses) {
          rootCauses.push({
            hypothesis: typeof hyp === 'string' ? hyp : (hyp as any).hypothesis || '',
            confidence: 0.75,
            systemicIndicator: true,
          });
        }
      }

      return {
        canonicalCategory: mapping.canonicalCategory,
        domainKey: mapping.domainKey,
        extentType: mapping.extentType,
        estimatedPopulation,
        populationStatus,
        populationProvenance,
        severity,
        priority,
        confidenceScore: Math.min(Math.max(aiResponse.confidenceScore || 0.85, 0), 1),
        normalizedStatement: aiResponse.normalizedStatement,
        reasoningSummary: aiResponse.reasoningSummary,
        rootCauses,
        isAiResolved: true,
      };
    } catch (err) {
      logger.warn(`[AI_RESOLUTION_FALLBACK] Falling back to civic knowledge engine: ${(err as Error).message}`, {
        requestId: options?.requestId,
      });

      const fallback = this.resolve(title, description, rawCategory, providedPopulation);
      const hasCitizenPop = typeof providedPopulation === 'number' && providedPopulation > 0;

      return {
        canonicalCategory: fallback.canonicalCategory,
        domainKey: fallback.domainKey,
        extentType: fallback.extentType,
        estimatedPopulation: hasCitizenPop ? providedPopulation : null,
        populationStatus: hasCitizenPop ? 'KNOWN' : 'UNKNOWN',
        populationProvenance: hasCitizenPop
          ? 'Citizen-reported affected count'
          : 'Unavailable (insufficient evidence from problem report)',
        severity: fallback.severity,
        priority: fallback.priority,
        confidenceScore: 0.70,
        reasoningSummary: 'Civic Knowledge Engine fallback evaluation',
        rootCauses: [],
        isAiResolved: false,
      };
    }
  }
}
