/**
 * "Đăng nhập với Google" via Google Identity Services (GIS).
 *
 * Only active when VITE_GOOGLE_CLIENT_ID is set: the GIS script (https://accounts.google.com/gsi/client) is loaded
 * on first use, never at app start. GIS returns an ID token (`credential`) that the caller sends to
 * POST /api/auth/google. The client ID must match Identity's GOOGLE_CLIENT_IDS, and the Google Cloud console must list
 * the FE origin (e.g. http://localhost:5173) as an authorized JavaScript origin.
 */
import { useEffect, useRef, useState } from 'react';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
// import.meta.env is undefined outside Vite (scripts/tests): Google sign-in is then simply off.
const GOOGLE_CLIENT_ID = ((import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim();

/** Minimal typing of the part of `google.accounts.id` used here. */
interface GsiId {
  initialize(config: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(parent: HTMLElement, options: {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number;
    locale?: string;
  }): void;
}

const gsi = () => (globalThis as { google?: { accounts?: { id?: GsiId } } }).google?.accounts?.id;

let scriptPromise: Promise<GsiId> | null = null;

function loadGsi(): Promise<GsiId> {
  const ready = gsi();
  if (ready) return Promise.resolve(ready);
  scriptPromise ??= new Promise<GsiId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const id = gsi();
      if (id) resolve(id);
      else reject(new Error('Google Identity Services unavailable'));
    };
    script.onerror = () => {
      // Allow a later mount to retry (e.g. the network came back).
      scriptPromise = null;
      script.remove();
      reject(new Error('Google Identity Services failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// GIS should be initialized once per page; the callback forwards to whichever button is mounted.
let initialized = false;
let activeHandler: ((idToken: string) => void) | null = null;

const isGoogleSignInEnabled = GOOGLE_CLIENT_ID !== '';

interface GoogleSignInButtonProps {
  /** Receives the Google ID token; the caller exchanges it at POST /api/auth/google. */
  onIdToken: (idToken: string) => void;
  text?: 'signin_with' | 'signup_with';
  /** Small note under the button (only shown when Google sign-in is enabled). */
  hint?: string;
}

/** "hoặc" divider + Google's rendered button; renders nothing when VITE_GOOGLE_CLIENT_ID is empty. */
export default function GoogleSignInButton({ onIdToken, text = 'signin_with', hint }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef(onIdToken);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    handlerRef.current = onIdToken;
  }, [onIdToken]);

  useEffect(() => {
    if (!isGoogleSignInEnabled) return;
    let active = true;
    const handler = (idToken: string) => handlerRef.current(idToken);
    loadGsi().then((id) => {
      const container = containerRef.current;
      if (!active || !container) return;
      if (!initialized) {
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => { if (response.credential) activeHandler?.(response.credential); }
        });
        initialized = true;
      }
      activeHandler = handler;
      id.renderButton(container, {
        type: 'standard', theme: 'outline', size: 'large', text, shape: 'rectangular', logo_alignment: 'center',
        locale: 'vi',
        // GIS accepts 200–400 px.
        width: Math.min(400, Math.max(200, container.clientWidth || 320))
      });
    }).catch(() => {
      if (active) setLoadFailed(true);
    });
    return () => {
      active = false;
      if (activeHandler === handler) activeHandler = null;
    };
  }, [text]);

  if (!isGoogleSignInEnabled) return null;

  return (
    <div className="mss-stack" role="group" aria-label="Đăng nhập với Google">
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <hr className="mss-divider flex-1" />
        <span>hoặc</span>
        <hr className="mss-divider flex-1" />
      </div>
      {loadFailed
        ? <p className="text-sm text-gray-500 text-center">Không tải được Đăng nhập với Google. Kiểm tra kết nối mạng rồi tải lại trang.</p>
        : <div ref={containerRef} className="flex justify-center min-h-[44px]" />}
      {hint && <p className="text-xs text-gray-500 text-center m-0">{hint}</p>}
    </div>
  );
}
