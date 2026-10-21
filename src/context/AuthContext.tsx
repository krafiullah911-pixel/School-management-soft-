import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, testConnection } from '../firebase';
import { UserProfile, SchoolSetting } from '../types';
import { getUserProfile, saveUserProfile, getSchoolSettings, DEFAULT_SCHOOL_SETTINGS } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  schoolSettings: SchoolSetting;
  loading: boolean;
  connectionHealthy: boolean;
  isSuperAdmin: boolean;
  isPrincipal: boolean;
  isAccounts: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAIL = 'krafiullah911@gmail.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSetting>(DEFAULT_SCHOOL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [connectionHealthy, setConnectionHealthy] = useState(true);

  // Load school settings
  const refreshSettings = async () => {
    try {
      const s = await getSchoolSettings();
      setSchoolSettings(s);
    } catch (e) {
      console.warn('Failed loading school settings:', e);
    }
  };

  const fetchProfile = async (user: User) => {
    try {
      let profile = await getUserProfile(user.uid);
      const isInitialEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

      // If user is the predefined super admin and profile doesn't exist or doesn't have super_admin role
      if (isInitialEmail && (!profile || profile.role !== 'super_admin')) {
        const adminProfile: UserProfile = {
          uid: user.uid,
          email: user.email || SUPER_ADMIN_EMAIL,
          displayName: user.displayName || 'Principal / Super Admin',
          role: 'super_admin',
          isActive: true,
          phone: '',
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(adminProfile);
        profile = adminProfile;
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback for initial admin
      if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Super Admin',
          role: 'super_admin',
          isActive: true,
        });
      }
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  useEffect(() => {
    // Initial connection test
    testConnection().then(healthy => setConnectionHealthy(healthy));
    refreshSettings();

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
        await refreshSettings();
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await fetchProfile(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await fetchProfile(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const isSuperAdmin =
    userProfile?.role === 'super_admin' ||
    currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const isPrincipal = isSuperAdmin || userProfile?.role === 'principal';
  const isAccounts = isPrincipal || userProfile?.role === 'accounts_staff';
  const isTeacher = userProfile?.role === 'teacher';
  const isStaff = isSuperAdmin || Boolean(userProfile?.isActive);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        schoolSettings,
        loading,
        connectionHealthy,
        isSuperAdmin,
        isPrincipal,
        isAccounts,
        isTeacher,
        isStaff,
        loginWithGoogle,
        loginWithEmail,
        logout,
        refreshProfile,
        refreshSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
