import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { ApiResponse, StandardErrorCode } from '@sicp/shared';

export interface FieldErrorMap {
  [fieldName: string]: string;
}

export interface FormattedValidationResult {
  summary: string;
  fieldErrors: FieldErrorMap;
  howToFix?: string;
}

/**
 * Friendly field name mapping for human-readable error messages.
 */
const FIELD_LABELS: Record<string, string> = {
  title: 'Problem Title',
  description: 'Problem Description',
  category: 'Problem Category',
  severity: 'Severity Level',
  priority: 'Priority Level',
  district: 'District',
  state: 'State',
  address: 'Specific Address / Locality',
  latitude: 'GPS Latitude',
  longitude: 'GPS Longitude',
  affectedPopulation: 'Estimated Affected Population',
  durationMonths: 'Problem Duration (Months)',
  email: 'Email Address',
  password: 'Password',
  fullName: 'Full Name',
  phoneNumber: 'Phone Number',
  outcomeType: 'Outcome Type',
  referenceIdentifier: 'Patent / Registration Number',
  verifiedBeneficiaries: 'Verified Beneficiaries',
  measurableImpactSummary: 'Impact Measurement Summary',
  justification: 'Routing Justification',
  rejectionReason: 'Reason for Action',
};

/**
 * Translates technical error messages into clear, actionable advice.
 */
export function formatFieldMessage(field: string, rawMessage: string): string {
  const label = FIELD_LABELS[field] || field;

  // Pattern matching common Zod / Prisma / API error templates
  if (rawMessage.includes('Required') || rawMessage.includes('expected string, received undefined')) {
    return `${label} is required. Please fill in this field to continue.`;
  }
  if (rawMessage.includes('at least') && rawMessage.includes('characters')) {
    const match = rawMessage.match(/at least (\d+) characters/);
    const count = match ? match[1] : 'required length';
    return `${label} must be at least ${count} characters to provide sufficient context.`;
  }
  if (rawMessage.includes('Invalid email') || rawMessage.includes('email')) {
    return 'Please enter a valid email address (e.g., name@domain.gov.in).';
  }
  if (rawMessage.includes('Invalid enum value')) {
    return `Please select a valid option for ${label}.`;
  }
  if (rawMessage.includes('Number must be greater than') || rawMessage.includes('positive')) {
    return `${label} must be a positive number.`;
  }
  if (rawMessage.includes('Number must be less than or equal to 90') || rawMessage.includes('latitude')) {
    return 'Please provide a valid latitude between -90 and 90 degrees.';
  }
  if (rawMessage.includes('Number must be less than or equal to 180') || rawMessage.includes('longitude')) {
    return 'Please provide a valid longitude between -180 and 180 degrees.';
  }

  // Return sanitized message with field label
  return `${label}: ${rawMessage}`;
}

/**
 * Extracts and formats structured field errors from an API response.
 */
export function extractValidationErrors(
  response: ApiResponse<unknown> | { error?: { code?: string; message?: string; details?: unknown } }
): FormattedValidationResult {
  const err = response?.error;
  if (!err) {
    return {
      summary: '',
      fieldErrors: {},
    };
  }

  const fieldErrors: FieldErrorMap = {};

  // Case 1: Backend Zod formatted details array: [{ field: 'title', message: '...' }]
  if (Array.isArray(err.details)) {
    for (const item of err.details) {
      if (item && typeof item === 'object' && 'field' in item && 'message' in item) {
        const fieldName = String(item.field);
        const rawMsg = String(item.message);
        fieldErrors[fieldName] = formatFieldMessage(fieldName, rawMsg);
      }
    }
  } else if (err.details && typeof err.details === 'object') {
    // Case 2: Key-value map of field errors
    for (const [key, val] of Object.entries(err.details)) {
      if (typeof val === 'string') {
        fieldErrors[key] = formatFieldMessage(key, val);
      } else if (Array.isArray(val) && val.length > 0) {
        fieldErrors[key] = formatFieldMessage(key, String(val[0]));
      }
    }
  }

  // High-level human-readable summary
  let summary = 'Please check the highlighted fields below to continue.';
  let howToFix = 'Review the requirements for each highlighted field and submit again.';

  if (err.code === StandardErrorCode.VALIDATION_ERROR) {
    const errorCount = Object.keys(fieldErrors).length;
    if (errorCount === 1) {
      const singleField = Object.keys(fieldErrors)[0];
      summary = fieldErrors[singleField];
      howToFix = 'Correct the value above and submit.';
    } else if (errorCount > 1) {
      summary = `Please resolve ${errorCount} incomplete or invalid fields before submitting.`;
      howToFix = 'Ensure all required fields are filled with valid information.';
    } else if (err.message && !err.message.includes('payload validation failed')) {
      summary = err.message;
    }
  } else if (err.code === StandardErrorCode.UNAUTHORIZED || (err.code as string) === 'UNAUTHENTICATED') {
    summary = 'Your session has expired or requires authentication. Please log in again.';
    howToFix = 'Click the profile button or navigate to the Login page.';
  } else if (err.code === StandardErrorCode.FORBIDDEN) {
    summary = 'You do not have administrative permissions to perform this action.';
    howToFix = 'Please switch to an authorized institutional account.';
  } else if (err.code === StandardErrorCode.CONFLICT) {
    summary = err.message || 'This record or assignment already exists.';
    howToFix = 'Refresh the page to view current state or modify your input.';
  } else if (err.code === StandardErrorCode.NOT_FOUND) {
    summary = err.message || 'The requested resource could not be found.';
    howToFix = 'The item may have been modified or reassigned. Please refresh.';
  } else if (err.code === StandardErrorCode.DEPENDENCY_UNAVAILABLE) {
    summary = 'Service temporarily unavailable. The platform is attempting automatic reconnection.';
    howToFix = 'Please wait a moment and try again.';
  } else if (err.message) {
    summary = err.message;
  }

  return {
    summary,
    fieldErrors,
    howToFix,
  };
}

/**
 * Reusable inline field error component.
 */
export function FormFieldError({
  message,
  className = '',
}: {
  message?: string | null;
  className?: string;
}): React.ReactElement | null {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-rose-600 animate-in fade-in duration-200 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Reusable field guidance / hint component.
 */
export function FormFieldHint({
  hint,
  className = '',
}: {
  hint?: string | null;
  className?: string;
}): React.ReactElement | null {
  if (!hint) return null;

  return (
    <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500 ${className}`}>
      <HelpCircle className="w-3 h-3 shrink-0 text-slate-400" />
      <span>{hint}</span>
    </div>
  );
}
