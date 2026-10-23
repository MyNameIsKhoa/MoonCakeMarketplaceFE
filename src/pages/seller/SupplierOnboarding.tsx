import React, { useState } from 'react';
import { Building2, Clock, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { SUPPLIER_VERIFICATION } from '../../utils/status';
import { formatDateTime } from '../../utils/format';
import { authErrorMessage } from '../auth/AuthLayout';

interface SupplierOnboardingProps {
  onBackToShop: () => void;
}

/**
 * Shown instead of the seller center while the user is not a VERIFIED supplier:
 * apply (no profile), wait (PENDING), fix and resubmit (REJECTED) or contact the platform (SUSPENDED).
 */
export default function SupplierOnboarding({ onBackToShop }: SupplierOnboardingProps) {
  const { supplierProfile, submitSupplierProfile, refreshSupplierProfile } = useAuth();
  const status = supplierProfile?.verificationStatus;
  const [companyName, setCompanyName] = useState(supplierProfile?.companyName ?? '');
  const [taxCode, setTaxCode] = useState(supplierProfile?.taxCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = !status || status === 'REJECTED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !taxCode.trim()) {
      setError('Vui lòng nhập đủ tên công ty và mã số thuế.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitSupplierProfile({ companyName: companyName.trim(), taxCode: taxCode.trim() });
    } catch (err) {
      setError(authErrorMessage(err, 'supplier'));
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      await refreshSupplierProfile();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mss-container mss-page max-w-3xl">
      <header className="mss-page-header">
        <h1 className="mss-page-title">Kênh Người Bán</h1>
        <p className="mss-page-description">
          Chỉ nhà cung cấp đã được sàn xác minh mới có thể tạo gian hàng và đăng bán sản phẩm.
        </p>
      </header>

      {supplierProfile && (
        <section className="mss-card mss-stack">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="mss-card-title flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-700" /> {supplierProfile.companyName}
            </h2>
            <StatusBadge map={SUPPLIER_VERIFICATION} status={status} />
          </div>
          <p className="mss-card-meta">
            Mã số thuế: {supplierProfile.taxCode} · Cập nhật {formatDateTime(supplierProfile.updatedAt)}
          </p>

          {status === 'PENDING' && (
            <div className="mss-alert mss-alert--warning flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Hồ sơ đang chờ quản trị viên xét duyệt. Bạn sẽ dùng được Kênh Người Bán ngay khi hồ sơ được duyệt.</span>
            </div>
          )}
          {status === 'REJECTED' && (
            <div className="mss-alert mss-alert--danger flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Hồ sơ chưa được duyệt. Vui lòng kiểm tra lại thông tin bên dưới và gửi lại.</span>
            </div>
          )}
          {status === 'SUSPENDED' && (
            <div className="mss-alert mss-alert--danger flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Tài khoản nhà cung cấp đang bị tạm khóa. Vui lòng liên hệ sàn qua hotline 1900 1509.</span>
            </div>
          )}

          {!canSubmit && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="mss-button mss-button--secondary" onClick={handleRefresh} disabled={busy}>
                <RefreshCw className="w-4 h-4" /> Kiểm tra lại trạng thái
              </button>
              <button type="button" className="mss-button mss-button--secondary" onClick={onBackToShop}>
                Về trang mua sắm
              </button>
            </div>
          )}
        </section>
      )}

      {canSubmit && (
        <form onSubmit={handleSubmit} className="mss-card mss-stack" noValidate>
          <h2 className="mss-card-title">{status === 'REJECTED' ? 'Gửi lại hồ sơ nhà cung cấp' : 'Đăng ký trở thành nhà cung cấp'}</h2>
          {error && <div className="mss-alert mss-alert--danger" role="alert">{error}</div>}
          <label className="mss-field">
            Tên công ty / xưởng bánh
            <input className="mss-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={255} autoComplete="organization" />
          </label>
          <label className="mss-field">
            Mã số thuế
            <input className="mss-input" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} maxLength={100} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="mss-button mss-button--primary" disabled={busy}>
              {busy ? 'Đang gửi…' : 'Gửi hồ sơ xét duyệt'}
            </button>
            <button type="button" className="mss-button mss-button--secondary" onClick={onBackToShop}>
              Để sau
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
