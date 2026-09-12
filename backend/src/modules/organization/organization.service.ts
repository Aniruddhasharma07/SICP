import { prisma } from '../../database/prisma';
import { OrganizationDto, VerificationStatus, AuditAction, OrganizationType } from '@sicp/shared';
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { z } from 'zod';
import {
  createOrgSchema,
  submitVerificationSchema,
  reviewVerificationSchema,
  rateOrganizationSchema,
  resubmitVerificationSchema,
} from './organization.schemas';

export class OrganizationService {
  public static async create(
    data: z.infer<typeof createOrgSchema>,
    creatorId: string,
    context: { requestId: string; ipAddress?: string }
  ): Promise<OrganizationDto> {
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError(`Organization with slug '${data.slug}' already exists`);
    }

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug.toLowerCase(),
          type: data.type as unknown as import('@prisma/client').$Enums.OrganizationType,
          metadata: (data.metadata as object) || null,
        },
      });

      // Add creator as ADMIN member
      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId: creatorId,
          role: 'ADMIN',
        },
      });

      return created;
    });

    await AuditService.record({
      actorId: creatorId,
      action: AuditAction.ORG_CREATE,
      resource: 'Organization',
      resourceId: org.id,
      newState: { name: org.name, slug: org.slug, type: org.type },
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type as unknown as OrganizationType,
      status: org.status,
      verificationStatus: org.verificationStatus as unknown as VerificationStatus,
      metadata: org.metadata as Record<string, unknown> | null,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  public static async getById(id: string): Promise<any> {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization', id);
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type as unknown as OrganizationType,
      status: org.status,
      verificationStatus: org.verificationStatus as unknown as VerificationStatus,
      verificationDetails: org.verificationDetails as Record<string, unknown> | null,
      metadata: org.metadata as Record<string, unknown> | null,
      users: org.users,
      verifications: org.verifications,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  public static async list(
    filter: {
      type?: string;
      verificationStatus?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ items: any[]; total: number }> {
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const whereClause: any = {};

    if (filter.type) {
      whereClause.type = filter.type as any;
    }

    if (filter.verificationStatus) {
      whereClause.verificationStatus = filter.verificationStatus as any;
    }

    if (filter.search && filter.search.trim().length > 0) {
      whereClause.name = {
        contains: filter.search.trim(),
        mode: 'insensitive',
      };
    }

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where: whereClause,
        include: {
          users: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
            },
            take: 3,
          },
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.organization.count({ where: whereClause }),
    ]);

    const items = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      type: o.type as unknown as OrganizationType,
      status: o.status,
      verificationStatus: o.verificationStatus as unknown as VerificationStatus,
      verificationDetails: o.verificationDetails as Record<string, unknown> | null,
      metadata: o.metadata as Record<string, unknown> | null,
      users: o.users,
      verifications: o.verifications,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    return { items, total };
  }

  public static async getVerificationQueueStats(): Promise<{
    university: {
      pending: number;
      verified: number;
      informationRequested: number;
      rejected: number;
      total: number;
    };
    industry: {
      pending: number;
      verified: number;
      informationRequested: number;
      rejected: number;
      total: number;
    };
  }> {
    const [uniCounts, indCounts] = await Promise.all([
      prisma.organization.groupBy({
        by: ['verificationStatus'],
        where: { type: 'UNIVERSITY' as any },
        _count: { id: true },
      }),
      prisma.organization.groupBy({
        by: ['verificationStatus'],
        where: { type: { in: ['INDUSTRY', 'STARTUP', 'MSME', 'CSR'] as any } },
        _count: { id: true },
      }),
    ]);

    const parseCounts = (records: any[]) => {
      let pending = 0;
      let verified = 0;
      let informationRequested = 0;
      let rejected = 0;

      for (const r of records) {
        const count = r._count.id;
        if (r.verificationStatus === 'PENDING_REVIEW') pending += count;
        else if (r.verificationStatus === 'VERIFIED') verified += count;
        else if (r.verificationStatus === 'INFORMATION_REQUESTED') informationRequested += count;
        else if (r.verificationStatus === 'REJECTED') rejected += count;
      }

      return {
        pending,
        verified,
        informationRequested,
        rejected,
        total: pending + verified + informationRequested + rejected,
      };
    };

    return {
      university: parseCounts(uniCounts),
      industry: parseCounts(indCounts),
    };
  }

  public static async submitVerification(
    orgId: string,
    data: z.infer<typeof submitVerificationSchema>,
    actorId: string,
    context: { requestId: string; ipAddress?: string }
  ) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundError('Organization', orgId);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.organizationVerification.create({
        data: {
          organizationId: orgId,
          status: 'PENDING_REVIEW' as import('@prisma/client').$Enums.VerificationStatus,
          reviewNotes: data.notes || null,
          evidenceReferences: data.evidenceReferences,
        },
      });

      return await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: 'PENDING_REVIEW' as import('@prisma/client').$Enums.VerificationStatus,
        },
      });
    });

    await AuditService.record({
      actorId,
      action: AuditAction.ORG_VERIFICATION_SUBMIT,
      resource: 'Organization',
      resourceId: orgId,
      previousState: { verificationStatus: org.verificationStatus },
      newState: { verificationStatus: 'PENDING_REVIEW' },
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  public static async reviewVerification(
    orgId: string,
    data: z.infer<typeof reviewVerificationSchema>,
    reviewerId: string,
    context: { requestId: string; ipAddress?: string }
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { users: true },
    });
    if (!org) throw new NotFoundError('Organization', orgId);

    const reviewer = await prisma.user.findUnique({ where: { id: reviewerId } });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.organizationVerification.create({
        data: {
          organizationId: orgId,
          reviewerId,
          status: data.status as unknown as import('@prisma/client').$Enums.VerificationStatus,
          reviewNotes: data.reviewNotes,
        },
      });

      const updatedOrg = await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: data.status as unknown as import('@prisma/client').$Enums.VerificationStatus,
          verificationDetails: {
            lastReviewedAt: new Date().toISOString(),
            reviewerId,
            reviewerName: reviewer?.fullName || 'Government Reviewer',
            decision: data.status,
            reviewNotes: data.reviewNotes,
          },
        },
      });

      return updatedOrg;
    });

    await AuditService.record({
      actorId: reviewerId,
      action: AuditAction.ORG_VERIFY,
      resource: 'Organization',
      resourceId: orgId,
      previousState: { verificationStatus: org.verificationStatus },
      newState: { verificationStatus: data.status },
      reason: data.reviewNotes,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    // Notify organization admin users of the decision
    for (const adminUser of org.users) {
      let title = '';
      let message = '';
      let actionUrl = org.type === 'UNIVERSITY' ? '/university' : '/industry';

      if (data.status === VerificationStatus.VERIFIED) {
        title = `Organization Registration Verified: ${org.name}`;
        message = `Congratulations! Government review has officially verified ${org.name}. Your institution has full operational access to the portal.`;
      } else if (data.status === VerificationStatus.REJECTED) {
        title = `Organization Registration Rejected: ${org.name}`;
        message = `Your registration for ${org.name} was rejected by the Government reviewer. Reason: "${data.reviewNotes}". You can review, correct your information, and resubmit.`;
      } else if (data.status === VerificationStatus.INFORMATION_REQUESTED) {
        title = `Additional Information Requested: ${org.name}`;
        message = `Government reviewer requested additional details for ${org.name}: "${data.reviewNotes}". Please update your registration and resubmit.`;
      }

      await NotificationService.create({
        recipientId: adminUser.id,
        title,
        message,
        type: `ORG_VERIFICATION_${data.status}`,
        actionUrl,
        metadata: {
          organizationId: org.id,
          status: data.status,
          reviewNotes: data.reviewNotes,
        },
      }).catch(() => {});
    }

    return updated;
  }

  public static async resubmitVerification(
    orgId: string,
    data: z.infer<typeof resubmitVerificationSchema>,
    userId: string,
    context: { requestId: string; ipAddress?: string }
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });
    if (!org) throw new NotFoundError('Organization', orgId);

    // Check user is associated or an ADMIN member of the organization
    const isMember = org.members.some((m) => m.userId === userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!isMember && user?.organizationId !== orgId && user?.role !== 'SYSTEM_ADMIN') {
      throw new ForbiddenError('Only an administrator of this organization may resubmit verification');
    }

    const currentMetadata = (org.metadata as Record<string, any>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(data.metadata || {}),
      supportingDocuments: data.supportingDocuments || currentMetadata.supportingDocuments || [],
      resubmittedAt: new Date().toISOString(),
      resubmissionNotes: data.notes || 'Updated details provided by organization admin',
    };

    const updated = await prisma.$transaction(async (tx) => {
      await tx.organizationVerification.create({
        data: {
          organizationId: orgId,
          status: 'PENDING_REVIEW' as import('@prisma/client').$Enums.VerificationStatus,
          reviewNotes: data.notes || 'Updated registration resubmitted for government review',
          evidenceReferences: data.supportingDocuments || currentMetadata.supportingDocuments || [],
        },
      });

      return await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: 'PENDING_REVIEW' as import('@prisma/client').$Enums.VerificationStatus,
          metadata: updatedMetadata,
          verificationDetails: {
            resubmittedAt: new Date().toISOString(),
            status: 'PENDING_REVIEW',
            resubmissionNotes: data.notes || 'Updated registration submitted',
          },
        },
      });
    });

    await AuditService.record({
      actorId: userId,
      action: AuditAction.ORG_VERIFICATION_SUBMIT,
      resource: 'Organization',
      resourceId: orgId,
      previousState: { verificationStatus: org.verificationStatus },
      newState: { verificationStatus: 'PENDING_REVIEW' },
      reason: data.notes,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    // Notify government reviewers
    try {
      const govOfficers = await prisma.user.findMany({
        where: {
          role: { in: ['GOVERNMENT_OFFICER', 'SYSTEM_ADMIN'] as any },
          isActive: true,
        },
        select: { id: true },
        take: 10,
      });

      for (const gov of govOfficers) {
        await NotificationService.create({
          recipientId: gov.id,
          title: `Updated Registration Resubmitted: ${org.name}`,
          message: `The organization ${org.name} has provided updated details and resubmitted for verification.`,
          type: 'ORG_VERIFICATION_RESUBMITTED',
          actionUrl: '/government',
          metadata: { organizationId: org.id, organizationType: org.type },
        }).catch(() => {});
      }
    } catch {
      // Ignored
    }

    return updated;
  }

  public static async rateOrganization(
    orgId: string,
    data: z.infer<typeof rateOrganizationSchema>,
    reviewerId: string,
    context: { requestId: string; ipAddress?: string }
  ) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundError('Organization', orgId);

    const reviewer = await prisma.user.findUnique({ where: { id: reviewerId } });

    const existingMetadata = (org.metadata as Record<string, any>) || {};
    const existingRatings: any[] = Array.isArray(existingMetadata.ratings) ? existingMetadata.ratings : [];

    const score = Number(data.ratingScore ?? data.score ?? 80);
    const newRating = {
      id: `rate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ratingScore: score,
      dimensions: data.dimensions,
      reviewerId,
      reviewerName: reviewer?.fullName || 'Authorized Reviewer',
      reviewerRole: reviewer?.role || 'GOVERNMENT_OFFICER',
      reason: data.reason,
      evidenceUrl: data.evidenceUrl || undefined,
      evidenceReferences: data.evidenceReferences || [],
      relatedProjectIds: data.relatedProjectIds || [],
      timestamp: new Date().toISOString(),
    };

    const updatedRatings = [...existingRatings, newRating];
    const avgScore =
      Math.round((updatedRatings.reduce((acc, r) => acc + Number(r.ratingScore), 0) / updatedRatings.length) * 10) /
      10;

    const newMetadata = {
      ...existingMetadata,
      currentRatingScore: avgScore,
      lastRatingScore: score,
      ratingCount: updatedRatings.length,
      ratings: updatedRatings,
      lastRatedAt: new Date().toISOString(),
    };

    await prisma.organization.update({
      where: { id: orgId },
      data: { metadata: newMetadata },
    });

    await AuditService.record({
      actorId: reviewerId,
      action: AuditAction.ORG_VERIFY,
      resource: 'Organization',
      resourceId: orgId,
      previousState: { currentRatingScore: existingMetadata.currentRatingScore, ratingCount: existingRatings.length },
      newState: { currentRatingScore: avgScore, ratingCount: updatedRatings.length, latestRating: newRating },
      reason: data.reason,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return {
      organizationId: orgId,
      currentRatingScore: avgScore,
      ratingCount: updatedRatings.length,
      rating: newRating,
    };
  }
}
