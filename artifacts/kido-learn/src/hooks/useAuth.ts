import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { getStoredUser, setStoredUser, setToken, clearAuth, type StoredUser } from "../lib/store";

export function useAuth() {
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res: any = await api.auth.login({ email, password });
      setToken(res.token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: object) => {
    setLoading(true);
    try {
      const res: any = await api.auth.register(data);
      setToken(res.token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    clearAuth();
    setUser(null);
  }, []);

  const loginWithFace = useCallback(async (descriptor: number[]) => {
    const res: any = await api.face.verify(descriptor);
    if (res.match && res.user) {
      const loginRes: any = await api.auth.login({ email: res.user.email, password: "__face__" }).catch(() => null);
      return res;
    }
    return res;
  }, []);

  const updateUser = useCallback((u: StoredUser) => {
    setStoredUser(u);
    setUser(u);
  }, []);

  return { user, loading, login, register, logout, loginWithFace, updateUser };
}
