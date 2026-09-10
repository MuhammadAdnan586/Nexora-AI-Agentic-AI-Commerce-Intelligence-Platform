"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

interface AuthContextType {
  token: string | null;
  login: (accessToken: string, admin?: boolean) => void;
  logout: (admin?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (stored) setToken(stored);
  }, []);

  const login = (accessToken: string, admin: boolean = false) => {
    if (admin) {
      localStorage.setItem("admin_access_token", accessToken);
    } else {
      localStorage.setItem("access_token", accessToken);
      setToken(accessToken);
    }
  };

  const logout = (admin: boolean = false) => {
    if (admin) {
      localStorage.removeItem("admin_access_token");
    } else {
      localStorage.removeItem("access_token");
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const isAdminSection = window.location.pathname.startsWith("/admin");
  const tokenKey = isAdminSection ? "admin_access_token" : "access_token";
  const token = localStorage.getItem(tokenKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});