import { TopologyProviderFactory } from '../src/domain/intelligence/topology/topology-provider.factory';
import { ChallengeIntelligenceService } from '../src/domain/intelligence/challenge-intelligence.service';
import { CitizenChannelFactory } from '../src/domain/channels/citizen-channel.adapter';
import { prisma } from '../src/database/prisma';

describe('Unified Progressive Intelligence & Decoupled Topology', () => {
  describe('TopologyProviderFactory & Decoupling', () => {
    it('returns WaterTopologyProvider for WATER domain', () => {
      const provider = TopologyProviderFactory.getProvider('WATER');
      expect(provider.domain).toBe('WATER');
    });

    it('returns GenericTopologyProvider for unmapped sectors with honest UNAVAILABLE status', async () => {
      const provider = TopologyProviderFactory.getProvider('AGRICULTURE');
      expect(provider.domain).toBe('GENERIC');

      const topology = await provider.getTopology({
        challengeId: 'test-agri-001',
        category: 'AGRICULTURE',
        district: 'Patna',
      });

      expect(topology.status).toBe('UNAVAILABLE');
      expect(topology.nodes).toHaveLength(0);
      expect(topology.edges).toHaveLength(0);
      expect(topology.provenance).toContain('UNAVAILABLE');
    });

    it('returns CONTROLLED_DEMO topology only for Bhopal demo requests', async () => {
      const provider = TopologyProviderFactory.getProvider('WATER');
      const demoTopology = await provider.getTopology({
        challengeId: 'demo',
        category: 'WATER',
        district: 'Bhopal',
        isDemo: true,
      });

      expect(demoTopology.status).toBe('CONTROLLED_DEMO');
      expect(demoTopology.nodes.length).toBeGreaterThan(0);
      expect(demoTopology.lcaNodeId).toBe('node-trunk-04');
    });

    it('returns UNAVAILABLE for non-Bhopal real water challenge when no GIS records exist', async () => {
      const provider = TopologyProviderFactory.getProvider('WATER');
      const topology = await provider.getTopology({
        challengeId: 'real-non-bhopal-water-999',
        category: 'WATER',
        district: 'Faridabad',
        isDemo: false,
      });

      // Honest zero-fabrication: Never invent fake pipes
      expect(topology.status).toBe('UNAVAILABLE');
      expect(topology.nodes).toHaveLength(0);
    });
  });

  describe('ChallengeIntelligenceService Progressive Disclosure', () => {
    it('delivers 5-level structured intelligence for controlled demo scenario', async () => {
      const intel = await ChallengeIntelligenceService.getChallengeIntelligence('demo');

      // Level 1: Human Statement
      expect(intel.summary.statement).toContain('Possible shared infrastructure relationship detected');
      expect(intel.summary.isSystemic).toBe(true);

      // Level 2: Relationships "Why"
      expect(intel.relationships.explanation).toContain('Reports originate from adjacent wards');
      expect(intel.relationships.systemicPatternDetected).toBe(true);

      // Level 3: Evidence with Epistemic classes
      expect(intel.evidence.supporting.length).toBeGreaterThan(0);
      expect(intel.evidence.supporting[0].epistemicClass).toBeDefined();

      // Level 4: Technical Topology & Hypotheses
      expect(intel.topology.status).toBe('CONTROLLED_DEMO');
      expect(intel.hypotheses.length).toBeGreaterThan(0);

      // Level 5: Dominant Primary Action
      expect(intel.nextAction.label).toBe('Validate Investigation');
      expect(intel.nextAction.primary).toBe(true);
    });

    it('validates investigation in demo mode cleanly without throw', async () => {
      const res = await ChallengeIntelligenceService.validateInvestigation(
        'demo',
        'officer-test-01',
        'Er. Test Officer',
        'Demonstration verification test'
      );

      expect(res.success).toBe(true);
      expect(res.validatedAt).toBeDefined();
    });
  });

  describe('Citizen Channel Adapter (WhatsApp Webhook Architecture)', () => {
    it('provides WhatsApp and Web adapters via factory', () => {
      const web = CitizenChannelFactory.getAdapter('WEB');
      const wa = CitizenChannelFactory.getAdapter('WHATSAPP');

      expect(web.channelName).toBe('WEB');
      expect(wa.channelName).toBe('WHATSAPP');
    });

    it('verifies Meta subscription webhook token correctly', () => {
      const wa = CitizenChannelFactory.getAdapter('WHATSAPP') as any;
      const challenge = wa.verifySubscription('subscribe', 'sicp_whatsapp_verify_token_2026', 'test_hub_challenge_123');
      expect(challenge).toBe('test_hub_challenge_123');

      const rejected = wa.verifySubscription('subscribe', 'wrong_token', 'test_hub_challenge_123');
      expect(rejected).toBeNull();
    });
  });
});
