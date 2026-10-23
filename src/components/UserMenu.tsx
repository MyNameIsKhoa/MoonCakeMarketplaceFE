import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Package, ShieldCheck, Store as StoreIcon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/permissions';
import { SUPPLIER_VERIFICATION } from '../utils/status';

interface UserMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
}

/** Navbar account area: login/register for guests, account dropdown with role-based links otherwise. */
export default function UserMenu({ activeTab, setActiveTab, onLogin, onRegister, onLogout }: UserMenuProps) {
  const { status, user, isAdmin, isSupplier, supplierProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (status === 'loading') {
    return <span className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" aria-label="Đang tải tài khoản" />;
  }

  if (status === 'guest') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onLogin}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${activeTab === 'login' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          Đăng nhập
        </button>
        <button
          onClick={onRegister}
          className="hidden sm:inline-flex px-3 py-2 rounded-xl text-sm font-semibold border border-primary-700 text-primary-700 hover:bg-primary-50 transition"
        >
          Đăng ký
        </button>
      </div>
    );
  }

  const displayName = user?.fullName || user?.email || 'Tài khoản';
  const roleLabel = isAdmin ? ROLE_LABELS.admin : isSupplier ? ROLE_LABELS.supplier : ROLE_LABELS.customer;

  const go = (tab: string) => {
    setActiveTab(tab);
    setOpen(false);
  };

  const item = (tab: string, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => go(tab)}
      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition ${activeTab === tab ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 p-1 pr-2 rounded-full transition ${open || activeTab === 'profile' ? 'bg-primary-100' : 'hover:bg-gray-100'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={displayName}
      >
        <span className="w-8 h-8 rounded-full bg-accent-400 text-primary-950 font-bold text-sm flex items-center justify-center">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-accent-200 shadow-2xl py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="font-bold text-sm text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {roleLabel}
            </span>
          </div>

          <div className="py-1">
            {item('profile', 'Tài khoản của tôi', <User className="w-4 h-4" />)}
            {item('orders', 'Đơn hàng của tôi', <Package className="w-4 h-4" />)}
            {isSupplier
              ? item('seller-center', 'Kênh Người Bán', <StoreIcon className="w-4 h-4" />)
              : item('seller-center', supplierProfile
                ? `Hồ sơ nhà cung cấp (${SUPPLIER_VERIFICATION[supplierProfile.verificationStatus]?.label ?? supplierProfile.verificationStatus})`
                : 'Trở thành nhà cung cấp', <StoreIcon className="w-4 h-4" />)}
            {isAdmin && item('admin', 'Duyệt nhà cung cấp', <ShieldCheck className="w-4 h-4" />)}
          </div>

          <div className="pt-1 border-t border-gray-100">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 text-red-700 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
