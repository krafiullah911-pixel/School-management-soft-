import React, { useState } from 'react';
import { Sidebar, NavItem } from './Sidebar';
import { Header } from './Header';
import { AcademicSession } from '../../types';

interface LayoutProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  sessions: AcademicSession[];
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main body wrapper with margin for fixed sidebar on lg screens */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
};
