'use client';

import React from 'react';

export interface ExecutiveDemoControlsProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onReset?: () => void;
  isLoading?: boolean;
  scenarioId?: string;
  onScenarioChange?: (scenarioId: string) => void;
}

export function ExecutiveDemoControls(_props: ExecutiveDemoControlsProps) {
  return null;
}
