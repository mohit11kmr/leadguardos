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
  signOut: async () => {},
  isAdmin: false,
  isAgency: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(data);
          } else {
            // New user registration in Firestore
            const initialRole: 'USER' | 'AGENCY' | 'ADMIN' =
              firebaseUser.email?.toLowerCase().includes('mohit') || firebaseUser.email?.toLowerCase().includes('admin')
                ? 'ADMIN'
                : 'USER';
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'LeadGuard Member',
              photoURL: firebaseUser.photoURL || undefined,
              role: initialRole,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error('[AuthContext] Error loading user profile:', err);
        }
      } else {
        setProfile(null);
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

      const role: 'USER' | 'AGENCY' | 'ADMIN' = snap.exists()
        ? snap.data().role || 'USER'
        : (u.email?.toLowerCase().includes('mohit') || u.email?.toLowerCase().includes('admin') ? 'ADMIN' : 'USER');

      const userProf: UserProfile = {
        id: u.uid,
        email: u.email || '',
        displayName: u.displayName || 'LeadGuard Member',
        photoURL: u.photoURL || undefined,
        role,
        createdAt: snap.exists() ? snap.data().createdAt : new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await setDoc(userRef, userProf, { merge: true });
      setProfile(userProf);
    } catch (err: any) {
      console.error('[AuthContext] Google sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('[AuthContext] Sign-out failed:', err);
    }
  };

  const switchRole = async (newRole: 'USER' | 'AGENCY' | 'ADMIN') => {
    if (!user || !profile) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { role: newRole }, { merge: true });
      setProfile({ ...profile, role: newRole });
    } catch (err) {
      console.error('[AuthContext] Failed to switch role:', err);
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
