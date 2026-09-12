import { z } from 'zod';
import { UserRole, OrganizationType } from '@sicp/shared';

export const orgRegistrationPayloadSchema = z.object({
  name: z.string({ required_error: 'Organization name is required' }).trim().min(2, 'Organization name must be at least 2 characters'),
  type: z.nativeEnum(OrganizationType).optional(),
  sector: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  district: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  officialEmail: z.string().trim().email('Invalid official contact email format').optional().nullable().or(z.literal('')),
  contactPhone: z.string().trim().optional().nullable(),
  accreditationDetails: z.string().trim().optional().nullable(),
  registrationNumber: z.string().trim().optional().nullable(),
  departments: z.array(z.string()).optional(),
  researchDomains: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  supportingDocuments: z.array(z.any()).optional(),
});

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().optional().nullable(),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Please select a valid account role' }),
  }).default(UserRole.CITIZEN),
  organizationId: z
    .string()
    .trim()
    .uuid('Invalid organization ID format')
    .optional()
    .nullable()
    .or(z.literal('')),
  organization: orgRegistrationPayloadSchema.optional().nullable(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase()),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});
