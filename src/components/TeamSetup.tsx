import { useState } from 'react';
import { Team } from '../types/game';

interface TeamSetupProps {
  onTeamsReady: (teams: Team[]) => void;
}

export default function TeamSetup({ onTeamsReady }: TeamSetupProps) {
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 },
  ]);

  const handleTeamNameChange = (id: string, name: string) => {
    setTeams(prev =>
      prev.map(team => (team.id === id ? { ...team, name } : team))
    );
  };

  const handleAddTeam = () => {
    if (teams.length < 5) {
      setTeams(prev => [
        ...prev,
        { id: Date.now().toString(), name: '', score: 0 },
      ]);
    }
  };

  const handleRemoveTeam = (id: string) => {
    if (teams.length > 2) {
      setTeams(prev => prev.filter(team => team.id !== id));
    }
  };

  const handleStart = () => {
    const validTeams = teams.filter(team => team.name.trim() !== '');
    if (validTeams.length >= 2) {
      onTeamsReady(validTeams);
    }
  };

  const canStart = teams.filter(t => t.name.trim() !== '').length >= 2;

  return (
    <div className="relative min-h-screen bg flex items-center justify-center p-8 overflow-hidden">
      {/* Subtle triangular pattern background - matching ESA hero */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="triangle-tile-setup" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <path
                d="M30 4 L56 48 L4 48 Z"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#triangle-tile-setup)" />
        </svg>
        
        {/* Foreground triangles - subtle accents */}
        <svg
          className="absolute bottom-0 right-0 w-[400px] h-[400px] translate-x-[25%] translate-y-[30%] pointer-events-none opacity-[0.06]"
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
          className="absolute top-0 left-0 w-[300px] h-[300px] -translate-x-[30%] -translate-y-[30%] pointer-events-none opacity-[0.05]"
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

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-16 fade-in-up">
          <img
            src="/ESU (1080 x 1350 px) (1).png"
            alt="ESA @ UCSD Logo"
            className="h-24 w-auto mx-auto mb-12"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Team Setup Card */}
        <div className="bg-surface border border-border rounded-gem p-12 mb-10 fade-in-up">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold mb-4 text-text">
              Team Setup
            </h2>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-px bg-gold" />
              <svg className="w-3 h-3 text-gold opacity-60" viewBox="0 0 20 20">
                <path d="M10 2 L18 16 L2 16 Z" fill="currentColor" />
              </svg>
              <div className="w-12 h-px bg-gold" />
            </div>
            <p className="text-text-muted text-lg">
              Enter team names (2-5 teams required)
            </p>
          </div>

          <div className="space-y-5 mb-10">
            {teams.map((team, index) => (
              <div key={team.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={team.name}
                    onChange={e => handleTeamNameChange(team.id, e.target.value)}
                    placeholder={`Team ${index + 1}`}
                    className="w-full px-6 py-4 border border-border rounded-gem placeholder-text-subtle focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all text-lg"
                    style={{
                      backgroundColor: 'var(--color-bg-alt)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                {teams.length > 2 && (
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className="px-6 py-4 bg-surface hover:bg-surface-elevated text-text-muted hover:text-error border border-border hover:border-error rounded-gem transition-all font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {teams.length < 5 && (
            <button
              onClick={handleAddTeam}
              className="w-full py-4 bg-surface hover:bg-surface-elevated text-gold border border-gold rounded-gem transition-all mb-6 font-medium text-lg"
            >
              + Add Team
            </button>
          )}
        </div>

        {/* Start Button */}
        <div className="text-center fade-in-up">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`px-20 py-5 rounded-gem font-semibold text-xl transition-all ${
              canStart
                ? 'bg-gold text-bg hover:bg-gold-dark shadow-stone hover:shadow-stone-md'
                : 'bg-surface text-text-subtle cursor-not-allowed border border-border'
            }`}
          >
            Start Game
          </button>
          {!canStart && (
            <p className="text-text-subtle mt-8 text-lg">
              Please enter at least 2 team names
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
