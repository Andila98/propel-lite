
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { mockUsers } from '@/lib/mock-data';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'landlord' | 'tenant' | 'admin' | 'manager';
  profileComplete: boolean;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ user: User }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for a mock session on initial load
  useEffect(() => {
    try {
        const mockSession = localStorage.getItem('mockSession');
        if (mockSession) {
            setUser(JSON.parse(mockSession));
        }
    } catch (e) {
        console.error("Failed to parse mock session from localStorage", e);
    } finally {
        setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ user: User }> => {
    setLoading(true);
    // Simulate network delay
    await new Promise(res => setTimeout(res, 500));
    
    // In a real app, you'd call your backend here.
    // For this mock version, we'll just find the first landlord.
    const mockLandlord = mockUsers.find(u => u.role === 'landlord');

    if (mockLandlord && email === 'landlord@example.com') { // Simple check for demo
        const loggedInUser = mockLandlord as User;
        setUser(loggedInUser);
        localStorage.setItem('mockSession', JSON.stringify(loggedInUser));
        setLoading(false);
        return { user: loggedInUser };
    } else {
        setLoading(false);
        throw new Error("Invalid mock credentials.");
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    await new Promise(res => setTimeout(res, 500));
    setUser(null);
    localStorage.removeItem('mockSession');
    setLoading(false);
  }, []);


  if (loading && !user) { // Show loader only on initial load without a user
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
