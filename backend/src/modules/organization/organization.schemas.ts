import { z } from 'zod';
import { OrganizationType, VerificationStatus } from '@sicp/shared';

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.nativeEnum(OrganizationType),
  metadata: z.record(z.unknown()).optional(),
});

export const submitVerificationSchema = z.object({
  evidenceReferences: z.array(z.any()).min(1, 'At least one evidence document reference is required'),
  notes: z.string().optional(),
});

export const reviewVerificationSchema = z.object({
  status: z.enum([
    VerificationStatus.VERIFIED,
    VerificationStatus.REJECTED,
    VerificationStatus.INFORMATION_REQUESTED,
  ]),
  reviewNotes: z.string().min(3, 'Review notes or reason must be provided (at least 3 characters)'),
});

export const resubmitVerificationSchema = z.object({
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  supportingDocuments: z.array(z.any()).optional(),
});

export const rateOrganizationSchema = z.object({
  ratingScore: z.number().min(1).max(100).optional(),
  score: z.number().min(1).max(100).optional(),
  dimensions: z.union([
    z.object({
      technicalCompetence: z.number().min(1).max(100),
      timeliness: z.number().min(1).max(100),
      collaboration: z.number().min(1).max(100),
      outcomeQuality: z.number().min(1).max(100),
    }),
    z.array(z.object({
      dimensionName: z.string(),
      score: z.number(),
      weight: z.number().optional(),
    })),
    z.record(z.any()),
  ]),
  reason: z.string().min(3, 'Reason must be at least 3 characters with evidence'),
  evidenceUrl: z.string().optional(),
  evidenceReferences: z.array(z.string()).optional(),
  relatedProjectIds: z.array(z.string()).optional(),
});
