import React from 'react';
import { ShieldCheck, Store as StoreIcon, Truck } from 'lucide-react';
import { ApiError } from '../../services/api';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  /** Why the user was sent here, e.g. "Đăng nhập để thanh toán". */
  notice?: string;
  children: React.ReactNode;
}

/** Two-column shell shared by the login and register pages. */
export default function AuthLayout({ title, subtitle, notice, children }: AuthLayoutProps) {
  return (
    <div className="mss-container py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-accent-200/70 shadow-xl bg-white max-w-5xl mx-auto">
        <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-950 via-primary-900 to-accent-950 text-white p-10">
          <div>
            <span className="inline-block bg-accent-400 text-primary-950 font-black px-2.5 py-1 rounded text-xs uppercase tracking-wider">
              Mùa Trăng 2026
            </span>
            <h2 className="text-3xl font-black mt-4 leading-tight">Sàn bánh trung thu chính hãng</h2>
            <p className="text-accent-100/80 text-sm mt-3 leading-relaxed">
              Một tài khoản để mua bánh từ nhiều thương hiệu, theo dõi đơn hàng và gửi yêu cầu báo giá doanh nghiệp.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-accent-100">
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-accent-400" /> Gian hàng được sàn xác minh</li>
            <li className="flex items-center gap-2"><Truck className="w-4 h-4 text-accent-400" /> Theo dõi đơn theo từng nhà bán</li>
            <li className="flex items-center gap-2"><StoreIcon className="w-4 h-4 text-accent-400" /> Đăng ký bán hàng ngay trên sàn</li>
          </ul>
        </aside>

        <section className="p-6 sm:p-10">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          {notice && (
            <div className="mss-alert mss-alert--warning mt-4" role="status">{notice}</div>
          )}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  );
}

/** Identity returns English messages; show Vietnamese ones keyed by status instead. */
export function authErrorMessage(err: unknown, action: 'login' | 'register' | 'supplier'): string {
  if (!(err instanceof ApiError)) return 'Đã có lỗi xảy ra, vui lòng thử lại.';
  if (err.status === 0) return err.message;
  if (action === 'login' && err.status === 401) return 'Email hoặc mật khẩu không đúng.';
  if (action === 'login' && err.status === 403) return 'Tài khoản đang bị khóa hoặc chưa được kích hoạt.';
  if (action === 'register' && err.status === 409) return 'Email này đã được đăng ký. Vui lòng đăng nhập.';
  if (action === 'supplier' && err.status === 409) return 'Mã số thuế đã được dùng cho một hồ sơ khác, hoặc tài khoản đã có hồ sơ nhà cung cấp.';
  if (err.status === 400) return 'Thông tin chưa hợp lệ, vui lòng kiểm tra lại các trường.';
  if (err.status >= 500) return 'Máy chủ đang gặp sự cố, vui lòng thử lại sau.';
  return err.message;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
