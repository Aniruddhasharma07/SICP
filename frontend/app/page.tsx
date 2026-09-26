'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '../src/components/layout/AppLayout';
import { Button } from '../src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { useAuth } from '../src/lib/auth-context';
import { apiClient } from '../src/lib/api-client';
import { getAuthorizedPortals } from '../src/components/layout/PortalSwitcher';
import {
  ArrowRight,
  PlusCircle,
  Compass,
  BrainCircuit,
  GraduationCap,
  Building2,
  CheckSquare,
  ShieldCheck,
  TrendingUp,
  Award,
  Users,
  Search,
  CheckCircle2,
  FolderKanban,
  BarChart3,
  Mic,
  MapPin,
  Clock,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Briefcase,
  Layers,
  Flame,
  Check,
  Activity,
  Radio,
  Zap,
} from 'lucide-react';

import { SEED_JHARKHAND_CHALLENGES } from '../src/lib/scenarios/gamharia-incident-scenario';
import { ProblemRelationshipSummary } from '../src/components/problem/ProblemRelationshipSummary';

interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  district?: string;
  state?: string;
  supportVotesCount?: number;
  priorityScore?: number;
  affectedPopulation?: number;
  isSystemic?: boolean;
}

interface QuickAnalytics {
  challenges: { total: number; systemicCount: number; resolvedCount?: number };
  projects: { total: number };
  innovation: { publishedSolutionMemories: number };
  impact: { totalAffectedPopulation: number; districtsCovered: number };
}

export default function CivicPortalHomePage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeItem[]>(SEED_JHARKHAND_CHALLENGES as any);
  const [analytics, setAnalytics] = useState<QuickAnalytics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  const authorizedPortals = getAuthorizedPortals(user?.role);

  useEffect(() => {
    async function loadData() {
      try {
        const [chalRes, analyticsRes] = await Promise.all([
          apiClient.request<{ items: ChallengeItem[]; total: number }>('/api/v1/challenges?limit=6'),
          apiClient.request<QuickAnalytics>('/api/v1/analytics'),
        ]);

        if (chalRes.success && chalRes.data) {
          const items = Array.isArray(chalRes.data) ? chalRes.data : (chalRes.data as any).items || [];
          if (items.length > 0) {
            setChallenges(items);
          }
        }
        if (analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
      } catch {
        // Keeps SEED_JHARKHAND_CHALLENGES fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedCategory === 'ALL') return true;
      return c.category?.toLowerCase().includes(selectedCategory.toLowerCase());
    });
  }, [challenges, selectedCategory]);

  const totalReported = analytics?.challenges?.total ?? challenges.length;
  const systemicCount = analytics?.challenges?.systemicCount ?? challenges.filter(c => c.isSystemic).length;
  const totalProjects = analytics?.projects?.total ?? 0;
  const memoryCount = analytics?.innovation?.publishedSolutionMemories ?? 0;

  const pipelineSteps = [
    {
      step: '01',
      title: 'Citizen Signal',
      subtitle: 'Verified Ground Intake',
      desc: 'Citizens report local road, water, or civil hazards via text, voice, or media. Verifiable geocoding and symptom extraction are captured.',
      badge: 'Citizen',
    },
    {
      step: '02',
      title: 'Intake Understood',
      subtitle: 'Symptom & Boundary Parsing',
      desc: 'SICP semantically extracts symptoms, severity, and service area boundaries without hallucinating nonexistent facts.',
      badge: 'SICP AI',
    },
    {
      step: '03',
      title: 'Signals Connected',
      subtitle: 'Spatio-Temporal Correlation',
      desc: 'Proximity algorithms connect nearby reports sharing time windows (<48h), distance (<2km), and symptom overlap (>80%).',
      badge: 'Correlation',
    },
    {
      step: '04',
      title: 'Systemic Pattern',
      subtitle: 'Heuristic Scoring',
      desc: 'Evidence crosses the systemic threshold (S_sys >= 0.70), alerting municipal command to a possible shared infrastructure failure.',
      badge: 'Systemic',
    },
    {
      step: '05',
      title: 'Infrastructure Lineage',
      subtitle: 'Topological Traversal',
      desc: 'Directed graph traversal queries official Municipal GIS data to trace feeder lines and identify Lowest Common Ancestor (LCA) assets.',
      badge: 'Topology',
    },
    {
      step: '06',
      title: 'Active Investigation',
      subtitle: 'Field Inspection & Logging',
      desc: 'Municipal engineers log physical observations, dynamic pressure readings, and acoustic correlation data.',
      badge: 'Investigation',
    },
    {
      step: '07',
      title: 'Sentinel Probe',
      subtitle: 'Targeted Control Inquiry',
      desc: 'Strictly neutral, non-leading inquiries are dispatched to unaffected control areas to test branch boundary hypotheses.',
      badge: 'Sentinel',
    },
    {
      step: '08',
      title: 'Competing Hypotheses',
      subtitle: 'Richards Heuer AMCH v1.0',
      desc: 'Analysis of Competing Hypotheses matrix evaluates mutually exclusive failure modes, penalizing inconsistent explanations.',
      badge: 'AMCH',
    },
    {
      step: '09',
      title: 'Human Validation',
      subtitle: 'Statutory Officer Sign-Off',
      desc: 'Invariant #1: AI suggests and computes; only accredited human government officers hold statutory authority to validate findings.',
      badge: 'Governance',
    },
    {
      step: '10',
      title: 'Collaboration',
      subtitle: 'University & Industry Brief',
      desc: 'Validated challenges convert into accredited academic R&D calls and corporate CSR deployment opportunities.',
      badge: 'Partnership',
    },
    {
      step: '11',
      title: 'Field Intervention',
      subtitle: 'Engineering Remediation',
      desc: 'Multi-disciplinary university teams and industry partners execute sensor deployments and engineering fixes.',
      badge: 'Intervention',
    },
    {
      step: '12',
      title: 'Verified Outcome',
      subtitle: 'Ground Truth Confirmation',
      desc: 'Citizen post-intervention surveys and municipal inspections verify permanent problem resolution on the ground.',
      badge: 'Verified',
    },
    {
      step: '13',
      title: 'Solution Memory',
      subtitle: 'SICP Remembers (Section 22)',
      desc: 'Intervention telemetry, failure avoidance factors, and lessons learned are indexed into institutional memory for future learning.',
      badge: 'Memory',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-12 py-2">
        {/* Elite Hero Section */}
        <section className="relative rounded-3xl bg-slate-950 text-white p-6 sm:p-10 md:p-14 overflow-hidden border border-slate-800 shadow-2xl">
          {/* Background Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>National Civic Innovation Platform</span>
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Live 5-Portal Architecture
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1]">
              Where Community Problems Meet{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300">
                Academic Engineering &amp; Action.
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-normal">
              A verified closed-loop digital ecosystem connecting <strong>Citizens</strong>, <strong>Municipal Authorities</strong>, <strong>Premier Universities</strong>, and <strong>Corporate CSR Partners</strong> to solve chronic societal challenges.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link href="/challenges/new">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm h-12 px-6 shadow-lg shadow-blue-600/30 gap-2">
                  <PlusCircle className="w-5 h-5" />
                  <span>Report a Problem</span>
                </Button>
              </Link>
              <Link href="/challenges">
                <Button size="lg" variant="outline" className="text-slate-200 border-slate-700 hover:bg-slate-900 text-sm h-12 px-6 gap-2">
                  <Compass className="w-4 h-4" />
                  <span>Explore Problems</span>
                </Button>
              </Link>
              <Link href="/solutions">
                <Button size="lg" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900/60 text-sm h-12 px-4 gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-emerald-400" />
                  <span>Solution Memory</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Live Ecosystem Metrics Ticker */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Transparent Civic Telemetry</span>
            </h2>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Verified Database Aggregations</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 text-center">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase block">Reported Civic Issues</span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">{totalReported}</div>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">100% Authenticated Intake</span>
            </div>

            <div className="p-4 md:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shadow-xs space-y-1 text-center">
              <span className="text-xs text-blue-800 dark:text-blue-300 font-bold uppercase block">Systemic Patterns</span>
              <div className="text-3xl font-black text-blue-950 dark:text-blue-200 font-mono tracking-tight">{systemicCount}</div>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">Correlated Asset Lineages</span>
            </div>

            <div className="p-4 md:p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-1 text-center">
              <span className="text-xs text-indigo-800 dark:text-indigo-300 font-bold uppercase block">R&amp;D &amp; Field Projects</span>
              <div className="text-3xl font-black text-indigo-950 dark:text-indigo-200 font-mono tracking-tight">{totalProjects}</div>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">University &amp; CSR Interventions</span>
            </div>

            <div className="p-4 md:p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs space-y-1 text-center">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Solution Memories</span>
              <div className="text-3xl font-black text-emerald-950 dark:text-emerald-200 font-mono tracking-tight">{memoryCount}</div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                {memoryCount > 0 ? 'Indexed Precedents (Sec 22)' : 'Awaiting Field Indexing'}
              </span>
            </div>
          </div>
        </section>

        {/* Interactive Societal Innovation Pipeline Visualizer */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  13-Stage Canonical Intelligence Continuum
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                How SICP Transforms Civic Problems into Verified Interventions
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium self-start md:self-auto">
              Click any stage to inspect the intelligence continuum
            </span>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {pipelineSteps.map((step, idx) => {
              const isSelected = activePipelineStep === idx;
              return (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => setActivePipelineStep(idx)}
                  className={`text-left p-3 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-blue-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-blue-300' : 'text-slate-400'}`}>
                      Step {step.step}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded font-semibold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs leading-tight line-clamp-1">{step.title}</h4>
                </button>
              );
            })}
          </div>

          {/* Active Stage Deep Dive */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                  Stage {pipelineSteps[activePipelineStep].step} &bull; {pipelineSteps[activePipelineStep].subtitle}
                </span>
                <h3 className="text-lg md:text-xl font-black text-white">
                  {pipelineSteps[activePipelineStep].title}
                </h3>
              </div>
              <Badge className="bg-blue-600 text-white font-bold text-xs uppercase px-3 py-1">
                {pipelineSteps[activePipelineStep].badge}
              </Badge>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {pipelineSteps[activePipelineStep].desc}
            </p>
          </div>
        </section>

        {/* 5 Portals Ecosystem Grid */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                SICP 5-Portal Digital Architecture
              </h2>
              <p className="text-xs text-slate-500">
                Five distinct, dedicated workspaces serving each societal sector with granular RBAC enforcement.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
              {authorizedPortals.length} Authorized Workspaces
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorizedPortals.map((portal) => (
              <Link key={portal.id} href={portal.path} className="group">
                <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-blue-400 bg-white flex flex-col justify-between overflow-hidden">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{portal.icon}</span>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {portal.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold group-hover:text-blue-600 transition-colors pt-1">
                      {portal.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {portal.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform border-t border-slate-100 pt-3">
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Live Problem Feed & Community Participation */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Recent Civic Problems Under Evaluation
              </h2>
              <p className="text-xs text-slate-500">
                Explore real community problems reported by citizens across active administrative jurisdictions.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['ALL', 'Water', 'Electricity', 'Roads', 'Sanitation', 'Health'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Domains' : cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
              <p className="text-sm font-semibold text-slate-700">No problems found in this category.</p>
              <Link href="/challenges/new">
                <Button size="sm" className="text-xs">Report First Problem</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredChallenges.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-150 h-full flex flex-col justify-between overflow-visible p-4.5 space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Status on left, Category on right */}
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={item.status} size="sm" />
                      <div className="flex items-center gap-1.5">
                        {item.isSystemic && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>Systemic</span>
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.category?.replace(/_/g, ' ') || 'Civic'}
                        </span>
                      </div>
                    </div>

                    {/* LEVEL 1: Problem Title (Dominant Visual Element) */}
                    <Link href={`/challenges/${item.id}`} className="block focus:outline-hidden">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </Link>

                    {/* LEVEL 2: Problem Description (Clearly Secondary) */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* LEVEL 3: Location + Priority Score */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="truncate font-medium">
                          {item.district ? `${item.district}, ${item.state || ''}` : 'Location pending'}
                        </span>
                        {item.affectedPopulation ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">
                            • {item.affectedPopulation.toLocaleString()} affected
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-blue-700 dark:text-blue-400 text-xs">
                        <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{item.priorityScore !== undefined ? `${item.priorityScore} / 100` : 'Evaluating'}</span>
                        <span className="text-[10px] uppercase font-sans font-semibold text-slate-500 dark:text-slate-400 ml-0.5">
                          Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    {/* LEVEL 4: Relationship Intelligence Badges */}
                    <ProblemRelationshipSummary challenge={item as any} />

                    {/* LEVEL 5: Citizen Endorsements + Workspace CTA */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {item.supportVotesCount || 0} citizen {item.supportVotesCount === 1 ? 'endorsement' : 'endorsements'}
                      </span>

                      <Link
                        href={`/challenges/${item.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group-hover:translate-x-0.5"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-3">
            <Link href="/challenges">
              <Button
                variant="outline"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs hover:border-slate-400 gap-2 px-6 py-2.5 transition-all"
              >
                <span>View Full Societal Problem Registry</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
