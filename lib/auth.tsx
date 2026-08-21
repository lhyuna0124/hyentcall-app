"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Resident } from "./residents";

interface AuthContextValue {
  user: Resident | null;
  login: (r: Resident) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

const STORAGE_KEY = "entcall_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
    setLoading(false);
  }, []);

  function login(r: Resident) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    setUser(r);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
