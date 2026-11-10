import { useLayoutEffect, useRef } from 'react';
import type { Location, NavigationType } from 'react-router-dom';

export const pagePaths: Readonly<Record<string, string>> = {
  home: '/', products: '/products', stores: '/stores', orders: '/orders',
  profile: '/profile', b2b: '/b2b', checkout: '/checkout', cart: '/cart',
  'seller-center': '/seller', admin: '/admin', 'payment-settlement': '/payment',
  login: '/login', register: '/register', 'forgot-password': '/forgot-password',
  'registration-complete': '/registration-complete', 'verify-email': '/verify-email',
  'reset-password': '/reset-password'
};

const pages = new Map(Object.entries(pagePaths).map(([page, path]) => [path, page]));

export function storefrontPage(pathname: string): { page: string; id?: string } {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/reset-password') return { page: 'forgot-password' };
  const order = /^\/orders\/([1-9]\d*)$/.exec(path);
  if (order) return { page: 'orders', id: order[1] };
  const detail = /^(\/products|\/stores)\/([^/]+)$/.exec(path);
  if (detail) {
    try {
      return { page: detail[1] === '/products' ? 'detail' : 'store-detail', id: decodeURIComponent(detail[2]) };
    } catch { return { page: 'not-found' }; }
  }
  return { page: pages.get(path) ?? 'not-found' };
}

export function useStorefrontScroll(location: Location, action: NavigationType, ready: boolean, enabled = true) {
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef<string | null>(null);
  const routeState = useRef({ key: location.key, ready, enabled });
  routeState.current = { key: location.key, ready, enabled };

  useLayoutEffect(() => {
    if (!enabled) { currentKey.current = null; return; }
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const remember = () => {
      if (routeState.current.enabled && routeState.current.ready && currentKey.current === routeState.current.key) {
        positions.current.set(currentKey.current, window.scrollY);
      }
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => {
      window.removeEventListener('scroll', remember);
      window.history.scrollRestoration = previous;
    };
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled || !ready || currentKey.current === location.key) return;
    currentKey.current = location.key;
    if (action !== 'REPLACE') {
      window.scrollTo({ top: action === 'POP' ? positions.current.get(location.key) ?? 0 : 0, behavior: 'instant' });
    }
    positions.current.set(location.key, window.scrollY);
  }, [location.key, action, ready, enabled]);
}
