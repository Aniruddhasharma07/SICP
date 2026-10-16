import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import completeBackupData from './sicp-complete-backup.json';

// Restoration order strictly adhering to foreign key dependencies
const insertOrder = [
  'Organization',
  'User',
  'OrganizationMember',
  'StudentProfile',
  'FacultyProfile',
  'IndustryPartnerProfile',
  'RefreshSession',
  'Challenge',
  'Problem',
  'ProblemGroup',
  'ProblemGroupMember',
  'ChallengeProblem',
  'ChallengeGroup',
  'ChallengeEvidence',
  'ChallengeSLA',
  'CommunityVote',
  'UniversityMatch',
  'MultidisciplinaryTeam',
  'TeamMember',
  'Project',
  'ProjectProposal',
  'ProjectMilestone',
  'IndustryPartnership',
  'InnovationOutcome',
  'SolutionMemory',
  'GroupSolutionMemory',
  'RelationshipGovernanceMemory',
  'AIAnalysis',
  'AuditLog',
  'Notification',
  'IdempotencyRecord',
  'ClarificationRequest',
  'ClarificationResponse'
];

export async function restoreUniverseBackup(): Promise<{
  success: boolean;
  totalRestored: number;
  modelCounts: Record<string, number>;
  errors: Record<string, string>;
}> {
  logger.info('[RESTORE_BACKUP] Initiating comprehensive universe data restoration...');

  logger.info('[RESTORE_BACKUP] Using embedded platform backup dataset...');
  const backup: any = completeBackupData;

  // Detect DateTime fields from DMMF to cast ISO strings to Date objects
  const dmmf = Prisma.dmmf.datamodel.models;
  const dateTimeFieldsByModel: Record<string, Set<string>> = {};
  for (const model of dmmf) {
    const dtFields = new Set<string>();
    for (const field of model.fields) {
      if (field.type === 'DateTime') {
        dtFields.add(field.name);
      }
    }
    dateTimeFieldsByModel[model.name] = dtFields;
  }

  let totalRestored = 0;
  const modelCounts: Record<string, number> = {};
  // Reconcile placeholder organization slugs that conflict with canonical backup IDs
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "Organization" SET "slug" = 'iit-bombay-seed' WHERE "id" = 'org-univ-iitb' AND "slug" = 'iit-bombay';
      UPDATE "Organization" SET "slug" = 'iit-delhi-seed' WHERE "id" = 'org-univ-iitd' AND "slug" = 'iit-delhi';
    `);
    logger.info('[RESTORE_BACKUP] Conflicting organization slugs successfully reconciled.');
  } catch (reconcileErr: any) {
    logger.debug('[RESTORE_BACKUP] Org slug reconciliation notice: ' + reconcileErr.message);
  }

  const errors: Record<string, string> = {};

  for (const modelName of insertOrder) {
    const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const rows: any[] = backup[modelName];

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    const dtFields = dateTimeFieldsByModel[modelName] || new Set();
    const convertedRows = rows.map(row => {
      const copy = { ...row };
      delete (copy as any).embedding;
      for (const field of dtFields) {
        if (copy[field] && typeof copy[field] === 'string') {
          copy[field] = new Date(copy[field]);
        }
      }
      return copy;
    });

    const prismaModel = (prisma as any)[key];
    if (!prismaModel) {
      logger.warn(`[RESTORE_BACKUP] Prisma model not found on client: ${key}`);
      continue;
    }

    let restoredForModel = 0;
    try {
      if (typeof prismaModel.createMany === 'function') {
        const res = await prismaModel.createMany({
          data: convertedRows,
          skipDuplicates: true
        });
        restoredForModel = res.count ?? convertedRows.length;
        logger.info(`[RESTORE_BACKUP] ✅ ${modelName}: Restored ${restoredForModel} records via createMany`);
      } else {
        throw new Error('createMany not supported for model: ' + modelName);
      }
    } catch (bulkErr: any) {
      logger.warn(`[RESTORE_BACKUP] ⚠️ createMany failed for ${modelName} (${bulkErr.message}). Attempting row-by-row fallback...`);
      for (const row of convertedRows) {
        try {
          await prismaModel.create({ data: row });
          restoredForModel++;
        } catch (singleErr: any) {
          // If error is duplicate key or constraint, attempt update or ignore
          if (!singleErr.message?.includes('Unique constraint')) {
            errors[modelName] = singleErr.message;
          }
        }
      }
      logger.info(`[RESTORE_BACKUP] 🔄 ${modelName}: Restored ${restoredForModel} records via row fallback`);
    }

    modelCounts[modelName] = restoredForModel;
    totalRestored += restoredForModel;
  }

  logger.info(`[RESTORE_BACKUP] 🎉 Universe restoration finished! Total restored: ${totalRestored} records across ${Object.keys(modelCounts).length} models.`);
  return {
    success: true,
    totalRestored,
    modelCounts,
    errors
  };
}

// Allow direct execution
if (require.main === module) {
  restoreUniverseBackup()
    .then(res => {
      console.log('Restoration completed successfully:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Restoration failed:', err);
      process.exit(1);
    });
}
