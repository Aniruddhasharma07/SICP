'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Building2,
  Users,
  Briefcase,
  ExternalLink,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Network,
  Cpu,
  Coins,
  Flame,
  Award,
} from 'lucide-react';
import { ChallengeDto, UserRole, EvidenceEpistemicClass } from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface CollaborationLayerProps {
  challenge: ChallengeDto & {
    projects?: { id: string; title: string; status: any }[];
  };
  currentUserRole?: UserRole;
  onContinueToIntervention?: () => void;
}

export function CollaborationLayer({
  challenge,
  currentUserRole,
  onContinueToIntervention,
}: CollaborationLayerProps) {
  const isAssigned =
    challenge.status === 'ASSIGNED_TO_UNIVERSITY' ||
    challenge.status === 'IN_PILOT' ||
    challenge.status === 'DEPLOYED' ||
    challenge.status === 'RESOLVED';

  const hasProject = challenge.projects && challenge.projects.length > 0;

  // Determine matched university domain based on category
  const getDomainCapabilities = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'water':
      case 'water supply':
      case 'water & sanitation':
        return {
          dept: 'Department of Civil & Environmental Engineering (Urban Hydrology)',
          focus: 'Acoustic Leak Detection & Transient Pressure Wave Modeling',
          readiness: 'TRL 5 (Lab Validated)',
          matchScore: 94,
          scheduleVii: 'Item (i): Eradicating hunger, poverty, sanitation & safe drinking water',
          coFundingPotential: '₹8.5 Lakhs (65% CSR Co-Funding)',
        };
      case 'waste':
      case 'waste management':
      case 'sanitation':
        return {
          dept: 'Center for Environmental Biotechnology & Circular Economy',
          focus: 'Bio-digestion Kinetics & Decentralized Segregation Optimization',
          readiness: 'TRL 6 (Field Prototype Ready)',
          matchScore: 91,
          scheduleVii: 'Item (iv): Ensuring environmental sustainability & ecological balance',
          coFundingPotential: '₹6.0 Lakhs (50% CSR Co-Funding)',
        };
      case 'roads':
      case 'transport':
      case 'infrastructure':
        return {
          dept: 'Transportation Systems & Smart Infrastructure Laboratory',
          focus: 'Subsurface Pavement GPR & Geo-Polymer Fast Curing Formulations',
          readiness: 'TRL 5 (Component Tested)',
          matchScore: 89,
          scheduleVii: 'Item (iv): Rural development & sustainable urban infrastructure',
          coFundingPotential: '₹14.0 Lakhs (70% CSR Co-Funding)',
        };
      default:
        return {
          dept: 'Interdisciplinary Civic Systems & Applied Engineering Lab',
          focus: 'Automated Fault Localization & Embedded Telemetry Systems',
          readiness: 'TRL 5 (Engineering Breadboard)',
          matchScore: 88,
          scheduleVii: 'Item (i) & (iv): Public Health & Environmental Resilience',
          coFundingPotential: '₹7.5 Lakhs (60% CSR Co-Funding)',
        };
    }
  };

  const domain = getDomainCapabilities(challenge.category || '');

  return (
    <section id="collaboration-layer" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                Stage 06 • Multi-Sector Partnership &amp; R&amp;D Routing
              </span>
              <span className="text-xs text-slate-500">
                Question: Who can engineer the intervention, and who can fund/scale it?
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Academic Innovation &amp; CSR Industrial Matching
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.COMPUTED} label="Domain Ontology &amp; Schedule VII Match" />
        </div>
      </div>

      {/* Epistemic Axiom Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-purple-300">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Invariant: Multi-Sector Alignment Precedes Public Expenditure</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            SICP Architecture
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          SICP prevents isolated administrative dead-ends by matching verified problems against university research labs for multidisciplinary prototyping and corporate CSR budgets (Schedule VII Companies Act 2013) for co-funded pilot deployments.
        </p>
      </div>

      {/* Active Assignment Status if Assigned */}
      {isAssigned && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-slate-900 border border-purple-500/40 text-xs space-y-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="font-bold text-purple-200 block text-sm">
                  Active Multi-Sector Research &amp; Pilot Track
                </span>
                <span className="text-[11px] text-slate-400">
                  Assigned to Academic R&amp;D Lab • Monitored via SICP Project Governance
                </span>
              </div>
            </div>
            <Badge className="bg-purple-600 text-white font-mono text-[10px]">
              {challenge.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {hasProject && (
            <div className="p-3 bg-slate-900/90 rounded-lg border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Connected Execution Project</span>
                <span className="font-bold text-slate-100 text-xs">{challenge.projects![0].title}</span>
                <span className="text-[10px] text-purple-300 block">Status: {challenge.projects![0].status}</span>
              </div>
              <Link href={`/projects/${challenge.projects![0].id}`}>
                <Button size="sm" variant="primary" className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7">
                  <span>Open Project Cockpit</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Two-Column Matching Grid: University R&D vs Industry CSR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Track A: Academic Research Lab Matching */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Academic R&amp;D Lab Routing</h3>
                <span className="text-[10px] text-slate-400">Multidisciplinary Engineering Matching</span>
              </div>
            </div>
            <Badge className="bg-blue-950/80 text-blue-300 border border-blue-800 text-[10px] font-mono">
              {domain.matchScore}% Match
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Matched Faculty Department</span>
              <span className="font-semibold text-slate-200">{domain.dept}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Recommended Research Thrust</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{domain.focus}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Technology Readiness</span>
                <span className="font-bold text-blue-400">{domain.readiness}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Lab Resource Mode</span>
                <span className="font-bold text-slate-300">Grant &amp; Thesis Cluster</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Context preserved in portal</span>
            <Link href={`/university?problemId=${challenge.id}`}>
              <Button size="sm" variant="outline" className="border-blue-700/60 text-blue-300 hover:bg-blue-950/40 text-xs h-8">
                <span>Engage University Lab</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Track B: Industry Deployment & CSR Sponsorship */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Corporate &amp; CSR Co-Funding</h3>
                <span className="text-[10px] text-slate-400">Schedule VII Statutory Alignment</span>
              </div>
            </div>
            <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
              Schedule VII
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">CSR Mandate Alignment</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{domain.scheduleVii}</p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Corporate Co-Funding Potential</span>
              <span className="font-semibold text-emerald-400">{domain.coFundingPotential}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Procurement Channel</span>
                <span className="font-bold text-slate-300">GeM Portal Integration</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tax Exemption</span>
                <span className="font-bold text-emerald-400">Section 135 Compliant</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Context preserved in portal</span>
            <Link href={`/industry?problemId=${challenge.id}`}>
              <Button size="sm" variant="outline" className="border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40 text-xs h-8">
                <span>Access CSR Rail</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Next Stage Navigation Hook */}
      {onContinueToIntervention && (
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button
            size="sm"
            variant="primary"
            onClick={onContinueToIntervention}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-4"
          >
            <span>Proceed to Field Intervention &amp; Ground Truth Verification</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
