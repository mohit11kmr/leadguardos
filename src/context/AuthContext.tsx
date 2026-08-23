import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  User
} from '../lib/firebase';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'USER' | 'AGENCY' | 'ADMIN';
  createdAt: string;
  lastLoginAt: string;
  savedScansCount?: number;
  activeMonitorsCount?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginAsDemoUser: (email: string, role?: 'USER' | 'AGENCY' | 'ADMIN', name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAgency: boolean;
  switchRole?: (role: 'USER' | 'AGENCY' | 'ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  loginAsDemoUser: async () => {},
  signOut: async () => {},
  isAdmin: false,
  isAgency: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore local session on initial mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('lg_user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
      } catch (e) {
        console.error('[AuthContext] Failed to parse saved session:', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(data);
            localStorage.setItem('lg_user_profile', JSON.stringify(data));
          } else {
            // New user registration in Firestore
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'LeadGuard Member',
              photoURL: firebaseUser.photoURL || undefined,
              role: firebaseUser.email === 'mohitsikarwar123@gmail.com' ? 'ADMIN' : 'USER',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
            localStorage.setItem('lg_user_profile', JSON.stringify(newProfile));
          }
        } catch (err) {
          console.error('[AuthContext] Error loading user profile:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const userRef = doc(db, 'users', u.uid);
      const snap = await getDoc(userRef);

      const defaultRole = u.email === 'mohitsikarwar123@gmail.com' ? 'ADMIN' : 'USER';

      const role: 'USER' | 'AGENCY' | 'ADMIN' = snap.exists()
        ? snap.data().role || defaultRole
        : defaultRole;

      const userProf: UserProfile = {
        id: u.uid,
        email: u.email || '',
        displayName: u.displayName || 'LeadGuard Member',
        photoURL: u.photoURL || undefined,
        role,
        createdAt: snap.exists() ? snap.data().createdAt : new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await setDoc(userRef, userProf, { merge: true }).catch(() => {});
      setProfile(userProf);
      localStorage.setItem('lg_user_profile', JSON.stringify(userProf));
    } catch (err: any) {
      console.error('[AuthContext] Google sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = async (email: string, role: 'USER' | 'AGENCY' | 'ADMIN' = 'USER', name?: string) => {
    const isFounder = email === 'mohitsikarwar123@gmail.com';
    const computedRole = isFounder ? 'ADMIN' : role;
    const computedName = name || (isFounder ? 'Mohit Sikarwar' : email.split('@')[0]);

    const demoProfile: UserProfile = {
      id: `usr_${Date.now()}`,
      email,
      displayName: computedName,
      role: computedRole,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    setProfile(demoProfile);
    localStorage.setItem('lg_user_profile', JSON.stringify(demoProfile));
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth).catch(() => {});
      setUser(null);
      setProfile(null);
      localStorage.removeItem('lg_user_profile');
    } catch (err) {
      console.error('[AuthContext] Sign-out failed:', err);
    }
  };

  const switchRole = async (newRole: 'USER' | 'AGENCY' | 'ADMIN') => {
    if (!profile) return;
    const updated = { ...profile, role: newRole };
    setProfile(updated);
    localStorage.setItem('lg_user_profile', JSON.stringify(updated));
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { role: newRole }, { merge: true }).catch(() => {});
    }
  };

  const isAdmin = profile?.role === 'ADMIN';
  const isAgency = profile?.role === 'AGENCY' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        loginAsDemoUser,
        signOut,
        isAdmin,
        isAgency,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
