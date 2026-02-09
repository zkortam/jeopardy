import { useState, useEffect, useRef } from 'react';
import { Team, GameState, BuzzerPress } from './types/game';
import { gameData } from './data/gameData';
import { generateRoomCode, getBuzzerRef, getNewRoomRef, getRoomRef, getTeamsRef } from './config/firebase';
import { normalizeRoomCode as normalizeRoomCodeUtil, validateRoomCodeFormat } from './utils/roomCode';
import { parseTeamsFromFirebase } from './utils/teams';
import { onValue, set, type DataSnapshot } from 'firebase/database';
import TeamSetup from './components/TeamSetup';
import GameBoard from './components/GameBoard';
import QuestionDisplay from './components/QuestionDisplay';
import Leaderboard from './components/Leaderboard';
import PlayerJoin from './components/PlayerJoin';
import PlayerBuzzer from './components/PlayerBuzzer';
import './App.css';

const STORAGE_KEY = 'jeopardy-game-state';

const isAdminPath = (path: string): boolean => {
  return path === '/admin' || path.startsWith('/admin/');
};

const getInitialIsPlayerView = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !isAdminPath(window.location.pathname);
};

function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that we have teams and categories
      if (parsed.teams && parsed.teams.length > 0 && parsed.categories) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

function saveGameState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

function getInitialState(isPlayerView: boolean): GameState {
  if (!isPlayerView) {
    const saved = loadGameState();
    if (saved) {
      const teams = saved.teams || [];
      const selectedTeamFromSaved = saved.selectedTeam && teams.find(t => t.id === saved.selectedTeam!.id)
        ? saved.selectedTeam
        : teams[0] || null;
      const selectedTeamIndex = selectedTeamFromSaved
        ? teams.findIndex(t => t.id === selectedTeamFromSaved.id)
        : 0;
      const currentTeamIndex =
        Number.isInteger(saved.currentTeamIndex) &&
        saved.currentTeamIndex >= 0 &&
        saved.currentTeamIndex < teams.length
          ? saved.currentTeamIndex
          : Math.max(0, selectedTeamIndex);

      // Reset timer and active states when loading from storage
      return {
        ...saved,
        teams,
        timer: 0,
        timerActive: false,
        answerRevealed: false,
        buzzerEnabled: false,
        buzzerPress: null,
        selectedTeam: selectedTeamFromSaved,
        currentTeamIndex,
        // If we were in answer phase, go back to playing
        gamePhase: saved.gamePhase === 'answer' ? 'playing' : saved.gamePhase,
        // Ensure roomCode exists if we have teams
        roomCode: saved.roomCode || (teams.length > 0 ? generateRoomCode() : null),
        players: saved.players || [],
      };
    }
  }

  return {
    teams: [],
    categories: gameData.map(cat => ({
      ...cat,
      questions: cat.questions.map(q => ({ ...q, answered: false })),
    })),
    currentQuestion: null,
    currentTeam: null,
    timer: 0,
    timerActive: false,
    gamePhase: 'setup' as const,
    selectedQuestion: null,
    stealTeam: null,
    selectedTeam: null,
    currentTeamIndex: 0,
    answerRevealed: false,
    roomCode: null,
    buzzerEnabled: false,
    buzzerPress: null,
    players: [],
  };
}

function App() {
  const initialIsPlayerView = getInitialIsPlayerView();
  const [gameState, setGameState] = useState<GameState>(() => getInitialState(initialIsPlayerView));
  const [isPlayerView, setIsPlayerView] = useState(initialIsPlayerView);
  const [playerInfo, setPlayerInfo] = useState<{ id: string; name: string; teamId: string } | null>(null);
  const [playerRoomCode, setPlayerRoomCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const pathMatch = path.match(/\/room\/([A-Z0-9]+)/i);
    if (pathMatch) {
      return pathMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    const roomParam = urlParams.get('room');
    return roomParam ? roomParam.toUpperCase().replace(/[^A-Z0-9]/g, '') : null;
  });
  /** For player view: null = loading, false = no active room, true = room exists (may still be waiting for teams) */
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomCodeError, setRoomCodeError] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomCreateFailed, setRoomCreateFailed] = useState(false);
  const teamsRef = useRef<Team[]>([]);

  // Check if this is a player view (based on URL path) and track room code changes
  useEffect(() => {
    const updateFromURL = () => {
      const path = window.location.pathname;
      setIsPlayerView(!isAdminPath(path));
      
      const urlParams = new URLSearchParams(window.location.search);
      const pathMatch = path.match(/\/room\/([A-Z0-9]+)/i);
      if (pathMatch) {
        setPlayerRoomCode(pathMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, ''));
      } else {
        const roomParam = urlParams.get('room');
        setPlayerRoomCode(roomParam ? roomParam.toUpperCase().replace(/[^A-Z0-9]/g, '') : null);
      }
    };
    
    updateFromURL();
    window.addEventListener('popstate', updateFromURL);
    return () => window.removeEventListener('popstate', updateFromURL);
  }, []);

  const syncBuzzerState = (enabled: boolean, press: BuzzerPress | null) => {
    if (isPlayerView || !gameState.roomCode) return;
    const buzzerRef = getBuzzerRef(gameState.roomCode);
    set(buzzerRef, { enabled, press: press || null }).catch(() => {
      // Ignore transient network errors
    });
  };

  // Listen for buzzer presses from Firebase (host only)
  useEffect(() => {
    if (!gameState.roomCode || isPlayerView) return;

    const buzzerRef = getBuzzerRef(gameState.roomCode);
    const unsubscribe = onValue(buzzerRef, (snapshot: DataSnapshot) => {
      const buzzer = snapshot.val();
      if (!buzzer || !buzzer.press) return;
      const data: BuzzerPress = buzzer.press;

      setGameState(prev => {
        if (prev.buzzerPress) return prev;

        const buzzingTeam = prev.teams.find(t => t.id === data.teamId);
        if (!buzzingTeam) {
          console.warn('Buzzer press from unknown team:', data.teamId);
          return prev;
        }

        if (prev.gamePhase === 'steal' && prev.currentTeam && buzzingTeam.id === prev.currentTeam.id) {
          return prev;
        }

        const newState = {
          ...prev,
          buzzerPress: data,
          buzzerEnabled: false,
          currentTeam: buzzingTeam,
        };

        if (prev.gamePhase === 'steal') {
          newState.stealTeam = buzzingTeam;
          newState.gamePhase = 'answer';
          newState.timer = 15;
          newState.timerActive = true;
          newState.answerRevealed = false;
        }

        return newState;
      });
    });

    return () => unsubscribe();
  }, [gameState.roomCode, isPlayerView]);

  // Sync teams to Firebase (host only)
  useEffect(() => {
    if (isPlayerView || !gameState.roomCode || gameState.teams.length === 0) return;
    const teamsRef = getTeamsRef(gameState.roomCode);
    set(teamsRef, gameState.teams).catch(() => {
      // Ignore transient network errors
    });
  }, [gameState.teams, gameState.roomCode, isPlayerView]);

  // Keep teams ref in sync
  useEffect(() => {
    teamsRef.current = gameState.teams;
  }, [gameState.teams]);

  // Save game state to localStorage whenever it changes (but not on initial load)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Don't save during setup phase or if no teams
    if (gameState.gamePhase !== 'setup' && gameState.teams.length > 0) {
      saveGameState(gameState);
    }
  }, [gameState]);

  const handleTeamsReady = (teams: Team[]) => {
    // Use existing room code when host clicked "New room" (so players already have the new code)
    const roomCode = gameState.roomCode || generateRoomCode();
    teamsRef.current = teams;

    const roomPayload = {
      teams,
      buzzer: { enabled: false, press: null },
      updatedAt: Date.now(),
    };

    // Write to Firebase FIRST so the room exists before we show the code to the host.
    // Otherwise players can enter the code and get "no room" before the write completes.
    if (!isPlayerView) {
      setIsCreatingRoom(true);
      set(getRoomRef(roomCode), roomPayload)
        .then(() => {
          setIsCreatingRoom(false);
          setRoomCreateFailed(false);
          setGameState(prev => {
            const newState: GameState = {
              ...prev,
              teams,
              gamePhase: 'playing' as const,
              selectedTeam: teams[0],
              currentTeamIndex: 0,
              roomCode,
            };
            saveGameState(newState);
            return newState;
          });
        })
        .catch((err: unknown) => {
          setIsCreatingRoom(false);
          setRoomCreateFailed(true);
          console.error('Failed to create room in Firebase:', err);
          // Still show the game locally so host can retry
          setGameState(prev => {
            const newState: GameState = {
              ...prev,
              teams,
              gamePhase: 'playing' as const,
              selectedTeam: teams[0],
              currentTeamIndex: 0,
              roomCode,
            };
            saveGameState(newState);
            return newState;
          });
        });
    } else {
      setGameState(prev => {
        const newState: GameState = {
          ...prev,
          teams,
          gamePhase: 'playing' as const,
          selectedTeam: teams[0],
          currentTeamIndex: 0,
          roomCode,
        };
        saveGameState(newState);
        return newState;
      });
    }
  };

  const handlePlayerJoin = (playerId: string, name: string, teamId: string) => {
    setPlayerInfo({ id: playerId, name, teamId });
  };

  const getNextTeam = () => {
    const nextIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    return gameState.teams[nextIndex];
  };

  const handleQuestionSelect = (categoryId: string, questionId: string) => {
    const category = gameState.categories.find(c => c.id === categoryId);
    const question = category?.questions.find(q => q.id === questionId);
    
    if (!question || question.answered) return;

    setGameState(prev => ({
      ...prev,
      selectedQuestion: { categoryId, questionId },
      currentQuestion: question,
      currentTeam: null, // Will be set when someone buzzes in
      gamePhase: 'answer',
      timer: 30,
      timerActive: true,
      answerRevealed: false,
      buzzerEnabled: true, // Enable buzzer for ALL teams when question is shown
      buzzerPress: null, // Reset buzzer press
    }));

    syncBuzzerState(true, null);
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (!gameState.currentQuestion) return;
    
    // If no team has buzzed in yet, use selectedTeam as fallback
    // This allows host to manually process answers if needed
    const answeringTeam = gameState.currentTeam || gameState.selectedTeam;
    if (!answeringTeam) {
      console.warn('Cannot process answer: no team selected');
      return;
    }

    const updatedCategories = gameState.categories.map(cat => {
      if (cat.id === gameState.selectedQuestion?.categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === gameState.selectedQuestion?.questionId) {
              return { ...q, answered: true };
            }
            return q;
          }),
        };
      }
      return cat;
    });

    const updatedTeams = gameState.teams.map(team => {
      if (team.id === answeringTeam.id) {
        return {
          ...team,
          score: isCorrect
            ? team.score + gameState.currentQuestion!.value
            : team.score - gameState.currentQuestion!.value,
        };
      }
      return team;
    });

    if (isCorrect) {
      // Give control to the team that answered correctly (Jeopardy rule)
      const correctTeam = answeringTeam;
      const correctTeamIndex = correctTeam ? gameState.teams.findIndex(t => t.id === correctTeam.id) : 0;
      
      // Update teamsRef immediately
      teamsRef.current = updatedTeams;
      
      setGameState(prev => ({
        ...prev,
        teams: updatedTeams,
        categories: updatedCategories,
        currentQuestion: null,
        currentTeam: null,
        timer: 0,
        timerActive: false,
        gamePhase: 'playing',
        selectedQuestion: null,
        stealTeam: null,
        selectedTeam: correctTeam || prev.selectedTeam, // Team that answered correctly gets control
        currentTeamIndex: correctTeamIndex >= 0 ? correctTeamIndex : prev.currentTeamIndex,
        answerRevealed: false,
        buzzerEnabled: false,
        buzzerPress: null,
      }));

      syncBuzzerState(false, null);
    } else {
      // Go to steal phase - enable buzzer for all OTHER teams
      // Update teamsRef immediately
      teamsRef.current = updatedTeams;
      
      setGameState(prev => ({
        ...prev,
        teams: updatedTeams,
        categories: updatedCategories,
        timer: 0,
        timerActive: false,
        gamePhase: 'steal',
        buzzerEnabled: true, // Enable buzzer for other teams to steal
        buzzerPress: null,
        currentTeam: answeringTeam, // Keep track of who got it wrong (to prevent re-buzz)
      }));

      syncBuzzerState(true, null);
    }
  };

  // Manual team selection for steal (fallback if buzzer not used)
  // Buzzer system should handle this automatically, but this allows manual override
  const handleStealSelect = (teamId: string) => {
    const team = gameState.teams.find(t => t.id === teamId);
    if (!team) return;

    // Don't allow selecting the team that already got it wrong
    if (gameState.currentTeam && team.id === gameState.currentTeam.id) {
      return;
    }

    // If buzzer already selected someone, use that instead
    if (gameState.buzzerPress) {
      const buzzerTeam = gameState.teams.find(t => t.id === gameState.buzzerPress!.teamId);
      if (buzzerTeam) {
        setGameState(prev => ({
          ...prev,
          stealTeam: buzzerTeam,
          currentTeam: buzzerTeam,
          timer: 15,
          timerActive: true,
          gamePhase: 'answer',
          answerRevealed: false,
          buzzerEnabled: false,
          buzzerPress: prev.buzzerPress,
        }));
        syncBuzzerState(false, gameState.buzzerPress);
        return;
      }
    }

    setGameState(prev => ({
      ...prev,
      stealTeam: team,
      currentTeam: team,
      timer: 15,
      timerActive: true,
      gamePhase: 'answer',
      answerRevealed: false,
      buzzerEnabled: false,
      buzzerPress: null,
    }));

    syncBuzzerState(false, null);
  };

  const handleSkipSteal = () => {
    const updatedCategories = gameState.categories.map(cat => {
      if (cat.id === gameState.selectedQuestion?.categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === gameState.selectedQuestion?.questionId) {
              return { ...q, answered: true };
            }
            return q;
          }),
        };
      }
      return cat;
    });

    const nextTeam = getNextTeam();
    const nextIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
    setGameState(prev => ({
      ...prev,
      categories: updatedCategories,
      currentQuestion: null,
      currentTeam: null,
      timer: 0,
      timerActive: false,
      gamePhase: 'playing',
      selectedQuestion: null,
      stealTeam: null,
      selectedTeam: nextTeam,
      currentTeamIndex: nextIndex,
      answerRevealed: false,
      buzzerEnabled: false,
      buzzerPress: null,
    }));

    syncBuzzerState(false, null);
  };

  const handleStealAnswer = (isCorrect: boolean) => {
    if (!gameState.currentQuestion || !gameState.stealTeam) return;

    const updatedCategories = gameState.categories.map(cat => {
      if (cat.id === gameState.selectedQuestion?.categoryId) {
        return {
          ...cat,
          questions: cat.questions.map(q => {
            if (q.id === gameState.selectedQuestion?.questionId) {
              return { ...q, answered: true };
            }
            return q;
          }),
        };
      }
      return cat;
    });

    const updatedTeams = gameState.teams.map(team => {
      if (team.id === gameState.stealTeam!.id) {
        return {
          ...team,
          score: isCorrect
            ? team.score + gameState.currentQuestion!.value
            : team.score,
        };
      }
      return team;
    });

    if (isCorrect) {
      // Give control to the team that stole correctly (Jeopardy rule)
      const stealTeam = gameState.stealTeam;
      const stealTeamIndex = stealTeam ? gameState.teams.findIndex(t => t.id === stealTeam.id) : 0;
      
      // Update teamsRef immediately
      teamsRef.current = updatedTeams;
      
      setGameState(prev => ({
        ...prev,
        teams: updatedTeams,
        categories: updatedCategories,
        currentQuestion: null,
        currentTeam: null,
        timer: 0,
        timerActive: false,
        gamePhase: 'playing',
        selectedQuestion: null,
        stealTeam: null,
        selectedTeam: stealTeam || prev.selectedTeam, // Team that stole correctly gets control
        currentTeamIndex: stealTeamIndex >= 0 ? stealTeamIndex : prev.currentTeamIndex,
        answerRevealed: false,
        buzzerEnabled: false,
        buzzerPress: null,
      }));

      syncBuzzerState(false, null);
    } else {
      // Wrong steal - go back to steal phase, enable buzzer for remaining teams
      // Update teamsRef immediately (though score doesn't change for wrong steal)
      teamsRef.current = updatedTeams;
      
      setGameState(prev => ({
        ...prev,
        teams: updatedTeams,
        categories: updatedCategories,
        timer: 0,
        timerActive: false,
        gamePhase: 'steal',
        stealTeam: null,
        currentTeam: prev.currentTeam, // Keep track of who got it wrong (for preventing re-buzz)
        answerRevealed: false, // Don't reveal answer yet, allow more steal attempts
        buzzerEnabled: true, // Re-enable buzzer for other teams
        buzzerPress: null, // Reset buzzer so others can buzz
      }));

      syncBuzzerState(true, null);
    }
  };


  useEffect(() => {
    let interval: number | null = null;
    if (gameState.timerActive && gameState.timer > 0) {
      interval = window.setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timer: prev.timer - 1,
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.timerActive, gameState.timer]);

  // Handle timer expiration separately
  const timerExpiredRef = useRef(false);
  useEffect(() => {
    if (gameState.timer === 0 && gameState.timerActive && gameState.gamePhase === 'answer' && !gameState.answerRevealed && !timerExpiredRef.current) {
      timerExpiredRef.current = true;
      
      // Use functional update to avoid stale closure issues
      setGameState(prev => {
        // Double-check conditions with current state
        if (prev.timer !== 0 || !prev.timerActive || prev.gamePhase !== 'answer' || prev.answerRevealed) {
          timerExpiredRef.current = false;
          return prev;
        }
        
        // When timer runs out, go to steal phase
        if (!prev.currentQuestion || !prev.selectedQuestion) {
          timerExpiredRef.current = false;
          return prev;
        }

        const updatedCategories = prev.categories.map(cat => {
          if (cat.id === prev.selectedQuestion!.categoryId) {
            return {
              ...cat,
              questions: cat.questions.map(q => {
                if (q.id === prev.selectedQuestion!.questionId) {
                  return { ...q, answered: false }; // Don't mark as answered yet
                }
                return q;
              }),
            };
          }
          return cat;
        });

        // If someone buzzed in, deduct points from that team
        // Otherwise, just go to steal phase without penalty
        const updatedTeams = prev.currentTeam
          ? prev.teams.map(team => {
              if (team.id === prev.currentTeam!.id) {
                return {
                  ...team,
                  score: team.score - prev.currentQuestion!.value,
                };
              }
              return team;
            })
          : prev.teams;

        // Update teamsRef immediately
        teamsRef.current = updatedTeams;

        return {
          ...prev,
          teams: updatedTeams,
          categories: updatedCategories,
          timer: 0,
          timerActive: false,
          gamePhase: 'steal',
          answerRevealed: false,
          buzzerEnabled: true, // Enable buzzer for other teams to steal
          buzzerPress: null, // Reset buzzer
          currentTeam: prev.currentTeam || null, // Keep track of who got it wrong (if anyone buzzed)
          stealTeam: null, // Reset steal team
        };
      });

      syncBuzzerState(true, null);
    }
    // Reset flag when timer starts again
    if (gameState.timerActive && gameState.timer > 0) {
      timerExpiredRef.current = false;
    }
  }, [gameState.timer, gameState.timerActive, gameState.gamePhase, gameState.answerRevealed]);

  useEffect(() => {
    const allAnswered = gameState.categories.every(cat =>
      cat.questions.every(q => q.answered)
    );

    if (allAnswered && gameState.gamePhase === 'playing') {
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finished',
      }));
    }
  }, [gameState.categories, gameState.gamePhase]);

  // Validate room exists for players (block invalid codes)
  useEffect(() => {
    if (!isPlayerView || !playerRoomCode) return;
    setRoomExists(null);
    const roomRef = getRoomRef(playerRoomCode);
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onValue(roomRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const exists = data !== null && typeof data === 'object';
      if (exists) {
        if (graceTimer) clearTimeout(graceTimer);
        graceTimer = null;
        setRoomExists(true);
      } else {
        // Room not found yet: give a short grace period (host may have just created it)
        if (graceTimer) return;
        graceTimer = setTimeout(() => {
          graceTimer = null;
          setRoomExists(false);
        }, 2000);
      }
    }, (error: unknown) => {
      if (graceTimer) clearTimeout(graceTimer);
      console.error('Error checking room:', error);
      setRoomExists(false);
    });
    return () => {
      if (graceTimer) clearTimeout(graceTimer);
      unsubscribe();
    };
  }, [isPlayerView, playerRoomCode]);

  // Subscribe to buzzer state for players
  useEffect(() => {
    if (!isPlayerView) return;
    if (!playerRoomCode) return;

    const buzzerRef = getBuzzerRef(playerRoomCode);
    const unsubscribe = onValue(buzzerRef, (snapshot: DataSnapshot) => {
      const buzzer = snapshot.val();
      if (!buzzer) return;
      setGameState(prev => ({
        ...prev,
        buzzerEnabled: !!buzzer.enabled,
        buzzerPress: buzzer.press || null,
      }));
    });

    return () => unsubscribe();
  }, [isPlayerView, playerRoomCode]);

  // Subscribe to teams for players
  useEffect(() => {
    if (!isPlayerView) return;
    if (!playerRoomCode) return;

    const teamsRef = getTeamsRef(playerRoomCode);
    const unsubscribe = onValue(teamsRef, (snapshot: DataSnapshot) => {
      const value = snapshot.val();
      if (!value) {
        // If no value, set empty teams array to clear any stale data
        setGameState(prev => ({
          ...prev,
          teams: [],
          roomCode: playerRoomCode || prev.roomCode,
        }));
        return;
      }
      const receivedTeams = parseTeamsFromFirebase(value);
      setGameState(prev => ({
        ...prev,
        teams: receivedTeams,
        roomCode: playerRoomCode || prev.roomCode,
      }));
    }, (error: unknown) => {
      console.error('Error fetching teams:', error);
      // On error, keep current state but log the error
    });

    return () => unsubscribe();
  }, [isPlayerView, playerRoomCode]);

  // Listen for new room notifications for players
  useEffect(() => {
    if (!isPlayerView) return;
    if (!playerRoomCode) return;

    const newRoomRef = getNewRoomRef(playerRoomCode);
    const unsubscribe = onValue(newRoomRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const nextRoom = (data?.roomCode || data)?.toUpperCase?.().replace(/[^A-Z0-9]/g, '');
      if (nextRoom) {
        window.location.href = `/?room=${nextRoom}`;
      }
    });

    return () => unsubscribe();
  }, [isPlayerView, playerRoomCode]);

  // Player view - show join or buzzer
  if (isPlayerView) {
    if (!playerRoomCode) {
      const tryJoin = () => {
        const code = normalizeRoomCodeUtil(roomCodeInput);
        setRoomCodeError('');
        const { valid, error } = validateRoomCodeFormat(code);
        if (!valid) {
          setRoomCodeError(error ?? 'Invalid room code');
          return;
        }
        setPlayerRoomCode(code);
        window.location.href = `/?room=${code}`;
      };
      return (
        <div className="min-h-screen bg text flex items-center justify-center p-6">
          <div className="text-center max-w-md w-full">
            <div className="text-3xl text-text-muted mb-4">Enter Room Code</div>
            <div className="text-lg text-text-subtle mb-6">Ask the host for the room code</div>
            <div className="mt-6">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => {
                  setRoomCodeInput(normalizeRoomCodeUtil(e.target.value));
                  setRoomCodeError('');
                }}
                placeholder="e.g. ABC123"
                maxLength={8}
                autoComplete="off"
                autoFocus
                aria-label="Room code"
                className="w-full px-6 py-4 border border-border rounded-gem bg-bg-alt text-text text-center text-2xl font-bold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                style={{
                  backgroundColor: 'var(--color-bg-alt)',
                  color: 'var(--color-text)',
                }}
                onKeyDown={(e) => e.key === 'Enter' && tryJoin()}
              />
              {roomCodeError && (
                <div className="mt-2 text-error text-sm">{roomCodeError}</div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={tryJoin}
                  className="w-full px-6 py-4 bg-gold hover:bg-gold-dark text-bg rounded-gem font-semibold text-lg transition-all"
                >
                  Submit
                </button>
                <span className="text-sm text-text-subtle">Or press Enter to submit</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Invalid room code: block and offer to try another
    if (roomExists === false) {
      return (
        <div className="min-h-screen bg text flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-surface border border-border rounded-gem p-10">
            <div className="text-2xl font-semibold text-text mb-2">No active room with this code</div>
            <div className="text-text-muted mb-6">
              The code &quot;{playerRoomCode}&quot; doesn&apos;t have an active game. Check the code with the host or try another.
            </div>
            <button
              type="button"
              onClick={() => {
                setPlayerRoomCode(null);
                setRoomExists(null);
                setRoomCodeInput('');
                setRoomCodeError('');
                window.history.replaceState({}, '', window.location.pathname || '/');
              }}
              className="px-6 py-3 bg-gold hover:bg-gold-dark text-bg rounded-gem font-medium transition-all"
            >
              Try another code
            </button>
          </div>
        </div>
      );
    }

    // Loading: checking if room exists
    if (roomExists === null) {
      return (
        <div className="min-h-screen bg text flex items-center justify-center">
          <div className="text-center text-text-muted">
            <div className="text-xl mb-2">Checking room...</div>
            <div className="text-sm text-text-subtle">Verifying room code</div>
          </div>
        </div>
      );
    }

    // Room exists but no teams yet
    if (roomExists === true && gameState.teams.length === 0) {
      return (
        <div className="min-h-screen bg text flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-surface border border-border rounded-gem p-10">
            <div className="text-2xl font-semibold text-text mb-2">Waiting for host</div>
            <div className="text-text-muted mb-6">
              Room <span className="font-mono font-bold text-gold">{playerRoomCode}</span> is set up. The host needs to create teams before you can join.
            </div>
            <button
              type="button"
              onClick={() => {
                setPlayerRoomCode(null);
                setRoomExists(null);
                setRoomCodeInput('');
                window.history.replaceState({}, '', window.location.pathname || '/');
              }}
              className="px-6 py-3 bg-surface-elevated hover:bg-border text-text border border-border rounded-gem font-medium transition-all"
            >
              Back to code entry
            </button>
          </div>
        </div>
      );
    }

    if (!playerInfo) {
      const cleanRoomCode = playerRoomCode.replace(/[^A-Z0-9]/g, '').toUpperCase();
      return (
        <PlayerJoin
          roomCode={cleanRoomCode}
          teams={gameState.teams}
          onJoin={handlePlayerJoin}
        />
      );
    }

    const team = gameState.teams.find(t => t.id === playerInfo.teamId);
    if (!team) {
      return (
        <div className="min-h-screen bg text flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-text-muted mb-4">
              {gameState.teams.length === 0
                ? 'Waiting for teams to sync...'
                : 'Your team is no longer available.'}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {gameState.teams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPlayerInfo(null)}
                  className="px-6 py-3 bg-gold hover:bg-gold-dark text-bg rounded-gem transition-all font-medium"
                >
                  Rejoin Game
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPlayerInfo(null);
                  setPlayerRoomCode(null);
                  setRoomExists(null);
                  setRoomCodeInput('');
                  window.history.replaceState({}, '', window.location.pathname || '/');
                }}
                className="px-6 py-3 bg-surface hover:bg-surface-elevated text-text border border-border rounded-gem transition-all font-medium"
              >
                Use different code
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <PlayerBuzzer
        roomCode={playerRoomCode!}
        playerId={playerInfo.id}
        playerName={playerInfo.name}
        team={team}
        buzzerEnabled={gameState.buzzerEnabled}
        buzzerPress={gameState.buzzerPress}
      />
    );
  }

  // Admin/Host view
  return (
    <div className="min-h-screen bg text">
      {gameState.gamePhase === 'setup' && isCreatingRoom && (
        <div className="min-h-screen bg flex items-center justify-center p-8">
          <div className="text-center text-text-muted">
            <div className="text-xl font-medium mb-2">Creating room...</div>
            <div className="text-sm text-text-subtle">Making sure players can join. Please wait.</div>
          </div>
        </div>
      )}
      {gameState.gamePhase === 'setup' && !isCreatingRoom && (
        <TeamSetup onTeamsReady={handleTeamsReady} />
      )}
      {(gameState.gamePhase === 'playing' || gameState.gamePhase === 'team-select') && (
        <>
          {roomCreateFailed && (
            <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-[calc(12rem+1rem)] sm:max-w-md z-50 bg-error/10 border border-error rounded-gem px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-error">Room could not be created online. Players may not be able to join. Try &quot;New room&quot; to retry.</span>
              <button type="button" onClick={() => setRoomCreateFailed(false)} className="shrink-0 text-error hover:underline text-sm font-medium">Dismiss</button>
            </div>
          )}
          {gameState.roomCode && (
            <div className="fixed top-4 right-4 bg-surface border border-gold rounded-gem px-4 py-3 sm:px-6 sm:py-4 z-50 shadow-stone-md max-w-[calc(100vw-2rem)]">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-1 sm:mb-2">Room Code</div>
              <div className="text-2xl sm:text-3xl font-bold text-gold select-all tracking-wider font-mono break-all" title="Tap to select and copy">
                {gameState.roomCode}
              </div>
            </div>
          )}
          <GameBoard
            gameState={gameState}
            onQuestionSelect={handleQuestionSelect}
            onScoreChange={(teamId, newScore) => {
              setGameState(prev => {
                const updatedTeams = prev.teams.map(team =>
                  team.id === teamId ? { ...team, score: newScore } : team
                );
                // Update teamsRef immediately
                teamsRef.current = updatedTeams;
                return {
                  ...prev,
                  teams: updatedTeams,
                };
              });
            }}
            onNewRoom={() => {
              if (confirm('Start a new room? This will reset all teams, scores, and game progress. Players will need to rejoin with the new room code.')) {
                const newRoomCode = generateRoomCode();
                const oldRoomCode = gameState.roomCode;
                
                // Reset teamsRef
                teamsRef.current = [];
                
                // Reset to initial game state with new room code
                setGameState({
                  teams: [],
                  categories: gameData.map(cat => ({
                    ...cat,
                    questions: cat.questions.map(q => ({ ...q, answered: false })),
                  })),
                  currentQuestion: null,
                  currentTeam: null,
                  timer: 0,
                  timerActive: false,
                  gamePhase: 'setup' as const,
                  selectedQuestion: null,
                  stealTeam: null,
                  selectedTeam: null,
                  currentTeamIndex: 0,
                  answerRevealed: false,
                  roomCode: newRoomCode,
                  buzzerEnabled: false,
                  buzzerPress: null,
                  players: [],
                });
                setRoomCreateFailed(false);
                // Clear localStorage
                localStorage.removeItem(STORAGE_KEY);

                if (oldRoomCode) {
                  set(getNewRoomRef(oldRoomCode), { roomCode: newRoomCode, timestamp: Date.now() }).catch(() => {
                    // Ignore transient network errors
                  });
                }

                set(getRoomRef(newRoomCode), {
                  teams: [],
                  buzzer: { enabled: false, press: null },
                  updatedAt: Date.now(),
                }).catch(() => {
                  // Ignore transient network errors
                });
              }
            }}
          />
        </>
      )}
      {gameState.gamePhase === 'answer' && gameState.currentQuestion && (
        <QuestionDisplay
          question={gameState.currentQuestion}
          timer={gameState.timer}
          currentTeam={gameState.currentTeam || undefined}
          onAnswer={gameState.stealTeam ? handleStealAnswer : handleAnswer}
          isSteal={!!gameState.stealTeam}
          answerRevealed={gameState.answerRevealed}
          buzzerPress={gameState.buzzerPress}
          onRevealAnswer={() => {
            setGameState(prev => ({ ...prev, answerRevealed: true }));
          }}
        />
      )}
      {gameState.gamePhase === 'steal' && gameState.currentQuestion && (
        <QuestionDisplay
          question={gameState.currentQuestion}
          timer={0}
          teams={gameState.teams}
          onStealSelect={handleStealSelect}
          onSkip={handleSkipSteal}
          showSteal={true}
          gameState={gameState}
          answerRevealed={gameState.answerRevealed}
          buzzerPress={gameState.buzzerPress}
          onRevealAnswer={() => {
            setGameState(prev => ({ ...prev, answerRevealed: true }));
          }}
        />
      )}
      {gameState.gamePhase === 'finished' && (
        <Leaderboard teams={gameState.teams} />
      )}
    </div>
  );
}

export default App;
