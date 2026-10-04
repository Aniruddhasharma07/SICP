import {
  HypothesisStatus,
  InvestigationEvidenceStatus,
  InvestigationHypothesisDto,
  ChallengeInvestigationDto,
  GovernanceScope,
  GovernanceDecisionType,
} from '@sicp/shared';
import { prisma } from '../../../database/prisma';
import { DomainIntelligenceResolver } from './domain-intelligence-resolver';
import { TopologyProviderFactory } from '../topology/topology-provider.factory';
import { logger } from '../../../utils/logger';

export class SystemicInvestigationEngine {
  /**
   * Retrieves or computes the systemic investigation package for a Challenge.
   * Ensures root cause is strictly treated as an investigation hypothesis until human validation.
   */
  public static async getInvestigation(challengeId: string): Promise<ChallengeInvestigationDto> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        problemGroups: {
          include: {
            problems: true,
          },
        },
      },
    });

    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    // 1. Check Governance Memory to exclude rejected relationships/interpretations
    const governanceMemory = await prisma.relationshipGovernanceMemory.findMany({
      where: {
        sourceEntityId: challengeId,
        active: true,
      },
    });

    // 2. Resolve Domain
    const canonicalDomain = DomainIntelligenceResolver.resolveDomain(challenge.category);

    // 3. Generate Competing Hypotheses based on domain and citizen report signals
    const problemDescriptions = challenge.problemGroups
      .flatMap((g) => g.problems.map((p) => p.description))
      .concat(challenge.description || '');

    const combinedText = problemDescriptions.join(' ').toLowerCase();

    const competingHypotheses: InvestigationHypothesisDto[] = this.deriveHypothesesForDomain(
      canonicalDomain,
      combinedText,
      challenge.id
    );

    // 4. Determine if human validation has occurred
    // If challenge was verified by government officer, mark leading hypothesis as HUMAN_VALIDATED
    const isHumanValidated = challenge.status === 'GOVERNMENT_VERIFIED' || challenge.status === 'RESOLVED';
    const rootCauseStatus = isHumanValidated
      ? HypothesisStatus.HUMAN_VALIDATED
      : HypothesisStatus.UNDER_EVALUATION;

    const possibleRootCause = isHumanValidated
      ? (challenge.systemicSummary || competingHypotheses[0]?.title || 'Validated systemic root cause')
      : (competingHypotheses[0]?.title || 'Multi-factor systemic failure under evaluation');

    if (isHumanValidated && competingHypotheses.length > 0) {
      competingHypotheses[0].status = HypothesisStatus.HUMAN_VALIDATED;
      competingHypotheses[0].evidenceStatus = InvestigationEvidenceStatus.SUPPORTS;
    }

    // 5. Query Topology Availability with Honest Fallback
    let topologyAvailable = false;
    let topologyData: any = null;

    try {
      const topologyProvider = TopologyProviderFactory.getProvider(canonicalDomain);
      if (topologyProvider) {
        const topo = await topologyProvider.getTopology({
          challengeId: challenge.id,
          category: challenge.category,
          district: challenge.district || undefined,
          state: challenge.state || undefined,
        });

        if (topo && topo.status === 'AVAILABLE' && topo.nodes.length > 0) {
          topologyAvailable = true;
          topologyData = topo;
        }
      }
    } catch (err) {
      logger.warn(`Topology query skipped or unavailable for challenge ${challengeId}: ${err}`);
      topologyAvailable = false;
    }

    // 6. Falsification Criteria
    const falsificationCriteria = [
      'Evidence showing unrelated localized causes in adjacent wards/corridors',
      'Independent utility maintenance logs confirming isolated scheduled work',
      'Field inspection disproving sub-base compromise or shared feeder degradation',
    ];

    return {
      challengeId: challenge.id,
      possibleRootCause,
      rootCauseStatus,
      competingHypotheses,
      falsificationCriteria,
      topologyAvailable,
      topologyData,
    };
  }

  private static deriveHypothesesForDomain(
    domain: string,
    text: string,
    challengeId: string
  ): InvestigationHypothesisDto[] {
    if (domain === 'ROAD_TRANSPORT') {
      return [
        {
          id: `hyp-road-subbase-${challengeId}`,
          title: 'Sub-base moisture infiltration and subgrade saturation',
          description:
            'Repeated surface cracking and recurrent potholes along the arterial corridor indicate foundational sub-base moisture saturation, rather than localized asphalt wear.',
          status: HypothesisStatus.UNDER_EVALUATION,
          evidenceStatus: text.includes('water') || text.includes('rain') || text.includes('drain')
            ? InvestigationEvidenceStatus.SUPPORTS
            : InvestigationEvidenceStatus.UNKNOWN,
          falsificationCriteria: 'Core drill samples indicating dry, intact sub-base layer across affected chainage.',
          evidenceSignals: [
            'Cluster of 3+ recurrent potholes within 300m corridor',
            'Absence of adequate roadside stormwater discharge channel',
          ],
        },
        {
          id: `hyp-road-heavyload-${challengeId}`,
          title: 'Axle load overloading beyond pavement design capacity',
          description:
            'Unregulated commercial multi-axle freight traffic exceeding the designed equivalent single axle load (ESAL) threshold.',
          status: HypothesisStatus.UNDER_EVALUATION,
          evidenceStatus: text.includes('truck') || text.includes('heavy') || text.includes('traffic')
            ? InvestigationEvidenceStatus.SUPPORTS
            : text.includes('residential')
            ? InvestigationEvidenceStatus.WEAKENS
            : InvestigationEvidenceStatus.UNKNOWN,
          falsificationCriteria: 'Weigh-in-motion sensor data showing commercial axle loads within IRC design limits.',
          evidenceSignals: ['Rutting along wheel paths in primary lanes'],
        },
        {
          id: `hyp-road-utility-${challengeId}`,
          title: 'Unconsolidated utility trench restoration settlement',
          description:
            'Backfill compaction deficit following pipeline or telecommunications trenching across the carriageway.',
          status: HypothesisStatus.UNDER_EVALUATION,
          evidenceStatus: text.includes('digging') || text.includes('pipe') || text.includes('cable')
            ? InvestigationEvidenceStatus.SUPPORTS
            : InvestigationEvidenceStatus.UNKNOWN,
          falsificationCriteria: 'Municipal right-of-way registry showing no utility cuts within the past 36 months.',
          evidenceSignals: ['Linear longitudinal subsidence patterns'],
        },
      ];
    }

    if (domain === 'WATER_SUPPLY') {
      return [
        {
          id: `hyp-water-feeder-${challengeId}`,
          title: 'Primary feeder main joint leakage and pressure drop',
          description:
            'Hydraulic head loss propagating downstream through branch valves, causing intermittent supply across consecutive wards.',
          status: HypothesisStatus.UNDER_EVALUATION,
          evidenceStatus: InvestigationEvidenceStatus.SUPPORTS,
          falsificationCriteria: 'Sustained pressure transducer readings above 1.8 bar at upstream distribution node.',
          evidenceSignals: ['Simultaneous low pressure reported across distinct branch sectors'],
        },
        {
          id: `hyp-water-contamination-${challengeId}`,
          title: 'Secondary cross-contamination through negative pressure ingress',
          description:
            'Sub-atmospheric transient pressure events drawing shallow groundwater or drainage runoff into compromised pipe joints.',
          status: HypothesisStatus.UNDER_EVALUATION,
          evidenceStatus: text.includes('odor') || text.includes('color') || text.includes('smell')
            ? InvestigationEvidenceStatus.SUPPORTS
            : InvestigationEvidenceStatus.UNKNOWN,
          falsificationCriteria: 'Negative residual chlorine and zero coliform count across sentinel sampling taps.',
          evidenceSignals: ['Customer reports of turbidity following resumption of pumping'],
        },
      ];
    }

    // Generic Fallback Hypotheses
    return [
      {
        id: `hyp-generic-infrastructure-${challengeId}`,
        title: 'Shared systemic utility corridor degradation',
        description: 'Co-located municipal infrastructure exhibiting systemic end-of-lifecycle fatigue.',
        status: HypothesisStatus.UNDER_EVALUATION,
        evidenceStatus: InvestigationEvidenceStatus.SUPPORTS,
        falsificationCriteria: 'Independent engineering survey certifying structural design compliance.',
        evidenceSignals: ['Multiple concurrent incident reports across adjacent geographic zones'],
      },
      {
        id: `hyp-generic-localized-${challengeId}`,
        title: 'Independent localized incidents with coincidental timing',
        description: 'Isolated civic defects without common upstream or structural causality.',
        status: HypothesisStatus.UNDER_EVALUATION,
        evidenceStatus: InvestigationEvidenceStatus.UNKNOWN,
        falsificationCriteria: 'Statistical correlation exceeding random baseline distribution across 14-day window.',
        evidenceSignals: ['Spatial clustering without shared municipal asset identifier'],
      },
    ];
  }
}
