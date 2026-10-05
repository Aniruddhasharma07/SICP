import { prisma } from './prisma';
import { logger } from '../utils/logger';

export async function ensureDatabaseSchemaSynchronized(): Promise<void> {
  try {
    logger.info('[SCHEMA_SYNC] Verifying database schema integrity...');

    // 0. Ensure PostGIS Extension
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
      logger.info('[SCHEMA_SYNC] PostGIS extension verified/activated.');
    } catch (err: any) {
      logger.warn('[SCHEMA_SYNC] PostGIS extension activation notice: ' + err.message);
    }

    logger.info('[SCHEMA_SYNC] Synchronizing forward database schema for Problem & Geospatial architecture...');

    // 1. Enums
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CitizenProblemStatus') THEN
          CREATE TYPE "CitizenProblemStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'GROUPED', 'CHALLENGE_CREATED', 'RESOLVED', 'REJECTED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GovernanceDecisionType') THEN
          CREATE TYPE "GovernanceDecisionType" AS ENUM ('REJECT_RELATIONSHIP', 'REMOVE_FROM_GROUP', 'SPLIT_TO_NEW_CHALLENGE', 'MANUAL_MERGE', 'OVERRIDE_SEVERITY', 'OVERRIDE_PRIORITY');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GovernanceScope') THEN
          CREATE TYPE "GovernanceScope" AS ENUM ('PROBLEM_GROUP', 'GROUP_CHALLENGE', 'RELATIONSHIP');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OutcomeClassification') THEN
          CREATE TYPE "OutcomeClassification" AS ENUM ('PREVIOUSLY_WORKED', 'NOT_WORKED', 'MIXED_OUTCOME', 'INSUFFICIENT_EVIDENCE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PopulationProvenanceStatus') THEN
          CREATE TYPE "PopulationProvenanceStatus" AS ENUM ('KNOWN', 'UNKNOWN');
        END IF;
      END $$;
    `);

    // 2. Enum value additions
    const enumAdditions = [
      'GOVERNMENT_VERIFIED',
      'GOVERNMENT_APPROVED',
      'GOVERNMENT_REVIEW',
      'PEOPLE_VERIFIED',
      'UNIVERSITY_ASSIGNED',
      'INDUSTRY_FUNDED',
      'OUTCOME_VERIFIED',
    ];
    for (const val of enumAdditions) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TYPE "ChallengeStatus" ADD VALUE IF NOT EXISTS '${val}';`);
      } catch (err) {
        logger.debug(`[SCHEMA_SYNC] ChallengeStatus value ${val} already exists or error: ${err}`);
      }
    }

    // Migrate any legacy status records to canonical statuses
    try {
      await prisma.$executeRawUnsafe(`UPDATE "Challenge" SET "status" = 'GOVERNMENT_VERIFIED' WHERE "status"::text = 'GOVERNMENT_APPROVED';`);
      await prisma.$executeRawUnsafe(`UPDATE "Challenge" SET "status" = 'UNDER_GOV_REVIEW' WHERE "status"::text = 'GOVERNMENT_REVIEW';`);
      await prisma.$executeRawUnsafe(`UPDATE "Challenge" SET "status" = 'OUTCOME_VERIFIED' WHERE "status"::text = 'PEOPLE_VERIFIED';`);
      await prisma.$executeRawUnsafe(`UPDATE "ChallengeTimeline" SET "fromStatus" = 'GOVERNMENT_VERIFIED' WHERE "fromStatus"::text = 'GOVERNMENT_APPROVED';`);
      await prisma.$executeRawUnsafe(`UPDATE "ChallengeTimeline" SET "toStatus" = 'GOVERNMENT_VERIFIED' WHERE "toStatus"::text = 'GOVERNMENT_APPROVED';`);
      await prisma.$executeRawUnsafe(`UPDATE "ChallengeTimeline" SET "fromStatus" = 'UNDER_GOV_REVIEW' WHERE "fromStatus"::text = 'GOVERNMENT_REVIEW';`);
      await prisma.$executeRawUnsafe(`UPDATE "ChallengeTimeline" SET "toStatus" = 'UNDER_GOV_REVIEW' WHERE "toStatus"::text = 'GOVERNMENT_REVIEW';`);
    } catch (migErr: any) {
      logger.debug(`[SCHEMA_SYNC] ChallengeStatus migration notice: ${migErr.message}`);
    }

    // 2b. Add columns if not exists
    const alterColumnStatements = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "recipientRole" TEXT;`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "portal" TEXT;`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "eventType" TEXT;`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "govSeverity" "SeverityLevel";`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "govPriority" "PriorityLevel";`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "govOverrideReason" TEXT;`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "govOverriddenAt" TIMESTAMP(3);`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "govOverriddenById" TEXT;`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;`,
      `ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;`,
    ];

    for (const stmt of alterColumnStatements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (colErr: any) {
        logger.debug(`[SCHEMA_SYNC] Column statement notice: ${colErr.message}`);
      }
    }

    // 3. Tables (Each as a separate statement)
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS "Problem" (
          "id" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "status" "CitizenProblemStatus" NOT NULL DEFAULT 'SUBMITTED',
          "aiSeverity" "SeverityLevel" NOT NULL DEFAULT 'MODERATE',
          "govSeverity" "SeverityLevel",
          "aiPriority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
          "govPriority" "PriorityLevel",
          "aiAffectedPopulation" INTEGER,
          "govAffectedPopulation" INTEGER,
          "populationStatus" "PopulationProvenanceStatus" NOT NULL DEFAULT 'UNKNOWN',
          "populationProvenance" TEXT,
          "overrideReason" TEXT,
          "overriddenAt" TIMESTAMP(3),
          "overriddenById" TEXT,
          "latitude" DOUBLE PRECISION,
          "longitude" DOUBLE PRECISION,
          "locationName" TEXT,
          "district" TEXT,
          "state" TEXT,
          "wardNumber" TEXT,
          "cityCorporation" TEXT,
          "submitterId" TEXT,
          "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
          "groupId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "ProblemGroup" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "canonicalCategory" TEXT NOT NULL,
          "relationshipStrength" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
          "factorBreakdown" JSONB,
          "challengeId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ProblemGroup_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "ProblemGroupMember" (
          "id" TEXT NOT NULL,
          "groupId" TEXT NOT NULL,
          "problemId" TEXT NOT NULL,
          "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProblemGroupMember_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "ChallengeProblem" (
          "id" TEXT NOT NULL,
          "challengeId" TEXT NOT NULL,
          "problemId" TEXT NOT NULL,
          "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ChallengeProblem_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "ChallengeGroup" (
          "id" TEXT NOT NULL,
          "challengeId" TEXT NOT NULL,
          "groupId" TEXT NOT NULL,
          "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ChallengeGroup_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "RelationshipGovernanceMemory" (
          "id" TEXT NOT NULL,
          "sourceEntityId" TEXT NOT NULL,
          "targetEntityId" TEXT NOT NULL,
          "scope" "GovernanceScope" NOT NULL,
          "decision" "GovernanceDecisionType" NOT NULL,
          "officerId" TEXT,
          "reason" TEXT NOT NULL,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RelationshipGovernanceMemory_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "GovernmentOverrideLog" (
          "id" TEXT NOT NULL,
          "problemId" TEXT NOT NULL,
          "officerId" TEXT,
          "field" TEXT NOT NULL,
          "previousValue" TEXT NOT NULL,
          "overriddenValue" TEXT NOT NULL,
          "reason" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "GovernmentOverrideLog_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "GroupSolutionMemory" (
          "id" TEXT NOT NULL,
          "groupId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "intervention" TEXT NOT NULL,
          "classification" "OutcomeClassification" NOT NULL,
          "evidenceSource" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "GroupSolutionMemory_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "StudentProfile" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "department" TEXT NOT NULL,
          "program" TEXT NOT NULL DEFAULT 'B.Tech',
          "yearOrSemester" TEXT NOT NULL DEFAULT '3rd Year',
          "rollNumber" TEXT,
          "gpa" DOUBLE PRECISION,
          "skills" TEXT[],
          "interests" TEXT[],
          "bio" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "ClarificationRequest" (
          "id" TEXT NOT NULL,
          "challengeId" TEXT,
          "groupId" TEXT,
          "problemId" TEXT,
          "targetScope" TEXT NOT NULL DEFAULT 'PROBLEM',
          "requestedById" TEXT NOT NULL,
          "question" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ClarificationRequest_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "ClarificationResponse" (
          "id" TEXT NOT NULL,
          "requestId" TEXT NOT NULL,
          "problemId" TEXT,
          "citizenId" TEXT NOT NULL,
          "response" TEXT NOT NULL,
          "evidenceFileKey" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ClarificationResponse_pkey" PRIMARY KEY ("id")
      );`,
    ];

    for (const stmt of tableStatements) {
      await prisma.$executeRawUnsafe(stmt);
    }

    // 4. Indexes (Each as a separate statement)
    const indexStatements = [
      `CREATE UNIQUE INDEX IF NOT EXISTS "Problem_code_key" ON "Problem"("code");`,
      `CREATE INDEX IF NOT EXISTS "Problem_status_idx" ON "Problem"("status");`,
      `CREATE INDEX IF NOT EXISTS "Problem_category_idx" ON "Problem"("category");`,
      `CREATE INDEX IF NOT EXISTS "Problem_district_state_idx" ON "Problem"("district", "state");`,
      `CREATE INDEX IF NOT EXISTS "Problem_groupId_idx" ON "Problem"("groupId");`,
      `CREATE INDEX IF NOT EXISTS "ProblemGroup_canonicalCategory_idx" ON "ProblemGroup"("canonicalCategory");`,
      `CREATE INDEX IF NOT EXISTS "ProblemGroup_challengeId_idx" ON "ProblemGroup"("challengeId");`,
      `CREATE INDEX IF NOT EXISTS "ProblemGroupMember_groupId_idx" ON "ProblemGroupMember"("groupId");`,
      `CREATE INDEX IF NOT EXISTS "ProblemGroupMember_problemId_idx" ON "ProblemGroupMember"("problemId");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ProblemGroupMember_groupId_problemId_key" ON "ProblemGroupMember"("groupId", "problemId");`,
      `CREATE INDEX IF NOT EXISTS "ChallengeProblem_challengeId_idx" ON "ChallengeProblem"("challengeId");`,
      `CREATE INDEX IF NOT EXISTS "ChallengeProblem_problemId_idx" ON "ChallengeProblem"("problemId");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeProblem_challengeId_problemId_key" ON "ChallengeProblem"("challengeId", "problemId");`,
      `CREATE INDEX IF NOT EXISTS "ChallengeGroup_challengeId_idx" ON "ChallengeGroup"("challengeId");`,
      `CREATE INDEX IF NOT EXISTS "ChallengeGroup_groupId_idx" ON "ChallengeGroup"("groupId");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeGroup_challengeId_groupId_key" ON "ChallengeGroup"("challengeId", "groupId");`,
      `CREATE INDEX IF NOT EXISTS "RelationshipGovernanceMemory_sourceEntityId_idx" ON "RelationshipGovernanceMemory"("sourceEntityId");`,
      `CREATE INDEX IF NOT EXISTS "RelationshipGovernanceMemory_targetEntityId_idx" ON "RelationshipGovernanceMemory"("targetEntityId");`,
      `CREATE INDEX IF NOT EXISTS "RelationshipGovernanceMemory_active_idx" ON "RelationshipGovernanceMemory"("active");`,
      `CREATE INDEX IF NOT EXISTS "GovernmentOverrideLog_problemId_idx" ON "GovernmentOverrideLog"("problemId");`,
      `CREATE INDEX IF NOT EXISTS "GroupSolutionMemory_groupId_idx" ON "GroupSolutionMemory"("groupId");`,
      `CREATE INDEX IF NOT EXISTS "GroupSolutionMemory_classification_idx" ON "GroupSolutionMemory"("classification");`,
      `CREATE INDEX IF NOT EXISTS "idx_challenge_geography_gist" ON "Challenge" USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_userId_key" ON "StudentProfile"("userId");`,
      `CREATE INDEX IF NOT EXISTS "StudentProfile_department_idx" ON "StudentProfile"("department");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationRequest_challengeId_idx" ON "ClarificationRequest"("challengeId");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationRequest_groupId_idx" ON "ClarificationRequest"("groupId");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationRequest_problemId_idx" ON "ClarificationRequest"("problemId");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationRequest_requestedById_idx" ON "ClarificationRequest"("requestedById");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationRequest_status_idx" ON "ClarificationRequest"("status");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationResponse_requestId_idx" ON "ClarificationResponse"("requestId");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationResponse_problemId_idx" ON "ClarificationResponse"("problemId");`,
      `CREATE INDEX IF NOT EXISTS "ClarificationResponse_citizenId_idx" ON "ClarificationResponse"("citizenId");`,
      `CREATE INDEX IF NOT EXISTS "Notification_recipientRole_idx" ON "Notification"("recipientRole");`,
      `CREATE INDEX IF NOT EXISTS "Notification_portal_idx" ON "Notification"("portal");`,
      `CREATE INDEX IF NOT EXISTS "Notification_organizationId_idx" ON "Notification"("organizationId");`,
      `CREATE INDEX IF NOT EXISTS "Challenge_govPriority_idx" ON "Challenge"("govPriority");`,
      `CREATE INDEX IF NOT EXISTS "User_approvalStatus_idx" ON "User"("approvalStatus");`,
    ];

    for (const stmt of indexStatements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (idxErr: any) {
        logger.debug(`[SCHEMA_SYNC] Index statement notice (${idxErr.message})`);
      }
    }

    // 5. Foreign Key Constraints (Protected in DO block)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Problem_groupId_fkey') THEN
          ALTER TABLE "Problem" ADD CONSTRAINT "Problem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProblemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProblemGroup_challengeId_fkey') THEN
          ALTER TABLE "ProblemGroup" ADD CONSTRAINT "ProblemGroup_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProblemGroupMember_groupId_fkey') THEN
          ALTER TABLE "ProblemGroupMember" ADD CONSTRAINT "ProblemGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProblemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProblemGroupMember_problemId_fkey') THEN
          ALTER TABLE "ProblemGroupMember" ADD CONSTRAINT "ProblemGroupMember_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeProblem_challengeId_fkey') THEN
          ALTER TABLE "ChallengeProblem" ADD CONSTRAINT "ChallengeProblem_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeProblem_problemId_fkey') THEN
          ALTER TABLE "ChallengeProblem" ADD CONSTRAINT "ChallengeProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeGroup_challengeId_fkey') THEN
          ALTER TABLE "ChallengeGroup" ADD CONSTRAINT "ChallengeGroup_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeGroup_groupId_fkey') THEN
          ALTER TABLE "ChallengeGroup" ADD CONSTRAINT "ChallengeGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProblemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GovernmentOverrideLog_problemId_fkey') THEN
          ALTER TABLE "GovernmentOverrideLog" ADD CONSTRAINT "GovernmentOverrideLog_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupSolutionMemory_groupId_fkey') THEN
          ALTER TABLE "GroupSolutionMemory" ADD CONSTRAINT "GroupSolutionMemory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProblemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentProfile_userId_fkey') THEN
          ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationRequest_challengeId_fkey') THEN
          ALTER TABLE "ClarificationRequest" ADD CONSTRAINT "ClarificationRequest_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationRequest_groupId_fkey') THEN
          ALTER TABLE "ClarificationRequest" ADD CONSTRAINT "ClarificationRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProblemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationRequest_problemId_fkey') THEN
          ALTER TABLE "ClarificationRequest" ADD CONSTRAINT "ClarificationRequest_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationRequest_requestedById_fkey') THEN
          ALTER TABLE "ClarificationRequest" ADD CONSTRAINT "ClarificationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationResponse_requestId_fkey') THEN
          ALTER TABLE "ClarificationResponse" ADD CONSTRAINT "ClarificationResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ClarificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationResponse_problemId_fkey') THEN
          ALTER TABLE "ClarificationResponse" ADD CONSTRAINT "ClarificationResponse_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClarificationResponse_citizenId_fkey') THEN
          ALTER TABLE "ClarificationResponse" ADD CONSTRAINT "ClarificationResponse_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    logger.info('[SCHEMA_SYNC] Database schema synchronized successfully.');
  } catch (error) {
    logger.error('[SCHEMA_SYNC] Schema synchronization warning (continuing):', error);
  }
}
