import { useEffect, useState } from 'react';
import { runTransaction, type TransactionResult } from 'firebase/database';
import { getBuzzerRef } from '../config/firebase';
import { Team, BuzzerPress } from '../types/game';

interface PlayerBuzzerProps {
  roomCode: string;
  playerId: string;
  playerName: string;
  team: Team;
  buzzerEnabled: boolean;
  buzzerPress: BuzzerPress | null;
  /** Team id that cannot buzz (e.g. team that already answered wrong in steal phase) */
  noBuzzTeamId?: string | null;
}

export default function PlayerBuzzer({
  roomCode,
  playerId,
  playerName,
  team,
  buzzerEnabled,
  buzzerPress,
  noBuzzTeamId = null,
}: PlayerBuzzerProps) {
  const [hasBuzzed, setHasBuzzed] = useState(false);

  useEffect(() => {
    if (buzzerPress) {
      setHasBuzzed(buzzerPress.playerId === playerId);
      return;
    }

    if (buzzerEnabled) {
      setHasBuzzed(false);
      return;
    }

    setHasBuzzed(false);
  }, [buzzerEnabled, buzzerPress, playerId]);

  const handleBuzz = () => {
    if (!canBuzz) return;

    setHasBuzzed(true);
    const buzzerRef = getBuzzerRef(roomCode);
    runTransaction(buzzerRef, (current: { enabled?: boolean; press?: unknown } | null) => {
      if (!current || current.enabled !== true || current.press) {
        return current;
      }
      return {
        ...current,
        enabled: false,
        press: {
          playerId,
          playerName,
          teamId: team.id,
          teamName: team.name,
          timestamp: Date.now(),
        },
      };
    }).then((result: TransactionResult) => {
      if (!result.committed) {
        setHasBuzzed(false);
      }
    }).catch(() => {
      setHasBuzzed(false);
    });
  };

  const buzzerLocked = !!buzzerPress && buzzerPress.playerId !== playerId;
  const myTeamCannotBuzz = noBuzzTeamId != null && team.id === noBuzzTeamId;
  const canBuzz =
    buzzerEnabled &&
    !hasBuzzed &&
    !buzzerLocked &&
    !buzzerPress &&
    !myTeamCannotBuzz;

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
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

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center flex-1 justify-center text-center">
        <div className="mb-4 sm:mb-6 shrink-0">
          <div className="text-sm text-text-subtle mb-1">Room: {roomCode}</div>
          <div className="text-xl text-gold font-semibold mb-1">{playerName}</div>
          <div className="text-base text-text-muted">Team: {team.name}</div>
        </div>

        <div className="mb-4 sm:mb-6 w-full shrink-0">
          {hasBuzzed ? (
            <div className="bg-gold/20 border-2 border-gold rounded-gem p-4 sm:p-6 animate-pulse">
              <div className="text-2xl sm:text-3xl text-gold font-bold mb-2">You pressed the buzzer</div>
              <div className="text-sm sm:text-base text-text-muted">Others are blocked until the host resolves this question.</div>
            </div>
          ) : buzzerLocked ? (
            <div className="bg-surface border border-error/30 rounded-gem p-4 sm:p-6">
              <div className="text-xl sm:text-2xl text-error font-bold mb-2">Locked</div>
              <div className="text-sm sm:text-base text-text-muted">Someone else pressed first. Wait for the host to resolve.</div>
            </div>
          ) : myTeamCannotBuzz ? (
            <div className="bg-surface border border-border rounded-gem p-4 sm:p-6">
              <div className="text-xl sm:text-2xl text-text-muted font-bold mb-2">Other teams&apos; turn</div>
              <div className="text-sm sm:text-base text-text-subtle">Your team already answered. Other teams can buzz to steal.</div>
            </div>
          ) : !buzzerEnabled ? (
            <div className="bg-surface border border-border rounded-gem p-4 sm:p-6">
              <div className="text-lg sm:text-xl text-text-muted">Waiting for question...</div>
              <div className="text-sm text-text-subtle mt-2">The buzzer will activate when a question is shown</div>
            </div>
          ) : (
            <div className="bg-surface border-2 border-gold rounded-gem p-4 sm:p-6">
              <div className="text-xl sm:text-2xl text-gold font-bold mb-2">Ready!</div>
              <div className="text-sm sm:text-base text-text-muted">Tap the red button when you know the answer</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleBuzz}
          disabled={!canBuzz}
          aria-label={canBuzz ? 'Buzz in' : hasBuzzed ? 'You buzzed' : myTeamCannotBuzz ? "Your team can't buzz" : 'Buzzer locked'}
          className={`
            shrink-0 rounded-full font-bold transition-transform active:scale-95
            w-[min(80vmin,280px)] h-[min(80vmin,280px)] min-w-[200px] min-h-[200px]
            flex items-center justify-center
            select-none touch-manipulation
            ${canBuzz
              ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg shadow-red-900/40 cursor-pointer'
              : 'bg-surface text-text-subtle border-2 border-border cursor-not-allowed opacity-60'
            }
          `}
        >
          <span className="text-2xl sm:text-3xl md:text-4xl px-2">
            {hasBuzzed ? '✓ BUZZED!' : buzzerLocked ? 'LOCKED' : myTeamCannotBuzz ? "CAN'T BUZZ" : 'BUZZ IN'}
          </span>
        </button>
      </div>
    </div>
  );
}
