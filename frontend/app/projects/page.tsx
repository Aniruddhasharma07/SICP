'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { Input } from '../../src/components/ui/Input';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { apiClient } from '../../src/lib/api-client';
import {
  FolderKanban,
  Search,
  PlusCircle,
  GraduationCap,
  Building2,
  Rocket,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

interface ProjectListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  category?: string;
  leadingOrg?: { id: string; name: string; type: string } | null;
  challenge?: { id: string; title: string; category: string; district?: string; state?: string } | null;
  _count?: {
    milestones: number;
    prototypes: number;
    pilots: number;
    deployments: number;
  };
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { id: 'ALL', label: 'All Projects' },
  { id: 'PROPOSAL', label: 'Proposal' },
  { id: 'PROTOTYPE', label: 'Prototype' },
  { id: 'TESTING', label: 'Testing' },
  { id: 'PILOT', label: 'Pilot Active' },
  { id: 'DEPLOYED', label: 'Deployed' },
  { id: 'ARCHIVED', label: 'Archived' },
];

export default function ProjectsExplorerPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedStage !== 'ALL') {
        params.append('status', selectedStage);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '30');

      const res = await apiClient.request<{ items: ProjectListItem[]; total: number }>(
        `/api/v1/projects?${params.toString()}`
      );

      if (res.success && res.data) {
        setProjects(res.data.items || []);
        setTotalCount(res.data.total ?? (res.data.items || []).length);
      } else {
        // Fallback for empty/mocked responses
        setProjects([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to the projects service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedStage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Standardized PageHeader */}
        <PageHeader
          title="Academic & Institutional Projects"
          subtitle="Explore university R&D teams and multi-disciplinary labs transforming verified civic problems into deployable innovations."
          portalBadge={{ text: 'R&D Registry', variant: 'university' }}
          breadcrumbs={[
            { label: 'SICP', href: '/' },
            { label: 'Academic Projects' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/challenges">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Compass className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Explore Problems</span>
                </Button>
              </Link>
              <Link href="/university">
                <Button size="sm" className="gap-1.5 text-xs shadow-xs">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>University Portal</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Filters & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Stage Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {STAGES.map((stage) => {
              const isSelected = selectedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search projects or institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="text-xs h-9">
              Search
            </Button>
          </form>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading academic projects...</p>
          </div>
        ) : error ? (
          <ErrorState
            title="Unable to load projects"
            message={error}
            onRetry={fetchProjects}
          />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description={
              searchQuery || selectedStage !== 'ALL'
                ? 'No academic projects match the active search or stage filter. Try adjusting your search keywords or resetting filters.'
                : 'No projects have been initialized yet. Academic faculty and student teams can adopt verified civic problems to begin prototyping.'
            }
            actionLabel="Explore Civic Challenges"
            actionHref="/challenges"
            secondaryActionLabel={searchQuery || selectedStage !== 'ALL' ? 'Reset Filters' : undefined}
            onSecondaryAction={
              searchQuery || selectedStage !== 'ALL'
                ? () => {
                    setSelectedStage('ALL');
                    setSearchQuery('');
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="flex flex-col hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <StatusBadge status={project.status} size="sm" />
                    {project.leadingOrg && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                        {project.leadingOrg.name}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors line-clamp-1">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1 text-slate-500 dark:text-slate-400">
                    {project.description || 'No detailed project description provided.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col justify-between space-y-4">
                  {/* Linked Challenge Info */}
                  {project.challenge && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                        <Compass className="w-3.5 h-3.5 text-blue-500" />
                        <span>Addressing Civic Problem:</span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {project.challenge.title}
                      </p>
                      {project.challenge.category && (
                        <span className="inline-block text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          {project.challenge.category}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pipeline Counts */}
                  <div className="grid grid-cols-4 gap-1 text-center py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {project._count?.milestones ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Milestones</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {project._count?.prototypes ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Prototypes</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {project._count?.pilots ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Pilots</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {project._count?.deployments ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Deployed</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <Link href={`/projects/${project.id}`}>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs group-hover:text-blue-600">
                        <span>Open Cockpit</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
