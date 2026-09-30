'use client';

import React from 'react';
import Link from 'next/link';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  GraduationCap,
  Users,
  Briefcase,
  Layers,
  Network,
  ArrowRight,
  CheckCircle2,
  Lock,
  Compass,
  FileText,
  Activity,
  HeartHandshake,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-xs font-mono py-1 px-3">
            SMART INDIA HACKATHON 2026 — OFFICIAL CIVIC PLATFORM
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Societal Innovation Collaboration Portal
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            A unified, problem-centric collaboration architecture bridging Citizens, Municipal Governance, Universities, and Industry.
          </p>
          <div className="pt-2 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase">
            Simple on the surface — Intelligent underneath
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Citizens & PRI / ULB</CardTitle>
              <CardDescription className="text-xs">
                Frictionless 3-step reporting across Web, WhatsApp, and Voice. Real-time tracking without bureaucratic gatekeeping.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Municipal Governance</CardTitle>
              <CardDescription className="text-xs">
                Statutory validation, SLA enforcement, supervisory escalation, and field dispatch with immutable audit trails.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Universities & R&D</CardTitle>
              <CardDescription className="text-xs">
                Direct matching with multidisciplinary faculty, academic research labs, and student innovators for evidence-backed solutions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition">
            <CardHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Industry & CSR</CardTitle>
              <CardDescription className="text-xs">
                Schedule VII co-funding, tech transfer, scalable pilot deployments, and verifiable societal impact metrics.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Problem-Centric Architecture Walkthrough */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">The Problem-Centric Lifecycle</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                How an individual community concern matures into a verified institutional intervention.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 text-xs font-bold flex items-center justify-center">1</div>
              <div className="font-semibold text-sm text-slate-100">Intake & Gating</div>
              <p className="text-xs text-slate-400">
                Natural language intake via Web or WhatsApp. GPS pinpointing and multimodal evidence validation.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 text-xs font-bold flex items-center justify-center">2</div>
              <div className="font-semibold text-sm text-slate-100">AI Intelligence</div>
              <p className="text-xs text-slate-400">
                Taxonomic classification, spatial correlation, and systemic cluster detection via FastAPI & Gemini.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 text-xs font-bold flex items-center justify-center">3</div>
              <div className="font-semibold text-sm text-slate-100">Statutory Sign-Off</div>
              <p className="text-xs text-slate-400">
                Municipal officers review diagnostic evidence and approve institutional routing without dead ends.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 text-xs font-bold flex items-center justify-center">4</div>
              <div className="font-semibold text-sm text-slate-100">University Matching</div>
              <p className="text-xs text-slate-400">
                Algorithmic routing to accredited engineering departments and research faculty for RFP submission.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 text-xs font-bold flex items-center justify-center">5</div>
              <div className="font-semibold text-sm text-slate-100">Solution Memory</div>
              <p className="text-xs text-slate-400">
                Empirical pilot results, failure lessons, and blueprints archived to prevent reinventing the wheel.
              </p>
            </div>
          </div>
        </div>

        {/* Epistemic Certainty Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" /> Epistemic Provenance
              </div>
              <CardTitle className="text-lg">Zero Fabrication Invariant</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                SICP strictly enforces clear provenance on every piece of data. We distinguish between directly observed field data (<code>OBSERVED</code>), computed spatial relations (<code>COMPUTED</code>), and preliminary models (<code>AI_INTERPRETED</code>, <code>HYPOTHESIZED</code>).
              </p>
              <p>
                If municipal utility GIS schematics do not exist for a region, the platform truthfully reports <code>TOPOLOGY_STATUS = UNAVAILABLE</code> rather than generating synthetic pipes or assets.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <HeartHandshake className="w-4 h-4" /> Zero Dead Ends
              </div>
              <CardTitle className="text-lg">Continuous Lifecycle Forward Motion</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                Every state in the SICP state machine has explicit recovery pathways. When a proposal or pilot encounters issues, it never dead-ends; instead, structured revision requests, partial funding splits, and recurrence alerts guide users to resolution.
              </p>
              <p>
                Transparent audit logging records all statutory decisions, ensuring full accountability for citizen trust.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Bar */}
        <div className="text-center py-6 space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Ready to explore civic intelligence?
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/challenges">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                Explore Problems <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/solutions">
              <Button variant="outline">
                View Solution Memory
              </Button>
            </Link>
            <Link href="/challenges/new">
              <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                Report a Civic Problem
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
