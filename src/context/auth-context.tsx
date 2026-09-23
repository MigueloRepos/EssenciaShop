import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '@/lib/firebase';
import {
  authenticateBiometric,
  getSavedBiometric,
  registerBiometric,
  removeBiometric,
  type BiometricRecord,
} from '@/lib/biometric';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  hasFingerprintEnrolled: boolean;
  savedBiometricRecord: BiometricRecord | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithPhone: (phone: string, secretOrCode: string) => Promise<void>;
  signUpWithPhone: (phone: string, secretOrCode: string, displayName?: string) => Promise<void>;
  loginWithFingerprint: () => Promise<{ success: boolean; error?: string }>;
  enrollFingerprint: (secretPassword?: string) => Promise<{ success: boolean; error?: string }>;
  removeFingerprint: () => void;
  logOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

export function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/user-not-found':
      return 'No existe ninguna cuenta registrada con estos datos.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciales incorrectas o contraseña no válida.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este correo o número de móvil.';
    case 'auth/weak-password':
      return 'La contraseña debe tener un mínimo de 6 caracteres.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico o teléfono no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Por seguridad, espera unos minutos.';
    case 'auth/popup-closed-by-user':
      return 'Ventana de Google cerrada antes de completar el acceso.';
    default:
      return error?.message || 'Error durante la autenticación.';
  }
}

// Helper to normalize phone numbers to an internal authenticated email
export function phoneToAuthEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return `phone_${digits}@phone.essencia.es`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [savedBio, setSavedBio] = useState<BiometricRecord | null>(null);

  const checkBiometricState = () => {
    const record = getSavedBiometric();
    setSavedBio(record);
  };

  useEffect(() => {
    checkBiometricState();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);

          // Synchronize profile with backend PostgreSQL database
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: currentUser.displayName,
              photoUrl: currentUser.photoURL,
            }),
          });
        } catch (error) {
          console.error('Error syncing auth with database:', error);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // If user has biometric registered with this email, update/keep token
      const existingBio = getSavedBiometric();
      if (existingBio && existingBio.email.toLowerCase() === email.trim().toLowerCase()) {
        registerBiometric(cred.user.uid, cred.user.email || email, cred.user.displayName || undefined, password);
        checkBiometricState();
      }
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName?.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
    } catch (error) {
      console.error('Email sign-up error:', error);
      throw error;
    }
  };

  const signInWithPhone = async (phone: string, secretOrCode: string) => {
    const email = phoneToAuthEmail(phone);
    try {
      await signInWithEmailAndPassword(auth, email, secretOrCode);
    } catch (error) {
      console.error('Phone sign-in error:', error);
      throw error;
    }
  };

  const signUpWithPhone = async (phone: string, secretOrCode: string, displayName?: string) => {
    const email = phoneToAuthEmail(phone);
    const cleanedDigits = phone.replace(/[^0-9]/g, '');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, secretOrCode);
      const name = displayName?.trim() || `Cliente (+${cleanedDigits})`;
      await updateProfile(cred.user, { displayName: name });
    } catch (error) {
      console.error('Phone sign-up error:', error);
      throw error;
    }
  };

  const enrollFingerprint = async (secretPassword?: string) => {
    if (!user) {
      return { success: false, error: 'Debes haber iniciado sesión para activar la huella dactilar.' };
    }
    const result = await registerBiometric(
      user.uid,
      user.email || `user_${user.uid}@essencia.es`,
      user.displayName || undefined,
      secretPassword
    );
    checkBiometricState();
    return result;
  };

  const loginWithFingerprint = async (): Promise<{ success: boolean; error?: string }> => {
    const result = await authenticateBiometric();
    if (!result.success || !result.record) {
      return { success: false, error: result.error || 'No se pudo verificar la huella' };
    }

    const { email, secretToken } = result.record;

    // If secretToken (password) is stored, authenticate with Firebase
    if (secretToken) {
      try {
        await signInWithEmailAndPassword(auth, email, secretToken);
        return { success: true };
      } catch (err: any) {
        console.warn('Firebase login via secret failed, checking active session:', err);
      }
    }

    // If already current user or session restored
    if (auth.currentUser) {
      setUser(auth.currentUser);
      return { success: true };
    }

    return {
      success: false,
      error: 'La huella fue leída correctamente, pero se requiere reintroducir contraseña una vez para vincularla a este dispositivo.',
    };
  };

  const removeFingerprint = () => {
    removeBiometric();
    checkBiometricState();
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setIdToken(null);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    setIdToken(token);
    return token;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        idToken,
        hasFingerprintEnrolled: Boolean(savedBio),
        savedBiometricRecord: savedBio,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        signUpWithPhone,
        loginWithFingerprint,
        enrollFingerprint,
        removeFingerprint,
        logOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
