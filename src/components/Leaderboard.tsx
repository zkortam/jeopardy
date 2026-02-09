import { Team } from '../types/game';

interface LeaderboardProps {
  teams: Team[];
}

export default function Leaderboard({ teams }: LeaderboardProps) {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];

  return (
    <div className="relative min-h-screen bg flex items-center justify-center p-8 overflow-hidden">
      {/* Subtle background pattern - matching ESA hero */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="triangle-leaderboard" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <path
                d="M30 4 L56 48 L4 48 Z"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#triangle-leaderboard)" />
        </svg>
        
        {/* Foreground triangle accents */}
        <svg
          className="absolute top-0 right-0 w-[400px] h-[400px] translate-x-[20%] -translate-y-[20%] pointer-events-none opacity-[0.05]"
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
          className="absolute bottom-0 left-0 w-[300px] h-[300px] -translate-x-[25%] translate-y-[25%] pointer-events-none opacity-[0.04]"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 8 L92 82 L8 82 Z"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="0.6"
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-16 fade-in-up">
          <h1 className="text-7xl font-display font-bold mb-6">
            <span className="text-text">FINAL</span>
            <span className="text-gold"> SCORES</span>
          </h1>
          <div className="w-32 h-0.5 bg-gold mx-auto mb-6"></div>
        </div>

        <div className="bg-surface border border-border rounded-gem p-10 mb-8 surface-stone-elevated fade-in-up">
          {winner && (
            <div className="text-center mb-12">
              <div className="text-4xl text-gold font-bold mb-4">
                🏆 Winner 🏆
              </div>
              <div className="text-5xl font-display font-bold text-text mb-4">
                {winner.name}
              </div>
              <div className="text-6xl font-bold text-gold">
                ${winner.score}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {sortedTeams.map((team, index) => (
              <div
                key={team.id}
                className={`flex items-center justify-between p-6 rounded-gem border transition-all ${
                  index === 0
                    ? 'bg-gold/10 border-gold shadow-stone-md'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`text-4xl font-bold ${
                      index === 0 ? 'text-gold' : 'text-text-subtle'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div className="text-3xl font-semibold text-text">
                    {team.name}
                  </div>
                </div>
                <div
                  className={`text-4xl font-bold ${
                    index === 0 ? 'text-gold' : 'text-text'
                  }`}
                >
                  ${team.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center fade-in-up space-y-4">
          <button
            onClick={() => {
              localStorage.removeItem('jeopardy-game-state');
              window.location.reload();
            }}
            className="px-12 py-5 bg-gold text-bg rounded-gem font-semibold text-lg hover:bg-gold-dark transition-all shadow-stone hover:shadow-stone-md"
          >
            Play Again
          </button>
          <div className="text-text-muted text-sm">
            Or start a new room from the game board
          </div>
        </div>
      </div>
    </div>
  );
}
