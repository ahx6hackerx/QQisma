import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "../api/client";
import type { AccountType, User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, password: string, accountType: AccountType, phone?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("qisma_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("qisma_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await authApi.login({ email, password });
    localStorage.setItem("qisma_token", data.token);
    setUser(data.user);
    return data.user as User;
  }

  async function register(fullName: string, email: string, password: string, accountType: AccountType, phone?: string) {
    const data = await authApi.register({ fullName, email, password, phone, accountType });
    localStorage.setItem("qisma_token", data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("qisma_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
