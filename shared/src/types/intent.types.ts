import { ProblemIntentClassification, IntentNextAction } from '../enums/intent.enum';

export interface ProblemIntentSignals {
  meaningfulLanguage: boolean;
  societalContext: boolean;
  problemStatement: boolean;
  affectedPopulation: boolean;
  locationContext: boolean;
  actionableIssue: boolean;
}

export interface ProblemIntentResultDto {
  classification: ProblemIntentClassification;
  confidence: number;
  problemIntent: boolean;
  qualityScore: number;
  reason: string;
  missingContext: string[];
  validationMode: 'ai' | 'deterministic';
  signals: ProblemIntentSignals;
  suggestedClarification?: string;
  nextAction: IntentNextAction;
}

export interface ValidateIntentPayload {
  title: string;
  description: string;
  category?: string;
  district?: string;
  state?: string;
  languageHint?: string;
}
