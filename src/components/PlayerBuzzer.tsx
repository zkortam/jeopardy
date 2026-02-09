import { useEffect, useState } from 'react';
import { getGameChannel } from '../config/pusher';
import { Team } from '../types/game';

interface PlayerBuzzerProps {
  roomCode: string;
  playerId: string;
  playerName: string;
  team: Team;
  buzzerEnabled: boolean;
}

export default function PlayerBuzzer({
  roomCode,
  playerId,
  playerName,
  team,
  buzzerEnabled,
}: PlayerBuzzerProps) {
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzerLocked, setBuzzerLocked] = useState(false);

  useEffect(() => {
    const channel = getGameChannel(roomCode);

    // Listen for buzzer state changes
    const handleBuzzerEnabled = () => {
      setHasBuzzed(false);
      setBuzzerLocked(false);
    };

    const handleBuzzerDisabled = () => {
      setBuzzerLocked(true);
    };

    const handleBuzzerPressed = (data: { playerId: string }) => {
      if (data.playerId !== playerId) {
        setBuzzerLocked(true);
      }
    };

    channel.bind('client-buzzer-enabled', handleBuzzerEnabled);
    channel.bind('client-buzzer-disabled', handleBuzzerDisabled);
    channel.bind('client-buzzer-pressed', handleBuzzerPressed);

    return () => {
      channel.unbind('client-buzzer-enabled', handleBuzzerEnabled);
      channel.unbind('client-buzzer-disabled', handleBuzzerDisabled);
      channel.unbind('client-buzzer-pressed', handleBuzzerPressed);
      channel.unsubscribe();
    };
  }, [roomCode, playerId]);

  const handleBuzz = () => {
    if (!buzzerEnabled || hasBuzzed || buzzerLocked) return;

    setHasBuzzed(true);
    const channel = getGameChannel(roomCode);
    channel.trigger('client-buzz', {
      playerId,
      playerName,
      teamId: team.id,
      teamName: team.name,
      timestamp: Date.now(),
    });
  };

  const canBuzz = buzzerEnabled && !hasBuzzed && !buzzerLocked;

  return (
    <div className="relative min-h-screen bg flex items-center justify-center p-8 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="triangle-buzzer" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <path
                d="M30 4 L56 48 L4 48 Z"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#triangle-buzzer)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        <div className="mb-6 fade-in-up">
          <div className="text-sm text-text-subtle mb-1">Room: {roomCode}</div>
          <div className="text-xl text-gold font-semibold mb-1">{playerName}</div>
          <div className="text-base text-text-muted">Team: {team.name}</div>
        </div>

        <div className="mb-8 fade-in-up">
          {hasBuzzed ? (
            <div className="bg-gold/20 border-2 border-gold rounded-gem p-6 animate-pulse">
              <div className="text-3xl text-gold font-bold mb-2">✓ You buzzed in!</div>
              <div className="text-text-muted">Waiting for host to call on you</div>
            </div>
          ) : buzzerLocked ? (
            <div className="bg-surface border border-error/30 rounded-gem p-6">
              <div className="text-2xl text-error font-bold mb-2">Locked</div>
              <div className="text-text-muted">Someone else buzzed first</div>
            </div>
          ) : !buzzerEnabled ? (
            <div className="bg-surface border border-border rounded-gem p-6">
              <div className="text-xl text-text-muted">Waiting for question...</div>
              <div className="text-sm text-text-subtle mt-2">The buzzer will activate when a question is shown</div>
            </div>
          ) : (
            <div className="bg-surface border-2 border-gold rounded-gem p-6">
              <div className="text-2xl text-gold font-bold mb-2">Ready!</div>
              <div className="text-text-muted">Press the button when you know the answer</div>
            </div>
          )}
        </div>

        <button
          onClick={handleBuzz}
          disabled={!canBuzz}
          className={`w-full max-w-md mx-auto py-24 rounded-gem font-bold text-5xl transition-all shadow-stone ${
            canBuzz
              ? 'bg-gold hover:bg-gold-dark text-bg hover:shadow-stone-md active:scale-95 cursor-pointer transform hover:scale-105'
              : 'bg-surface text-text-subtle border-2 border-border cursor-not-allowed opacity-50'
          }`}
        >
          {hasBuzzed ? '✓ BUZZED!' : buzzerLocked ? '🔒 LOCKED' : '⚡ BUZZ IN'}
        </button>
      </div>
    </div>
  );
}
