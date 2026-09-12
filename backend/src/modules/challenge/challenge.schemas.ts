import { z } from 'zod';
import { ChallengeStatus, PriorityLevel, SeverityLevel } from '@sicp/shared';

export const challengeEvidenceInputSchema = z.object({
  fileKey: z.string().optional(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative().optional(),
  base64Data: z.string().optional(),
  storageBucket: z.string().optional(),
});

export const createChallengeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().min(2, 'Category is required'),
  severity: z.nativeEnum(SeverityLevel).default(SeverityLevel.MODERATE),
  priority: z.nativeEnum(PriorityLevel).default(PriorityLevel.MEDIUM),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  address: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  affectedPopulation: z.number().int().min(0).optional().nullable(),
  durationMonths: z.number().int().min(0).optional().nullable(),
  tags: z.array(z.string()).optional(),
  impactInputs: z.record(z.any()).optional(),
  evidence: z.array(challengeEvidenceInputSchema).optional(),
  transcribedAudio: z.string().optional().nullable(),
  audioData: z.string().optional().nullable(),
  audioMimeType: z.string().optional().nullable(),
  images: z.array(z.any()).optional(),
  videoKeyframes: z.array(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  modalitiesProvided: z.array(z.string()).optional(),
  aiAnalysisResult: z.record(z.any()).optional(),
});

export const transitionChallengeSchema = z.object({
  toStatus: z.nativeEnum(ChallengeStatus),
  expectedVersion: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

export const checkDuplicatesSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.string(),
  district: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  village: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const mergeSystemicSchema = z.object({
  sourceChallengeIds: z.array(z.string().uuid()).min(2, 'At least two challenges required for systemic merge'),
  systemicTitle: z.string().min(5),
  systemicDescription: z.string().min(20),
  category: z.string(),
  district: z.string(),
  state: z.string(),
  reason: z.string().min(10, 'A detailed justification is required for merging challenges'),
});

export const analyzeChallengeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().min(2, 'Category is required'),
  district: z.string().optional(),
  state: z.string().optional(),
  affectedPopulation: z.number().int().min(0).optional(),
  durationMonths: z.number().int().min(0).optional(),
  transcribedAudio: z.string().optional().nullable(),
  audioData: z.string().optional().nullable(),
  audioMimeType: z.string().optional().nullable(),
  images: z.array(z.any()).optional(),
  videoKeyframes: z.array(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  modalitiesProvided: z.array(z.string()).optional(),
});

export const validateIntentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(2000).optional().default(''),
  category: z.string().optional(),
  language: z.string().optional(),
});


