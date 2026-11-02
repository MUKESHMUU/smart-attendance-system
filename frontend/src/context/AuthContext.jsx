import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setToken, setUnauthorizedHandler } from '../services/api.js';
import * as auth from '../services/authService.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const clear = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (!getToken()) return;
    auth.fetchMe().then(setUser).catch(clear).finally(() => setLoading(false));
  }, [clear]);

  const signIn = async (id, pw) => { const u = await auth.login(id, pw); setUser(u); return u; };
  const signOut = async () => { await auth.logout(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}
