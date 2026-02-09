import { useState } from 'react';
import { Team } from '../types/game';

interface PlayerJoinProps {
  roomCode: string;
  teams: Team[];
  onJoin: (playerId: string, name: string, teamId: string) => void;
}

export default function PlayerJoin({ roomCode, teams, onJoin }: PlayerJoinProps) {
  // Ensure roomCode is clean
  const cleanRoomCode = roomCode ? roomCode.replace(/[^A-Z0-9]/g, '').toUpperCase() : '';
  
  const [name, setName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (isJoining) return;
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (teams.length === 0) {
      setError('Waiting for teams to be created. Please wait and try again.');
      return;
    }
    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }
    setIsJoining(true);
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    onJoin(playerId, name.trim(), selectedTeamId);
  };

  return (
    <div className="relative min-h-screen bg flex items-center justify-center p-8 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="triangle-join" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <path
                d="M30 4 L56 48 L4 48 Z"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#triangle-join)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-surface border border-border rounded-gem p-12 fade-in-up">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-display font-bold mb-4 text-text">
              Join Game
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-px bg-gold" />
              <svg className="w-3 h-3 text-gold opacity-60" viewBox="0 0 20 20">
                <path d="M10 2 L18 16 L2 16 Z" fill="currentColor" />
              </svg>
              <div className="w-12 h-px bg-gold" />
            </div>
            <div className="text-2xl text-gold font-bold mb-2 font-mono tracking-wider">
              Room Code: <span className="select-all">{cleanRoomCode}</span>
            </div>
            <div className="text-text-muted text-lg">
              Enter your name and select your team
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-text-muted text-sm mb-3 uppercase tracking-wide">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Enter your name"
                className="w-full px-6 py-4 border border-border rounded-gem placeholder-text-subtle focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all text-lg bg-bg-alt text-text"
                style={{
                  backgroundColor: 'var(--color-bg-alt)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-text-muted text-sm mb-3 uppercase tracking-wide">
                Select Team
              </label>
              {teams.length === 0 ? (
                <div className="bg-surface border border-border rounded-gem p-6 text-center">
                  <div className="text-text-muted mb-2">Waiting for teams...</div>
                  <div className="text-sm text-text-subtle">The host needs to create teams first</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setError('');
                      }}
                      className={`px-6 py-4 border rounded-gem transition-all font-medium text-lg ${
                        selectedTeamId === team.id
                          ? 'bg-gold text-bg border-gold shadow-stone-md'
                          : 'bg-surface text-text border-border hover:border-gold hover:bg-surface-elevated'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-error text-center text-lg">{error}</div>
            )}
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining}
            aria-busy={isJoining}
            className="w-full px-10 py-5 bg-gold hover:bg-gold-dark text-bg rounded-gem font-semibold text-xl transition-all shadow-stone hover:shadow-stone-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
