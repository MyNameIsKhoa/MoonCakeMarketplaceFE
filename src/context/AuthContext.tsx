/**
 * Logged-in user, roles and supplier status for the whole app.
 *
 * The access token is stored by services/api/http (localStorage) and restored on reload; roles and expiry
 * are read from the JWT payload, the profile from GET /api/users/me, the supplier status from
 * GET /api/supplier-profile (404 = not a supplier).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ApiError, authApi, getAccessToken, isTokenExpired, readTokenPayload, setAccessToken, supplierProfileApi, userApi,
  UNAUTHORIZED_EVENT,
  type RegisterRequest, type SupplierProfileRequest, type SupplierProfileResponse, type UserProfileResponse
} from '../services/api';

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: UserProfileResponse | null;
  roles: string[];
  supplierProfile: SupplierProfileResponse | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Token has ROLE_SUPPLIER and the profile is still VERIFIED: may use the seller center. */
  isSupplier: boolean;
  /** Profile was verified after this token was issued: log in again to receive ROLE_SUPPLIER. */
  needsReloginForSupplier: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Creates the account and logs in. */
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => void;
  /** Applies (or re-applies after REJECTED) as a supplier; the profile goes to PENDING. */
  submitSupplierProfile: (input: SupplierProfileRequest) => Promise<SupplierProfileResponse>;
  refreshSupplierProfile: () => Promise<void>;
  setUser: (user: UserProfileResponse) => void;
}

/** Roles of a token that is still valid, or null when it is missing/expired/unreadable. */
function readToken(token: string | null): string[] | null {
  if (!token || isTokenExpired(token)) return null;
  return readTokenPayload(token)?.roles ?? [];
}

async function loadSupplierProfile(): Promise<SupplierProfileResponse | null> {
  try {
    return await supplierProfileApi.get();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfileResponse | null>(null);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setRoles([]);
    setSupplierProfile(null);
    setStatus('guest');
  }, []);

  /** Loads the session for the stored token; any failure leaves the app logged out. */
  const loadSession = useCallback(async () => {
    const tokenRoles = readToken(getAccessToken());
    if (!tokenRoles) {
      clear();
      return;
    }
    try {
      const [me, supplier] = await Promise.all([userApi.me(), loadSupplierProfile()]);
      setUser(me);
      setRoles(tokenRoles);
      setSupplierProfile(supplier);
      setStatus('authenticated');
    } catch {
      clear();
    }
  }, [clear]);

  useEffect(() => {
    void loadSession();
    const onUnauthorized = () => clear();
    globalThis.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => globalThis.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [loadSession, clear]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email: email.trim(), password });
    setAccessToken(result.accessToken);
    await loadSession();
  }, [loadSession]);

  const register = useCallback(async (input: RegisterRequest) => {
    await authApi.register({ ...input, email: input.email.trim() });
    await login(input.email, input.password);
  }, [login]);

  const submitSupplierProfile = useCallback(async (input: SupplierProfileRequest) => {
    const saved = supplierProfile ? await supplierProfileApi.update(input) : await supplierProfileApi.create(input);
    setSupplierProfile(saved);
    return saved;
  }, [supplierProfile]);

  const refreshSupplierProfile = useCallback(async () => {
    setSupplierProfile(await loadSupplierProfile());
  }, []);

  const value = useMemo<AuthState>(() => {
    const authenticated = status === 'authenticated';
    const profileVerified = supplierProfile?.verificationStatus === 'VERIFIED';
    const hasSupplierRole = roles.includes('ROLE_SUPPLIER');
    return {
      status,
      user,
      roles,
      supplierProfile,
      isAuthenticated: authenticated,
      isAdmin: authenticated && roles.includes('ROLE_ADMIN'),
      // Both: the role gates Catalog writes, the live status catches a supplier suspended after login.
      isSupplier: authenticated && hasSupplierRole && profileVerified,
      needsReloginForSupplier: authenticated && profileVerified && !hasSupplierRole,
      login,
      register,
      logout: clear,
      submitSupplierProfile,
      refreshSupplierProfile,
      setUser
    };
  }, [status, user, roles, supplierProfile, login, register, clear, submitSupplierProfile, refreshSupplierProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
