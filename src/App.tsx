/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/layout/Layout';
import { NavItem } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { ClassesPage } from './pages/ClassesPage';
import { FeesPage } from './pages/FeesPage';
import { AttendancePage } from './pages/AttendancePage';
import { ReportsPage } from './pages/ReportsPage';
import { StaffPage } from './pages/StaffPage';
import { SettingsPage } from './pages/SettingsPage';
import { SchoolClass, AcademicSession } from './types';
import { getClasses, getAcademicSessions, DEFAULT_SCHOOL_SETTINGS } from './services/db';
import { School, Loader2 } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, loading, isAccounts, isPrincipal } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('session_2024_2025');
  const [dataLoading, setDataLoading] = useState(true);

  // Load classes and academic sessions on mount
  const loadSystemBaseData = async () => {
    try {
      const [clsList, sessList] = await Promise.all([
        getClasses(),
        getAcademicSessions(),
      ]);
      setClasses(clsList);
      setSessions(sessList);

      const defaultSess = sessList.find(s => s.isDefault) || sessList[0];
      if (defaultSess) {
        setSelectedSessionId(defaultSess.id);
      }
    } catch (err) {
      console.error('Failed loading system base data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadSystemBaseData();
    }
  }, [currentUser]);

  // Loading state
  if (loading || (currentUser && dataLoading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xl shadow-amber-400/20 mb-4 animate-pulse">
          <School className="w-9 h-9" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">Workers Model Higher Secondary School Pishin</h2>
        <p className="text-xs text-amber-400 mt-1 font-semibold uppercase tracking-wider">
          Connecting to Cloud Firestore...
        </p>
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin mt-4" />
      </div>
    );
  }

  // Not logged in -> Show login page
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <Layout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      sessions={sessions}
      selectedSessionId={selectedSessionId}
      setSelectedSessionId={setSelectedSessionId}
    >
      {currentTab === 'dashboard' && (
        <DashboardPage
          currentSessionId={selectedSessionId}
          classes={classes}
          sessions={sessions}
          onNavigate={tab => setCurrentTab(tab)}
          onOpenAddStudent={() => setCurrentTab('students')}
          onOpenRecordPayment={() => setCurrentTab('fees')}
          onOpenMarkAttendance={() => setCurrentTab('attendance')}
        />
      )}

      {currentTab === 'students' && (
        <StudentsPage
          currentSessionId={selectedSessionId}
          classes={classes}
          sessions={sessions}
        />
      )}

      {currentTab === 'classes' && (
        <ClassesPage
          classes={classes}
          sessions={sessions}
          onRefreshData={loadSystemBaseData}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
        />
      )}

      {currentTab === 'fees' && isAccounts && (
        <FeesPage
          currentSessionId={selectedSessionId}
          classes={classes}
          sessions={sessions}
        />
      )}

      {currentTab === 'attendance' && (
        <AttendancePage
          currentSessionId={selectedSessionId}
          classes={classes}
          sessions={sessions}
        />
      )}

      {currentTab === 'reports' && (isAccounts || isPrincipal) && (
        <ReportsPage
          currentSessionId={selectedSessionId}
          classes={classes}
          sessions={sessions}
        />
      )}

      {currentTab === 'staff' && (
        <StaffPage classes={classes} />
      )}

      {currentTab === 'settings' && (
        <SettingsPage />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
