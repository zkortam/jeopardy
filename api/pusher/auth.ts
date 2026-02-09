import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const pushKey = requiredEnv('PUSHER_KEY');
const pushSecret = requiredEnv('PUSHER_SECRET');

const isAllowedChannel = (channelName: string): boolean => {
  if (!channelName.startsWith('private-game-')) return false;
  const roomCode = channelName.replace('private-game-', '');
  return /^[A-Z0-9]{4,8}$/i.test(roomCode);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let body: any = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = Object.fromEntries(new URLSearchParams(body));
      }
    }

    const socketId = body?.socket_id;
    const channelName = body?.channel_name;

    if (!socketId || !channelName) {
      res.status(400).json({ error: 'Missing socket_id or channel_name' });
      return;
    }

    if (!isAllowedChannel(channelName)) {
      res.status(403).json({ error: 'Forbidden channel' });
      return;
    }

    const stringToSign = `${socketId}:${channelName}`;
    const signature = crypto
      .createHmac('sha256', pushSecret)
      .update(stringToSign)
      .digest('hex');

    res.status(200).send({
      auth: `${pushKey}:${signature}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Auth failed' });
  }
}
