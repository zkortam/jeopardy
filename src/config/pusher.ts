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
  key: getEnvVar('VITE_PUSHER_KEY', ''),
  cluster: getEnvVar('VITE_PUSHER_CLUSTER', ''),
  authEndpoint: getEnvVar('VITE_PUSHER_AUTH_ENDPOINT', '/api/pusher/auth'),
};

export const pusherClient = new Pusher(PUSHER_CONFIG.key, {
  cluster: PUSHER_CONFIG.cluster,
  forceTLS: true,
  authEndpoint: PUSHER_CONFIG.authEndpoint,
});

if (!PUSHER_CONFIG.key || !PUSHER_CONFIG.cluster) {
  console.warn('Missing Pusher configuration. Set VITE_PUSHER_KEY and VITE_PUSHER_CLUSTER.');
}

// Channel naming convention: private-game-{roomCode}
export const getGameChannel = (roomCode: string) => {
  return pusherClient.subscribe(`private-game-${roomCode}`);
};

// Generate a random room code
export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
