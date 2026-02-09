import Pusher from 'pusher-js';

// Pusher configuration - replace with your Pusher credentials
// Get these from https://dashboard.pusher.com/
// Set these as environment variables: VITE_PUSHER_KEY and VITE_PUSHER_CLUSTER
// For now, using placeholder values - replace with your actual Pusher credentials
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as any)[key] || defaultValue;
  }
  return defaultValue;
};

export const PUSHER_CONFIG = {
  key: getEnvVar('VITE_PUSHER_KEY', '920e9f72d2776ce6dbb0'),
  cluster: getEnvVar('VITE_PUSHER_CLUSTER', 'us3'),
};

export const pusherClient = new Pusher(PUSHER_CONFIG.key, {
  cluster: PUSHER_CONFIG.cluster,
  forceTLS: true,
});

// Channel naming convention: game-{roomCode}
export const getGameChannel = (roomCode: string) => {
  return pusherClient.subscribe(`game-${roomCode}`);
};

// Generate a random room code
export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
