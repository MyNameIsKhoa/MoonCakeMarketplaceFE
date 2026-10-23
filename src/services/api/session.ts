/**
 * Phiên đăng nhập dùng cho các màn đã nối API thật qua Gateway (hiện là TV4 — RFQ/báo giá/chat).
 * TODO(TV1): thay bằng AuthProvider chung khi có màn đăng nhập/đăng ký; giữ nguyên các hàm export
 * để màn khác không phải sửa. Token chỉ nằm trong sessionStorage của tab, không log ra console.
 */
import { useSyncExternalStore } from 'react';

export interface SessionUser {
  userId: string;
  customerId: string | null;
  fullName: string;
  email: string;
}

export interface Session {
  accessToken: string;
  /** epoch ms */
  expiresAt: number;
  user: SessionUser;
}

const STORAGE_KEY = 'mss.session';
const listeners = new Set<() => void>();
let current: Session | null = readStored();

function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSession(): Session | null {
  if (current && current.expiresAt <= Date.now()) clearSession();
  return current;
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function setSession(session: Session) {
  current = session;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage may be unavailable (private mode); the in-memory session still works for this tab.
  }
  notify();
}

export function clearSession() {
  if (!current) return;
  current = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}
