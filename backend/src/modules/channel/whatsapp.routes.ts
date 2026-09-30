import { Router, Request, Response } from 'express';
import { WhatsAppChannelAdapter } from '../../domain/channels/citizen-channel.adapter';
import { logger } from '../../utils/logger';

export const channelRouter = Router();
const whatsAppAdapter = new WhatsAppChannelAdapter();

/**
 * Meta WhatsApp Webhook Subscription Verification
 */
channelRouter.get('/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const verifiedChallenge = whatsAppAdapter.verifySubscription(mode, token, challenge);
  if (verifiedChallenge) {
    logger.info('WhatsApp webhook verified successfully');
    res.status(200).send(verifiedChallenge);
  } else {
    logger.warn('WhatsApp webhook verification rejected: Invalid token');
    res.status(403).send('Forbidden');
  }
});

/**
 * Meta WhatsApp Webhook Incoming Message Intake
 */
channelRouter.post('/whatsapp/webhook', async (req: Request, res: Response) => {
  const requestId = (res.locals.requestId as string) || `req-wa-${Date.now()}`;

  try {
    const isValid = await whatsAppAdapter.validateWebhook(req.headers, JSON.stringify(req.body));
    if (!isValid) {
      res.status(401).json({ error: 'Invalid HMAC signature' });
      return;
    }

    const body = req.body;
    // Extract standard Meta WhatsApp cloud API webhook structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Non-message event (e.g. delivery receipts, read statuses)
      res.status(200).json({ status: 'ACKNOWLEDGED' });
      return;
    }

    const senderPhone = message.from || 'unknown';
    const rawMsgId = message.id;
    let title = 'Citizen Issue Report via WhatsApp';
    let description = 'WhatsApp community report.';
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (message.type === 'text') {
      const text = message.text?.body || '';
      description = text;
      title = text.length > 50 ? `${text.slice(0, 47)}...` : text;
    } else if (message.type === 'location') {
      latitude = message.location?.latitude;
      longitude = message.location?.longitude;
      description = `Citizen reported issue at GPS location (${latitude}, ${longitude}). ${message.location?.name || ''} ${message.location?.address || ''}`;
      title = `Location Report: ${message.location?.name || 'Municipal Coordinates'}`;
    }

    const response = await whatsAppAdapter.processMessage(
      {
        channel: 'WHATSAPP',
        senderId: senderPhone,
        title,
        description,
        latitude,
        longitude,
        rawMessageId: rawMsgId,
      },
      requestId
    );

    res.status(200).json({
      status: 'PROCESSED',
      referenceCode: response.referenceCode,
      replyMessage: response.replyMessage,
    });
  } catch (err: unknown) {
    logger.error(`Error processing WhatsApp webhook: ${(err as Error).message}`, { requestId });
    res.status(500).json({ error: 'Webhook processing error', details: (err as Error).message });
  }
});
