/**
 * Who may open which tab. Mirrors the backend rules:
 * - customer: any logged-in account (JWT always has ROLE_CUSTOMER)
 * - supplier: JWT has ROLE_SUPPLIER AND the supplier profile is still VERIFIED
 *             (Catalog requires the role and re-checks VERIFIED via Identity on every write)
 * - admin:    JWT has ROLE_ADMIN (Identity grants it to ADMIN_USER_IDS)
 * Tabs not listed are public. The backend still enforces everything; this only drives the UI.
 */
export type AccessLevel = 'public' | 'customer' | 'supplier' | 'admin';

export const TAB_ACCESS: Record<string, AccessLevel> = {
  checkout: 'customer',
  orders: 'customer',
  profile: 'customer',
  wishlist: 'customer',
  b2b: 'customer',
  'payment-settlement': 'customer',
  'seller-center': 'supplier',
  admin: 'admin'
};

export interface AccessSubject {
  isAuthenticated: boolean;
  isSupplier: boolean;
  isAdmin: boolean;
}

export const accessLevelOf = (tab: string): AccessLevel => TAB_ACCESS[tab] ?? 'public';

export function canAccess(level: AccessLevel, who: AccessSubject): boolean {
  switch (level) {
    case 'public': return true;
    case 'customer': return who.isAuthenticated;
    case 'supplier': return who.isSupplier;
    case 'admin': return who.isAdmin;
  }
}

export const ROLE_LABELS = {
  customer: 'Khách hàng',
  supplier: 'Nhà cung cấp',
  admin: 'Quản trị viên'
} as const;
