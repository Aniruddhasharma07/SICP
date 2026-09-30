import crypto from 'crypto';
import { prisma } from '../../database/prisma';
import { UserRole } from '@sicp/shared';
import { ChallengeIntelligenceOrchestrator } from '../intelligence/challenge-intelligence.orchestrator';
import { logger } from '../../utils/logger';

export interface CitizenIntakePayload {
  channel: 'WEB' | 'WHATSAPP' | 'VOICE_ASSISTANT';
  senderId: string; // Phone number or citizen user id
  senderName?: string;
  title: string;
  description: string;
  category?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  mediaUrls?: string[];
  rawMessageId?: string;
  metadata?: Record<string, unknown>;
}

export interface CitizenChannelResponse {
  success: boolean;
  challengeId: string;
  referenceCode: string;
  replyMessage: string;
  channel: string;
}

export interface ICitizenChannelAdapter {
  readonly channelName: string;
  validateWebhook(headers: Record<string, any>, rawBody?: string | Buffer): Promise<boolean>;
  processMessage(payload: CitizenIntakePayload, requestId: string): Promise<CitizenChannelResponse>;
}

export class WebChannelAdapter implements ICitizenChannelAdapter {
  public readonly channelName = 'WEB';

  public async validateWebhook(): Promise<boolean> {
    return true; // Web channel is authenticated via JWT middleware
  }

  public async processMessage(
    payload: CitizenIntakePayload,
    requestId: string
  ): Promise<CitizenChannelResponse> {
    const referenceCode = `SICP-WEB-${Date.now().toString(36).toUpperCase()}`;

    // Resolve or find citizen user
    let user = await prisma.user.findFirst({
      where: { id: payload.senderId },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: UserRole.CITIZEN },
      });
    }

    if (!user) {
      throw new Error('No registered citizen user available to anchor submission.');
    }

    const challenge = await prisma.challenge.create({
      data: {
        title: payload.title,
        description: payload.description,
        category: payload.category || 'General Civic Infrastructure',
        district: payload.district || null,
        state: payload.state || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        status: 'SUBMITTED',
        submitterId: user.id,
      },
    });

    // Run AI Intelligence asynchronously in background without blocking intake response
    ChallengeIntelligenceOrchestrator.processChallengeIntelligence(challenge.id, requestId).catch((err) => {
      logger.error(`Async intelligence orchestration error for web intake ${challenge.id}: ${err.message}`);
    });

    return {
      success: true,
      challengeId: challenge.id,
      referenceCode,
      replyMessage: `Challenge registered successfully under reference ${referenceCode}.`,
      channel: this.channelName,
    };
  }
}

export class WhatsAppChannelAdapter implements ICitizenChannelAdapter {
  public readonly channelName = 'WHATSAPP';
  private readonly verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'sicp_whatsapp_verify_token_2026';
  private readonly appSecret = process.env.WHATSAPP_APP_SECRET || '';

  /**
   * Validates Meta WhatsApp Webhook HMAC signature or verification token
   */
  public async validateWebhook(
    headers: Record<string, any>,
    rawBody?: string | Buffer
  ): Promise<boolean> {
    // If webhook signature is present and app secret is configured, verify HMAC
    const signature = headers['x-hub-signature-256'] as string | undefined;
    if (this.appSecret && signature && rawBody) {
      const hmac = crypto.createHmac('sha256', this.appSecret);
      const expected = `sha256=${hmac.update(rawBody).digest('hex')}`;
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    }

    // In local dev/test or when unconfigured, accept valid simulated intake
    return true;
  }

  /**
   * Webhook verification challenge handler (GET /webhook)
   */
  public verifySubscription(mode: string | undefined, token: string | undefined, challenge: string | undefined): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge || null;
    }
    return null;
  }

  /**
   * Processes incoming WhatsApp citizen complaint message idempotently
   */
  public async processMessage(
    payload: CitizenIntakePayload,
    requestId: string
  ): Promise<CitizenChannelResponse> {
    const rawMsgId = payload.rawMessageId || `wa-${Date.now()}`;
    const cleanPhone = payload.senderId.replace(/[^\d+]/g, '');
    const referenceCode = `SICP-WA-${rawMsgId.slice(-6).toUpperCase()}`;

    // 1. Idempotency Check: Do not duplicate if this WhatsApp message was already received
    const existing = await prisma.challenge.findFirst({
      where: {
        description: { contains: `[WhatsApp: ${rawMsgId}]` },
      },
    });

    if (existing) {
      logger.info(`Idempotent replay detected for WhatsApp message ${rawMsgId}`);
      return {
        success: true,
        challengeId: existing.id,
        referenceCode,
        replyMessage: `आपकी शिकायत पहले ही दर्ज है। संदर्भ संख्या: REF-${existing.id.slice(0, 8).toUpperCase()}.\n\nYour issue is already registered under REF-${existing.id.slice(0, 8).toUpperCase()}.`,
        channel: this.channelName,
      };
    }

    // 2. Resolve or create citizen user for phone number
    let citizenUser = await prisma.user.findFirst({
      where: { phone: cleanPhone },
    });

    if (!citizenUser) {
      const email = `citizen.${cleanPhone.replace('+', '')}@sicp.civic.local`;
      citizenUser = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          fullName: payload.senderName || `WhatsApp Citizen (${cleanPhone})`,
          phone: cleanPhone,
          role: UserRole.CITIZEN,
          passwordHash: 'NOPASSWORD_WHATSAPP_CHANNEL',
        },
        update: {},
      });
    }

    // 3. Create Challenge in Prisma with zero-dead-end initial state
    const challenge = await prisma.challenge.create({
      data: {
        title: payload.title.slice(0, 150),
        description: `${payload.description}\n\n[WhatsApp: ${rawMsgId}] [Sender: ${cleanPhone}]`,
        category: payload.category || 'General Civic Infrastructure',
        district: payload.district || null,
        state: payload.state || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        status: 'SUBMITTED',
        submitterId: citizenUser.id,
      },
    });

    // 4. Attach any media URLs submitted via WhatsApp
    if (payload.mediaUrls && payload.mediaUrls.length > 0) {
      for (const url of payload.mediaUrls) {
        await prisma.challengeEvidence.create({
          data: {
            challengeId: challenge.id,
            fileKey: url,
            originalName: 'whatsapp_media_attachment',
            mimeType: url.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
            sizeBytes: 1024,
            storageBucket: 'whatsapp-intake',
            uploadedById: citizenUser.id,
          },
        }).catch((e) => logger.warn(`Could not attach media: ${e.message}`));
      }
    }

    // 5. Trigger post-submission Intelligence Pipeline asynchronously
    ChallengeIntelligenceOrchestrator.processChallengeIntelligence(challenge.id, requestId).catch((err) => {
      logger.error(`Async intelligence orchestration error for WhatsApp intake ${challenge.id}: ${err.message}`);
    });

    const shortRef = `REF-${challenge.id.slice(0, 8).toUpperCase()}`;
    const replyMessage = `धन्यवाद! आपकी समस्या SICP पोर्टल पर दर्ज कर ली गई है।\nसंदर्भ संख्या: ${shortRef}\nनगर निगम एवं संबंधित विभाग द्वारा समीक्षा की जा रही है।\n\nThank you! Your issue has been registered on SICP.\nReference: ${shortRef}\nMunicipal authorities have been alerted.`;

    return {
      success: true,
      challengeId: challenge.id,
      referenceCode: shortRef,
      replyMessage,
      channel: this.channelName,
    };
  }
}

export class CitizenChannelFactory {
  private static adapters: Map<string, ICitizenChannelAdapter> = new Map<string, ICitizenChannelAdapter>([
    ['WEB', new WebChannelAdapter()],
    ['WHATSAPP', new WhatsAppChannelAdapter()],
  ]);

  public static getAdapter(channel: string): ICitizenChannelAdapter {
    const key = channel.toUpperCase().trim();
    return this.adapters.get(key) || this.adapters.get('WEB')!;
  }
}
