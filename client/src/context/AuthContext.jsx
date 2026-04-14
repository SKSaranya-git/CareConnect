import { createContext, useContext, useEffect, useState } from "react";
import { gateway } from "../api/gateway";
import { clearToken, getToken, setToken } from "../lib/storage";

const AuthContext = createContext(null);

export function normalizeUser(u) {
  if (!u) return null;
  const id = u.id ?? u._id;
  return {
    id: id ? String(id) : null,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    doctorApproval: u.doctorApproval
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    gateway.auth
      .me()
      .then((res) => setUser(normalizeUser(res.data.user)))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await gateway.auth.login({ email, password });
    setToken(res.data.accessToken);
    const u = normalizeUser(res.data.user);
    setUser(u);
    return u;
  }

  async function register(payload) {
    const res = await gateway.auth.register(payload);
    setToken(res.data.accessToken);
    const u = normalizeUser(res.data.user);
    setUser(u);
    return u;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
