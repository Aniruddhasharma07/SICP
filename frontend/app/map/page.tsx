'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { Loader2 } from 'lucide-react';

const GeospatialMap = dynamic(
  () => import('../../src/components/common/GeospatialMap').then(mod => mod.GeospatialMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[440px] bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span>Loading OpenStreetMap engine...</span>
        </div>
      </div>
    ),
  }
);

function MapContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geospatial Problem Hotspots"
        description="National map of citizen-reported civic challenges, severity clusters, and municipal infrastructure hotspots."
        badge="Live Geospatial Intelligence"
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <GeospatialMap initialCategory={category} />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <AppLayout portal="citizen">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        }
      >
        <MapContent />
      </Suspense>
    </AppLayout>
  );
}
