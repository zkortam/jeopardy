import { useState, useEffect, useRef } from 'react';
import { Team, GameState, BuzzerPress } from './types/game';
import { gameData } from './data/gameData';
import { generateRoomCode, getGameChannel } from './config/pusher';
import TeamSetup from './components/TeamSetup';
import GameBoard from './components/GameBoard';
import QuestionDisplay from './components/QuestionDisplay';
import Leaderboard from './components/Leaderboard';
import PlayerJoin from './components/PlayerJoin';
import PlayerBuzzer from './components/PlayerBuzzer';
import './App.css';

const STORAGE_KEY = 'jeopardy-game-state';

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

function getInitialState(): GameState {
  const saved = loadGameState();
  if (saved) {
    // Reset timer and active states when loading from storage
    return {
      ...saved,
      timer: 0,
      timerActive: false,
      answerRevealed: false,
      buzzerEnabled: false,
      buzzerPress: null,
      // If we were in answer phase, go back to playing
      gamePhase: saved.gamePhase === 'answer' ? 'playing' : saved.gamePhase,
      // Ensure roomCode exists if we have teams
      roomCode: saved.roomCode || (saved.teams && saved.teams.length > 0 ? generateRoomCode() : null),
      players: saved.players || [],
    };
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
  const [gameState, setGameState] = useState<GameState>(getInitialState);
  const [isPlayerView, setIsPlayerView] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<{ id: string; name: string; teamId: string } | null>(null);
  const pusherChannelRef = useRef<any>(null);
  const teamsRef = useRef<Team[]>([]);

  // Check if this is a player view (based on URL path)
  useEffect(() => {
    const path = window.location.pathname;
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    setIsPlayerView(!isAdmin);
  }, []);

  // Initialize Pusher channel when room code is set (host only)
  useEffect(() => {
    if (!gameState.roomCode || isPlayerView) {
      // Cleanup if room code removed or switching to player view
      if (pusherChannelRef.current) {
        pusherChannelRef.current.unbind_all();
        pusherChannelRef.current.unsubscribe();
        pusherChannelRef.current = null;
      }
      return;
    }

    // Unsubscribe from old channel if room code changed
    if (pusherChannelRef.current) {
      pusherChannelRef.current.unbind_all();
      pusherChannelRef.current.unsubscribe();
    }

    const channel = getGameChannel(gameState.roomCode);
    pusherChannelRef.current = channel;

    // Enable client events
    channel.bind('pusher:subscription_succeeded', () => {
      // Send teams list to players immediately when channel is ready
      // Use ref to get latest teams without state delay
      if (pusherChannelRef.current === channel && teamsRef.current.length > 0) {
        channel.trigger('client-teams-list', { teams: teamsRef.current });
      }
    });

    // Listen for buzzer presses
    channel.bind('client-buzz', (data: BuzzerPress) => {
      setGameState(prev => {
        // Only process if buzzer is enabled and no one has buzzed yet
        if (!prev.buzzerEnabled || prev.buzzerPress) {
          return prev;
        }

        // Find the team that buzzed in
        const buzzingTeam = prev.teams.find(t => t.id === data.teamId);
        
        // Validate team exists
        if (!buzzingTeam) {
          console.warn('Buzzer press from unknown team:', data.teamId);
          return prev;
        }
        
        // If in steal phase, don't allow the team that got it wrong to buzz
        if (prev.gamePhase === 'steal' && prev.currentTeam && buzzingTeam.id === prev.currentTeam.id) {
          return prev; // Ignore buzz from team that already got it wrong
        }

        const newState = {
          ...prev,
          buzzerPress: data,
          buzzerEnabled: false, // Lock buzzer after first press
          currentTeam: buzzingTeam, // Set the team that buzzed in
        };

        // If in steal phase, automatically transition to answer phase
        if (prev.gamePhase === 'steal') {
          newState.stealTeam = buzzingTeam;
          newState.gamePhase = 'answer';
          newState.timer = 15;
          newState.timerActive = true;
          newState.answerRevealed = false;
        }

        return newState;
      });

      // Broadcast that buzzer was pressed (outside state update to avoid race conditions)
      setTimeout(() => {
        if (pusherChannelRef.current === channel) {
          channel.trigger('client-buzzer-pressed', { playerId: data.playerId });
        }
      }, 0);
    });

    // Listen for team list requests - respond immediately with current teams from ref
    channel.bind('client-request-teams', () => {
      if (pusherChannelRef.current === channel && teamsRef.current.length > 0) {
        // Use ref to get latest teams immediately without state delay
        channel.trigger('client-teams-list', { teams: teamsRef.current });
      }
    });

    return () => {
      if (pusherChannelRef.current === channel) {
        channel.unbind_all();
        channel.unsubscribe();
        pusherChannelRef.current = null;
      }
    };
  }, [gameState.roomCode, isPlayerView]); // Removed buzzerEnabled, buzzerPress, teams from deps to prevent rebinding

  // Broadcast buzzer state changes and teams updates
  useEffect(() => {
    if (!pusherChannelRef.current || !gameState.roomCode || isPlayerView) return;

    // Small delay to ensure state is set before broadcasting
    const timeoutId = setTimeout(() => {
      if (gameState.buzzerEnabled) {
        pusherChannelRef.current?.trigger('client-buzzer-enabled', {});
      } else {
        pusherChannelRef.current?.trigger('client-buzzer-disabled', {});
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [gameState.buzzerEnabled, gameState.roomCode, isPlayerView]);

  // Broadcast teams list when it changes
  useEffect(() => {
    if (!pusherChannelRef.current || !gameState.roomCode || isPlayerView) return;
    if (gameState.teams.length > 0) {
      pusherChannelRef.current.trigger('client-teams-list', { teams: gameState.teams });
    }
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
    const roomCode = generateRoomCode();
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
    } else {
      // Go to steal phase - enable buzzer for all OTHER teams
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
    } else {
      // Wrong steal - go back to steal phase, enable buzzer for remaining teams
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

  // Get room code from URL (path or query param)
  const getRoomCodeFromURL = (): string | null => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if room code is in path (e.g., /room/ABC123)
    const pathMatch = path.match(/\/room\/([A-Z0-9]+)/i);
    if (pathMatch) {
      return pathMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    // Fallback to query parameter - clean it to only alphanumeric
    const roomParam = urlParams.get('room');
    if (roomParam) {
      return roomParam.toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
    }
    
    return null;
  };

  // Subscribe to game state updates for players
  useEffect(() => {
    if (!isPlayerView) return;
    
    const roomCode = getRoomCodeFromURL();
    if (!roomCode) return;

    const channel = getGameChannel(roomCode);
    
    channel.bind('client-buzzer-enabled', () => {
      setGameState(prev => ({ ...prev, buzzerEnabled: true }));
    });

    channel.bind('client-buzzer-disabled', () => {
      setGameState(prev => ({ ...prev, buzzerEnabled: false }));
    });

    channel.bind('client-buzzer-pressed', () => {
      // Someone buzzed
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [isPlayerView]);

  // Subscribe to get teams list for players
  useEffect(() => {
    if (!isPlayerView || playerInfo) return;
    
    const roomCode = getRoomCodeFromURL();
    if (!roomCode) return;

    const channel = getGameChannel(roomCode);
    
    // Request teams immediately and on subscription
    const requestTeams = () => {
      // Request immediately
      channel.trigger('client-request-teams', {});
      // Also request after a short delay to handle race conditions
      setTimeout(() => {
        channel.trigger('client-request-teams', {});
      }, 500);
    };
    
    channel.bind('pusher:subscription_succeeded', requestTeams);
    
    // Also request immediately (in case subscription already succeeded)
    requestTeams();

    channel.bind('client-teams-list', (data: { teams: Team[] }) => {
      const currentRoomCode = getRoomCodeFromURL();
      setGameState(prev => ({
        ...prev,
        teams: data.teams || [],
        // Keep roomCode from URL, don't overwrite it
        roomCode: currentRoomCode || prev.roomCode,
      }));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [isPlayerView, playerInfo]);

  // Player view - show join or buzzer
  if (isPlayerView) {
    const playerRoomCode = getRoomCodeFromURL();
    
    if (!playerRoomCode) {
      return (
        <div className="min-h-screen bg text flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-3xl text-text-muted mb-4">Enter Room Code</div>
            <div className="text-lg text-text-subtle mb-6">Ask the host for the room code</div>
            <div className="mt-6">
              <input
                type="text"
                placeholder="Room Code (e.g., ABC123)"
                className="w-full px-6 py-4 border border-border rounded-gem bg-bg-alt text-text text-center text-2xl font-bold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                style={{
                  backgroundColor: 'var(--color-bg-alt)',
                  color: 'var(--color-text)',
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const code = (e.target as HTMLInputElement).value.trim().toUpperCase();
                    if (code && /^[A-Z0-9]{4,8}$/.test(code)) {
                      window.location.href = `/?room=${code}`;
                    } else {
                      alert('Please enter a valid room code (4-8 letters/numbers)');
                    }
                  }
                }}
              />
              <div className="mt-4 text-sm text-text-subtle">
                Press Enter to join
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!playerInfo) {
      // Always show join screen when room code is present
      // Ensure roomCode is clean (only alphanumeric, uppercase)
      const cleanRoomCode = playerRoomCode ? playerRoomCode.replace(/[^A-Z0-9]/g, '').toUpperCase() : '';
      
      // Show join screen even if teams aren't synced yet - they'll be updated via Pusher
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
        <div className="min-h-screen bg text flex items-center justify-center">
          <div className="text-center text-error">Team not found</div>
        </div>
      );
    }

    return (
      <PlayerBuzzer
        roomCode={playerRoomCode}
        playerId={playerInfo.id}
        playerName={playerInfo.name}
        team={team}
        buzzerEnabled={gameState.buzzerEnabled}
      />
    );
  }

  // Admin/Host view
  return (
    <div className="min-h-screen bg text">
      {gameState.gamePhase === 'setup' && (
        <TeamSetup onTeamsReady={handleTeamsReady} />
      )}
      {(gameState.gamePhase === 'playing' || gameState.gamePhase === 'team-select') && (
        <>
          {gameState.roomCode && (
            <div className="fixed top-4 right-4 bg-surface border border-gold rounded-gem px-6 py-4 z-50 shadow-stone-md">
              <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Room Code</div>
              <div className="text-3xl font-bold text-gold select-all tracking-wider font-mono">{gameState.roomCode}</div>
            </div>
          )}
          <GameBoard
            gameState={gameState}
            onQuestionSelect={handleQuestionSelect}
            onScoreChange={(teamId, newScore) => {
              setGameState(prev => ({
                ...prev,
                teams: prev.teams.map(team =>
                  team.id === teamId ? { ...team, score: newScore } : team
                ),
              }));
            }}
            onNewRoom={() => {
              if (confirm('Start a new room? This will reset all teams, scores, and game progress. Players will need to rejoin with the new room code.')) {
                const newRoomCode = generateRoomCode();
                
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
                
                // Clear localStorage
                localStorage.removeItem(STORAGE_KEY);
                
                // Broadcast new room code to players
                if (pusherChannelRef.current) {
                  pusherChannelRef.current.trigger('client-new-room', { roomCode: newRoomCode });
                }
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
