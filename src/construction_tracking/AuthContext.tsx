import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, limit } from 'firebase/firestore';
import { auth, db } from './firebase';

export type Role = 'Admin' | 'MD' | 'GM' | 'CD' | 'PCM' | 'HRM' | 'PM' | 'CM' | 'Supervisor' | 'Staff' | 'HR' | 'Procurement' | 'Site Admin';
export type Status = 'Pending' | 'Approved' | 'Rejected';

const googleProvider = new GoogleAuthProvider();

export interface AppUser {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    position: string;
    role: Role;
    status: Status;
    assigned_projects?: string[];
}

interface AuthContextType {
    currentUser: FirebaseUser | null;
    appUser: AppUser | null;
    loading: boolean;
    register: (email: string, password: string, firstName: string, lastName: string, position: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuthContext must be used within AuthProvider");
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Fetch the user's role and status from Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setAppUser({ uid: user.uid, ...userDocSnap.data() } as AppUser);
                } else {
                    setAppUser(null);
                }
            } else {
                setAppUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const register = async (email: string, password: string, firstName: string, lastName: string, position: string) => {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if users collection is empty
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);

        let initialRole: Role = 'Staff';
        let initialStatus: Status = 'Pending';

        if (snapshot.empty) {
            // "First User" Rule
            initialRole = 'Admin';
            initialStatus = 'Approved';
        }

        const newUserProfile: Omit<AppUser, 'uid'> = {
            email,
            firstName,
            lastName,
            position,
            role: initialRole,
            status: initialStatus,
            assigned_projects: []
        };

        // Save into Firestore
        await setDoc(doc(db, 'users', user.uid), newUserProfile);

        // Sign out so user must login after approval
        await signOut(auth);
    };

    const login = async (email: string, password: string) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as Omit<AppUser, 'uid'>;

            // Block Login Logic
            if (userData.status === 'Pending') {
                await signOut(auth);
                const err = new Error("PENDING");
                (err as any).code = 'auth/pending';
                throw err;
            }
            if (userData.status === 'Rejected') {
                await signOut(auth);
                throw new Error("Your account has been rejected. Please contact the administrator.");
            }

            setAppUser({ uid: user.uid, ...userData });
        } else {
            // Corrupted record
            await signOut(auth);
            throw new Error("User record not found in system.");
        }
    };

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as Omit<AppUser, 'uid'>;

            if (userData.status === 'Pending') {
                await signOut(auth);
                const err = new Error("PENDING");
                (err as any).code = 'auth/pending';
                throw err;
            }
            if (userData.status === 'Rejected') {
                await signOut(auth);
                throw new Error("Your account has been rejected. Please contact the administrator.");
            }

            setAppUser({ uid: user.uid, ...userData });
        } else {
            // First time Google login — check if first user ever
            const usersRef = collection(db, 'users');
            const q = query(usersRef, limit(1));
            const snapshot = await getDocs(q);

            let initialRole: Role = 'Staff';
            let initialStatus: Status = 'Pending';

            if (snapshot.empty) {
                initialRole = 'Admin';
                initialStatus = 'Approved';
            }

            const displayName = user.displayName || '';
            const nameParts = displayName.split(' ');

            const newUserProfile: Omit<AppUser, 'uid'> = {
                email: user.email || '',
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                position: '',
                role: initialRole,
                status: initialStatus,
                assigned_projects: []
            };

            await setDoc(doc(db, 'users', user.uid), newUserProfile);

            if (initialStatus === 'Pending') {
                await signOut(auth);
                const err = new Error("PENDING");
                (err as any).code = 'auth/pending';
                throw err;
            }

            setAppUser({ uid: user.uid, ...newUserProfile });
        }
    };

    const logout = async () => {
        await signOut(auth);
        setAppUser(null);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const value = {
        currentUser,
        appUser,
        loading,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
