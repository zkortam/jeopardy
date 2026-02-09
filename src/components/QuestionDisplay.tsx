import { useEffect, useRef } from 'react';
import { Question, Team, BuzzerPress } from '../types/game';

interface QuestionDisplayProps {
  question: Question;
  timer: number;
  currentTeam?: Team;
  teams?: Team[];
  onAnswer?: (isCorrect: boolean) => void;
  onStealSelect?: (teamId: string) => void;
  onSkip?: () => void;
  showSteal?: boolean;
  isSteal?: boolean;
  answerRevealed?: boolean;
  onRevealAnswer?: () => void;
  gameState?: any;
  buzzerPress?: BuzzerPress | null;
}

export default function QuestionDisplay({
  question,
  timer,
  currentTeam,
  teams,
  onAnswer,
  onStealSelect,
  onSkip,
  showSteal,
  isSteal,
  answerRevealed = false,
  onRevealAnswer,
  gameState,
  buzzerPress,
}: QuestionDisplayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayKeyRef = useRef<string>('');
  const hasStartedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Global cleanup - ensure only one audio plays at a time
  useEffect(() => {
    return () => {
      // Always cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      lastPlayKeyRef.current = '';
      hasStartedRef.current = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // Play audio when question/team/steal status changes
  useEffect(() => {
    // Stop ALL existing audio first - critical to prevent multiple tracks
    const existingAudio = audioRef.current;
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.currentTime = 0;
      existingAudio.src = '';
      existingAudio.load();
      audioRef.current = null;
    }
    hasStartedRef.current = false;

    // Only play if we have answer handler and answer not revealed
    // currentTeam can be undefined initially (waiting for buzzer)
    if (!onAnswer || answerRevealed) {
      lastPlayKeyRef.current = '';
      return;
    }
    
    // If no team yet, wait for buzzer - don't start audio
    if (!currentTeam) {
      lastPlayKeyRef.current = '';
      return;
    }

    const playKey = `${question.id}-${currentTeam.id}-${isSteal ? 'steal' : 'normal'}`;
    
    // Skip if we already started playing for this exact scenario
    const currentAudio = audioRef.current;
    if (lastPlayKeyRef.current === playKey && currentAudio !== null) {
      if (!currentAudio.paused) {
        return;
      }
    }

    lastPlayKeyRef.current = playKey;

    // Determine which audio file to use
    const audioFile = isSteal ? '/Jeopardy Trap Remix.mp3' : '/jeopardysong.mp3';
    const audio = new Audio(audioFile);
    audio.volume = 1.0;
    audio.loop = !isSteal; // Loop only for regular questions, NOT for trap remix
    audio.muted = false;
    audio.preload = 'auto';
    
    // For trap remix, explicitly disable looping
    if (isSteal) {
      audio.loop = false;
    }
    
    audioRef.current = audio;

    // Store cleanup function
    const cleanup = () => {
      if (audioRef.current === audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      }
    };
    cleanupRef.current = cleanup;

    // Function to start playback
    const startPlayback = () => {
      // Prevent multiple play attempts
      if (hasStartedRef.current || !audioRef.current || answerRevealed) {
        return;
      }

      // Verify we're still on the same scenario and audio instance
      // Also need a team to answer
      if (lastPlayKeyRef.current !== playKey || audioRef.current !== audio || !currentTeam) {
        return;
      }

      hasStartedRef.current = true;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Successfully started playing
            // For steal attempts, ensure we're at 30 seconds after play starts
            if (isSteal && audio.duration >= 30 && audio.currentTime < 29) {
              // Wait a bit for audio to be ready, then seek
              setTimeout(() => {
                if (audioRef.current === audio && !audio.paused) {
                  audio.currentTime = 30;
                }
              }, 100);
            }
          })
          .catch(error => {
            hasStartedRef.current = false;
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
              console.error('Audio play failed:', error.name, error.message);
            }
          });
      }
    };

    // Set up event listeners - use multiple to ensure we catch when ready
    const handleCanPlay = () => {
      // Double-check we're still the active audio
      if (audioRef.current !== audio || lastPlayKeyRef.current !== playKey) {
        return;
      }
      
      // For steal, set time to 30 seconds before playing
      if (isSteal && audio.duration >= 30) {
        audio.currentTime = 30;
      }
      
      startPlayback();
    };

    // Set up metadata handler for steal to set time before playing
    const handleLoadedMetadata = () => {
      if (audioRef.current === audio && isSteal && audio.duration >= 30) {
        audio.currentTime = 30;
      }
    };

    // Handle audio end for trap remix to prevent any looping
    const handleEnded = () => {
      if (audioRef.current === audio && isSteal) {
        audio.pause();
        audio.currentTime = 0;
      }
    };

    // Remove any existing listeners first (they'll be cleaned up by once: true anyway)
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    audio.addEventListener('loadeddata', handleCanPlay, { once: true });
    audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    
    // For trap remix, listen for end to ensure it stops
    if (isSteal) {
      audio.addEventListener('ended', handleEnded, { once: true });
    }

    // Try to play immediately if already loaded
    if (audio.readyState >= 3) {
      setTimeout(() => {
        if (audioRef.current === audio && lastPlayKeyRef.current === playKey) {
          handleCanPlay();
        }
      }, 50);
    }

    // Load the audio file
    audio.load();

    // Cleanup function
    return () => {
      // Always cleanup when effect re-runs
      if (audioRef.current === audio) {
        audio.pause();
        audio.currentTime = 0;
        // Clear src to stop loading and remove event listeners
        audio.src = '';
        audio.load();
        audioRef.current = null;
      }
      hasStartedRef.current = false;
      cleanupRef.current = null;
    };
  }, [question.id, currentTeam?.id, isSteal, onAnswer, answerRevealed]);

  // Stop audio when answer is revealed
  useEffect(() => {
    if (answerRevealed && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
      lastPlayKeyRef.current = '';
      hasStartedRef.current = false;
    }
  }, [answerRevealed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showSteal && teams && onStealSelect) {
    return (
      <div className="relative min-h-screen bg flex items-center justify-center p-8 overflow-hidden">
        {/* Background pattern - matching ESA hero */}
        <div className="absolute inset-0 pointer-events-none">
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="triangle-steal" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                <path
                  d="M30 4 L56 48 L4 48 Z"
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#triangle-steal)" />
          </svg>
          
          {/* Subtle triangle accent */}
          <svg
            className="absolute top-[20%] left-[8%] w-[180px] h-[180px] pointer-events-none opacity-[0.04]"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 15 L85 75 L15 75 Z"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.8"
            />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-4xl">
          <div className="bg-surface border border-border rounded-gem p-12 mb-10 fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-5xl font-display font-bold text-gold mb-6">
                Incorrect Answer
              </h2>
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-px bg-gold" />
                <svg className="w-3 h-3 text-gold opacity-60" viewBox="0 0 20 20">
                  <path d="M10 2 L18 16 L2 16 Z" fill="currentColor" />
                </svg>
                <div className="w-12 h-px bg-gold" />
              </div>
              <div className="text-2xl text-text mb-6 font-medium leading-relaxed">
                {question.question}
              </div>
              <div className="text-3xl font-bold text-gold mb-4">
                Value: ${question.value}
              </div>
              <div className="text-lg text-text-muted">
                {gameState?.answerRevealed ? (
                  <>
                    Answer: <span className="text-gold font-semibold">{question.answer}</span>
                  </>
                ) : (
                  <>Time ran out - other teams can now steal</>
                )}
              </div>
            </div>
          </div>

          <div className="text-center mb-10 fade-in-up">
            <h3 className="text-2xl font-semibold text-text mb-4">
              {buzzerPress ? 'Team Buzzed In!' : 'Teams can buzz in to steal'}
            </h3>
            {buzzerPress && (
              <div className="mb-6 bg-gold/20 border-2 border-gold rounded-gem p-6 animate-pulse">
                <div className="text-2xl font-bold text-gold mb-2">{buzzerPress.playerName}</div>
                <div className="text-lg text-text font-semibold">Team: {buzzerPress.teamName}</div>
              </div>
            )}
            {!buzzerPress && (
              <div className="text-lg text-text-muted mb-6">
                Use the buzzer system on your devices, or manually select a team below
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-6">
              {teams.map(team => {
                const isOriginalTeam = gameState?.currentTeam?.id === team.id;
                const hasBuzzed = buzzerPress?.teamId === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => !isOriginalTeam && !hasBuzzed && onStealSelect?.(team.id)}
                    disabled={isOriginalTeam || hasBuzzed}
                    className={`bg-surface border rounded-gem p-10 text-xl font-semibold transition-all shadow-stone ${
                      hasBuzzed
                        ? 'border-gold bg-gold/20 text-gold cursor-default'
                        : isOriginalTeam
                        ? 'opacity-40 cursor-not-allowed text-text-subtle border-border'
                        : 'hover:bg-gold hover:text-bg text-text border-border hover:border-gold hover:shadow-stone-md'
                    }`}
                  >
                    {team.name}
                    {hasBuzzed && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-center fade-in-up">
            <div className="flex items-center justify-center gap-6">
              {!answerRevealed && (
                <button
                  onClick={onRevealAnswer}
                  className="px-10 py-4 bg-gold hover:bg-gold-dark text-bg border border-gold rounded-gem transition-all font-medium text-lg shadow-stone hover:shadow-stone-md"
                >
                  Show Answer
                </button>
              )}
              <button
                onClick={onSkip}
                className="px-10 py-4 bg-surface hover:bg-surface-elevated text-text-muted border border-border hover:border-gold rounded-gem transition-all font-medium text-lg"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (onAnswer) {
    return (
      <div className="relative min-h-screen bg flex items-center justify-center p-8 overflow-hidden">
        {/* Background pattern - matching ESA hero */}
        <div className="absolute inset-0 pointer-events-none">
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="triangle-question" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                <path
                  d="M30 4 L56 48 L4 48 Z"
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#triangle-question)" />
          </svg>
          
          {/* Foreground triangle accents */}
          <svg
            className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] pointer-events-none opacity-[0.05]"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 8 L92 82 L8 82 Z"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.5"
            />
          </svg>
          
          <svg
            className="absolute top-[25%] left-[5%] w-[220px] h-[220px] pointer-events-none opacity-[0.04]"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 12 L88 78 L12 78 Z"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.6"
            />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-4xl">
          <div className="bg-surface border border-border rounded-gem p-12 mb-10 fade-in-up">
            <div className="text-center mb-10">
              <div className="text-7xl font-bold text-gold mb-10">
                {formatTime(timer)}
              </div>
              <h2 className="text-5xl font-display font-bold text-text mb-8 leading-tight">
                {question.question}
              </h2>
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-px bg-gold" />
                <svg className="w-3 h-3 text-gold opacity-60" viewBox="0 0 20 20">
                  <path d="M10 2 L18 16 L2 16 Z" fill="currentColor" />
                </svg>
                <div className="w-12 h-px bg-gold" />
              </div>
              <div className="text-2xl text-gold mb-6">
                Value: ${question.value}
              </div>
              {currentTeam ? (
                <div className="text-lg text-text-muted mb-2">
                  Answering: <span className="text-gold font-semibold">{currentTeam.name}</span>
                </div>
              ) : (
                <div className="text-lg text-gold mb-2 font-medium animate-pulse">
                  Waiting for team to buzz in...
                </div>
              )}
              {isSteal && (
                <div className="text-lg text-gold mb-2 font-medium">
                  (Steal Attempt)
                </div>
              )}
              {buzzerPress && (
                <div className="mt-6 bg-gold/20 border-2 border-gold rounded-gem p-6 animate-pulse">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                    </svg>
                    <div className="text-sm text-text-muted uppercase tracking-wide">First to Buzz</div>
                  </div>
                  <div className="text-3xl font-bold text-gold mb-2">{buzzerPress.playerName}</div>
                  <div className="text-xl text-text font-semibold">Team: {buzzerPress.teamName}</div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center space-y-8 fade-in-up">
            {answerRevealed && (
              <div className="bg-bg-alt border border-border rounded-gem p-10 mb-6">
                <div className="text-sm text-text-muted mb-3 uppercase tracking-wide">Answer</div>
                <div className="text-3xl text-text font-semibold leading-relaxed">
                  {question.answer}
                </div>
              </div>
            )}
            {!answerRevealed && timer > 0 && (
              <div className="bg-bg-alt border border-border rounded-gem p-10 mb-6">
                <div className="text-text-muted text-lg">Waiting for answer...</div>
              </div>
            )}
            {!answerRevealed && timer === 0 && (
              <div className="bg-bg-alt border border-border rounded-gem p-10 mb-6">
                <div className="text-gold text-lg font-semibold">Time's up! Moving to steal phase...</div>
              </div>
            )}
            <div className="flex gap-6 justify-center">
              {answerRevealed ? (
                <>
                  <button
                    onClick={() => onAnswer?.(true)}
                    className="px-14 py-5 bg-success hover:bg-success/90 text-white rounded-gem font-semibold text-xl transition-all shadow-stone hover:shadow-stone-md"
                  >
                    Correct
                  </button>
                  <button
                    onClick={() => onAnswer?.(false)}
                    className="px-14 py-5 bg-error hover:bg-error/90 text-white rounded-gem font-semibold text-xl transition-all shadow-stone hover:shadow-stone-md"
                  >
                    Incorrect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onRevealAnswer?.()}
                  className="px-14 py-5 bg-gold hover:bg-gold-dark text-bg rounded-gem font-semibold text-xl transition-all shadow-stone hover:shadow-stone-md"
                >
                  Show Answer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
