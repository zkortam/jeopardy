import { useState } from 'react';
import { GameState } from '../types/game';

interface GameBoardProps {
  gameState: GameState;
  onQuestionSelect: (categoryId: string, questionId: string) => void;
  onScoreChange?: (teamId: string, newScore: number) => void;
  onNewRoom?: () => void;
}

export default function GameBoard({ gameState, onQuestionSelect, onScoreChange, onNewRoom }: GameBoardProps) {
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<string>('');

  const handleScoreEdit = (teamId: string, currentScore: number) => {
    setEditingTeam(teamId);
    setEditScore(currentScore.toString());
  };

  const handleScoreSave = (teamId: string) => {
    const score = parseInt(editScore) || 0;
    onScoreChange?.(teamId, score);
    setEditingTeam(null);
    setEditScore('');
  };

  const handleScoreCancel = () => {
    setEditingTeam(null);
    setEditScore('');
  };
  const getQuestionValue = (value: number) => {
    return `$${value}`;
  };

  const handleCardClick = (categoryId: string, questionId: string) => {
    // Team in control can select questions, then all teams can buzz in
    onQuestionSelect(categoryId, questionId);
  };

  return (
    <div className="relative min-h-screen bg p-8 overflow-hidden">
      
      {/* Subtle background pattern - matching ESA hero */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="triangle-tile-board" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <path
                d="M30 4 L56 48 L4 48 Z"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#triangle-tile-board)" />
        </svg>
        
        {/* Foreground triangle accents */}
        <svg
          className="absolute bottom-0 right-0 w-[500px] h-[500px] translate-x-[20%] translate-y-[25%] pointer-events-none opacity-[0.05]"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 8 L92 82 L8 82 Z"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="0.5"
          />
          <path
            d="M50 20 L80 70 L20 70 Z"
            fill="var(--color-gold)"
            opacity="0.02"
          />
        </svg>
        
        <svg
          className="absolute top-[15%] right-[5%] w-[200px] h-[200px] pointer-events-none opacity-[0.04]"
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

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Team Scores - Cleaner, more minimal */}
        <div className="mb-16 grid grid-cols-2 md:grid-cols-5 gap-6 fade-in-up">
          {gameState.teams.map(team => (
            <div
              key={team.id}
              className={`bg-surface border rounded-gem p-6 transition-all relative ${
                gameState.selectedTeam?.id === team.id
                  ? 'border-gold shadow-stone-md bg-surface-elevated'
                  : 'border-border'
              }`}
            >
              <div className="text-gold text-xs font-medium tracking-wide uppercase mb-3">
                {team.name}
              </div>
              {editingTeam === team.id ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleScoreSave(team.id);
                      if (e.key === 'Escape') handleScoreCancel();
                    }}
                    className="w-full px-3 py-2 border border-gold rounded-gem bg-bg-alt text-text text-2xl font-bold text-center focus:outline-none focus:ring-1 focus:ring-gold"
                    style={{
                      backgroundColor: 'var(--color-bg-alt)',
                      color: 'var(--color-text)',
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleScoreSave(team.id)}
                      className="flex-1 px-3 py-1 bg-gold text-bg rounded-gem text-xs font-medium hover:bg-gold-dark"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleScoreCancel}
                      className="flex-1 px-3 py-1 bg-surface border border-border text-text rounded-gem text-xs font-medium hover:bg-surface-elevated"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-4xl font-bold text-text">
                    ${team.score}
                  </div>
                  {onScoreChange && (
                    <button
                      onClick={() => handleScoreEdit(team.id, team.score)}
                      className="mt-2 text-xs text-text-muted hover:text-gold transition-colors"
                    >
                      Edit Score
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Current Team Indicator and Controls */}
        <div className="mb-12 flex items-center justify-between fade-in-up">
          {gameState.selectedTeam && (
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-gold/5 border border-gold/30 rounded-gem">
              <span className="text-text-muted text-sm uppercase tracking-wide">Current Team</span>
              <div className="w-px h-4 bg-gold/30" />
              <span className="text-2xl font-bold text-gold">{gameState.selectedTeam.name}</span>
            </div>
          )}
          {onNewRoom && (
            <button
              onClick={onNewRoom}
              className="px-6 py-3 bg-surface border border-gold text-gold rounded-gem font-medium text-sm hover:bg-gold/10 transition-all"
            >
              New Room
            </button>
          )}
        </div>

        {/* Game Board - Cleaner table */}
        <div className="overflow-x-auto fade-in-up">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {gameState.categories.map(category => (
                  <th
                    key={category.id}
                    className="bg-surface border border-border text-gold font-bold text-2xl p-8 min-w-[200px] rounded-gem"
                  >
                    {category.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[100, 200, 300, 400, 500].map(value => (
                <tr key={value}>
                  {gameState.categories.map(category => {
                    const question = category.questions.find(
                      q => q.value === value
                    );
                    const isAnswered = question?.answered || false;
                    const canClick = gameState.selectedTeam && !isAnswered;

                    return (
                      <td
                        key={`${category.id}-${value}`}
                        className="border border-border p-5 text-center"
                      >
                        {isAnswered ? (
                          <div className="text-text-subtle text-4xl font-bold py-12">
                            —
                          </div>
                        ) : (
                          <button
                            onClick={() => canClick && handleCardClick(category.id, question!.id)}
                            disabled={!canClick}
                            className={`w-full h-32 rounded-gem text-3xl font-bold transition-all duration-300 ${
                              canClick
                                ? 'bg-surface hover:bg-gold hover:text-bg text-gold border border-border hover:border-gold shadow-stone hover:shadow-stone-md cursor-pointer'
                                : 'bg-bg-alt text-text-subtle border border-border cursor-not-allowed opacity-40'
                            }`}
                          >
                            {getQuestionValue(value)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
