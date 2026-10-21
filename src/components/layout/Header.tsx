import React from 'react';
import { Menu, ShieldCheck, Database, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AcademicSession } from '../../types';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onToggleSidebar: () => void;
  sessions: AcademicSession[];
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  sessions,
  selectedSessionId,
  setSelectedSessionId,
}) => {
  const { userProfile, connectionHealthy } = useAuth();

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions.find(s => s.isDefault);

  const todayPKT = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  });

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs print:hidden">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Workers Model HSS Pishin</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Fee & Attendance System</span>
          </div>
        </div>

        {/* Right: Academic Session selector, Date, and User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Active Session Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 hidden md:inline text-[11px] font-medium">Session:</span>
            <select
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isDefault ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date pill */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-medium">
            <span>{todayPKT} (PKT)</span>
          </div>

          {/* Connection health */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200" title="Cloud Firestore Persistent Connection Live">
            <Database className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">Firestore Connected</span>
          </div>

          {/* User info */}
          {userProfile && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight">{userProfile.displayName}</p>
                <Badge variant="role" value={userProfile.role} className="mt-0.5" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-amber-400">
                {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
