import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'PATHOLOGIST' | 'HISTOTECH' | 'INTAKE_CLERK' | 'QA_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  stationDefault: string;
  allowedStations: string[];
}

interface StoredAccount extends User {
  passwordHash: string;
}

// Internal accounts verification registry
const VALID_ACCOUNTS: StoredAccount[] = [
  {
    id: 'user-admin-master',
    name: 'Master Administrator / Lab Director',
    email: 'admin@pathoflow.hospital',
    username: 'admin',
    passwordHash: 'MasterAdmin2026!',
    role: 'ADMIN',
    stationDefault: '/dashboard',
    allowedStations: ['*']
  },
  {
    id: 'user-path-1',
    name: 'Dr. Sarah Cameron, MD',
    email: 'cameron@pathoflow.hospital',
    username: 'cameron',
    passwordHash: 'Pathologist@123',
    role: 'PATHOLOGIST',
    stationDefault: '/pathologist',
    allowedStations: ['/pathologist', '/lineage', '/dashboard']
  },
  {
    id: 'user-tech-1',
    name: 'Marcus Vance, HTL(ASCP)',
    email: 'vance@pathoflow.hospital',
    username: 'vance',
    passwordHash: 'Histotech@123',
    role: 'HISTOTECH',
    stationDefault: '/grossing-microtomy',
    allowedStations: ['/grossing-microtomy', '/lineage']
  },
  {
    id: 'user-clerk-1',
    name: 'Jessica Reynolds',
    email: 'reynolds@pathoflow.hospital',
    username: 'reynolds',
    passwordHash: 'Intake@123',
    role: 'INTAKE_CLERK',
    stationDefault: '/intake',
    allowedStations: ['/intake', '/lineage']
  },
  {
    id: 'user-qa-1',
    name: 'Dr. David Kim, Quality Dir.',
    email: 'dkim@pathoflow.hospital',
    username: 'dkim',
    passwordHash: 'QAManager@123',
    role: 'QA_MANAGER',
    stationDefault: '/dashboard',
    allowedStations: ['/dashboard', '/lineage', '/pathologist']
  }
];

interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  authenticate: (identifier: string, password: string) => AuthResult;
  logout: () => void;
  isAuthenticated: boolean;
  canAccessStation: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'pathoflow_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const authenticate = (identifier: string, password: string): AuthResult => {
    const cleanId = identifier.trim().toLowerCase();
    const account = VALID_ACCOUNTS.find(
      (acc) =>
        acc.username.toLowerCase() === cleanId ||
        acc.email.toLowerCase() === cleanId
    );

    if (!account) {
      return { success: false, error: 'User account not found' };
    }

    if (account.passwordHash !== password) {
      return { success: false, error: 'Invalid password' };
    }

    const { passwordHash: _, ...authenticatedUser } = account;
    setUser(authenticatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
    return { success: true, user: authenticatedUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const canAccessStation = (path: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.allowedStations.includes('*')) return true;
    return user.allowedStations.some((allowed) => path.startsWith(allowed));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticate,
        logout,
        isAuthenticated: !!user,
        canAccessStation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
