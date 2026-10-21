import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  CalendarCheck,
  FileBarChart,
  UserCheck,
  Settings,
  LogOut,
  X,
  School,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export type NavItem =
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'fees'
  | 'attendance'
  | 'reports'
  | 'staff'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose,
}) => {
  const { userProfile, schoolSettings, isSuperAdmin, isPrincipal, isAccounts, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as NavItem,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'students' as NavItem,
      label: 'Students',
      icon: Users,
      allowed: true,
    },
    {
      id: 'classes' as NavItem,
      label: 'Classes & Sections',
      icon: GraduationCap,
      allowed: true,
    },
    {
      id: 'fees' as NavItem,
      label: 'Fee Management',
      icon: CreditCard,
      allowed: isAccounts, // Teachers cannot view private financial records
    },
    {
      id: 'attendance' as NavItem,
      label: 'Attendance Register',
      icon: CalendarCheck,
      allowed: true,
    },
    {
      id: 'reports' as NavItem,
      label: 'Reports & Print',
      icon: FileBarChart,
      allowed: isAccounts || isPrincipal,
    },
    {
      id: 'staff' as NavItem,
      label: 'Staff & Roles',
      icon: UserCheck,
      allowed: isSuperAdmin || isPrincipal,
    },
    {
      id: 'settings' as NavItem,
      label: 'School Settings',
      icon: Settings,
      allowed: isSuperAdmin || isPrincipal,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } print:hidden border-r border-slate-800`}
      >
        {/* School Logo & Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/10 shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white leading-tight truncate">
                {schoolSettings.schoolName || 'Workers Model HSS'}
              </h2>
              <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider mt-0.5">
                Pishin Campus
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {schoolSettings.location || 'Pishin, Balochistan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {userProfile && (
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{userProfile.displayName || 'Authorized Staff'}</p>
                <p className="text-[11px] text-slate-400 truncate">{userProfile.email}</p>
              </div>
              <Badge variant="role" value={userProfile.role} />
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter(item => item.allowed)
            .map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* System Information & Sign Out */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="text-[11px] text-slate-400 px-1">
            <div className="flex justify-between items-center text-[10px]">
              <span>Currency:</span>
              <span className="text-amber-400 font-mono font-bold">PKR (Rs.)</span>
            </div>
            <div className="flex justify-between items-center text-[10px] mt-1">
              <span>Timezone:</span>
              <span className="text-slate-300 font-mono">Asia/Karachi</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/40 hover:bg-rose-900/60 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
