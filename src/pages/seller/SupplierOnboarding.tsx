import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Clock, LogIn, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { supplierDraftStorage } from '../../services/api/identityApi';
import { SUPPLIER_VERIFICATION } from '../../utils/status';
import { formatDateTime } from '../../utils/format';
import { authErrorMessage } from '../auth/AuthLayout';

interface SupplierOnboardingProps {
  onBackToShop: () => void;
  /** Logs out and opens the login page; used when the profile was verified after this login. */
  onRelogin: () => void;
}

/**
 * Shown instead of the seller center while the user is not a VERIFIED supplier:
 * apply (no profile), wait (PENDING), fix and resubmit (REJECTED) or contact the platform (SUSPENDED).
 */
export default function SupplierOnboarding({ onBackToShop, onRelogin }: SupplierOnboardingProps) {
  const { user, supplierProfile, submitSupplierProfile, refreshSupplierProfile } = useAuth();
  const status = supplierProfile?.verificationStatus;
  // Hồ sơ nhập lúc đăng ký (chưa gửi được vì chưa có token) — chỉ dùng khi tài khoản chưa có hồ sơ supplier.
  const [draft] = useState(() => (!supplierProfile && user ? supplierDraftStorage.load(user.email) : null));
  const [companyName, setCompanyName] = useState(supplierProfile?.companyName ?? draft?.companyName ?? '');
  const [taxCode, setTaxCode] = useState(supplierProfile?.taxCode ?? draft?.taxCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoSubmitStarted = useRef(false);

  const canSubmit = !status || status === 'REJECTED';
  /** Lý do admin ghi khi từ chối / tạm khóa; chỉ hiện khi khớp trạng thái hiện tại. */
  const decisionReason = supplierProfile?.lastDecisionStatus === status ? supplierProfile?.lastDecisionReason : null;

  const submit = async (input: { companyName: string; taxCode: string }) => {
    const resubmit = status === 'REJECTED';
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await submitSupplierProfile(input);
      supplierDraftStorage.clear();
      setNotice(resubmit
        ? 'Đã gửi lại hồ sơ. Quản trị viên sẽ xét duyệt lại trong thời gian sớm nhất.'
        : 'Đã gửi hồ sơ nhà cung cấp. Vui lòng chờ quản trị viên xét duyệt.');
      return true;
    } catch (err) {
      setError(authErrorMessage(err, 'supplier'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Tự gửi bản nháp từ form đăng ký một lần; lỗi (vd. trùng mã số thuế) thì giữ nháp để người dùng sửa và gửi tay.
  useEffect(() => {
    if (!draft?.autoSubmit || supplierProfile || autoSubmitStarted.current) return;
    autoSubmitStarted.current = true;
    void submit({ companyName: draft.companyName, taxCode: draft.taxCode }).then((ok) => {
      if (!ok) supplierDraftStorage.save({ ...draft, autoSubmit: false });
    });
  }, [draft, supplierProfile, submit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !taxCode.trim()) {
      setError('Vui lòng nhập đủ tên công ty và mã số thuế.');
      return;
    }
    await submit({ companyName: companyName.trim(), taxCode: taxCode.trim() });
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

      {notice && <div className="mss-alert flex items-start gap-2 mb-4" role="status"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-700" /><span>{notice}</span></div>}

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
          {status === 'VERIFIED' && (
            <div className="mss-alert flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-700" />
                <span>Hồ sơ đã được duyệt. Vui lòng đăng nhập lại để kích hoạt quyền nhà cung cấp (ROLE_SUPPLIER).</span>
              </span>
              <button type="button" className="mss-button mss-button--primary mss-button--sm" onClick={onRelogin}>
                <LogIn className="w-4 h-4" /> Đăng nhập lại
              </button>
            </div>
          )}
          {status === 'REJECTED' && (
            <div className="mss-alert mss-alert--danger flex items-start gap-2">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Hồ sơ chưa được duyệt.
                {decisionReason && <> Lý do: <strong>{decisionReason}</strong>.</>}
                {' '}Vui lòng kiểm tra, sửa thông tin bên dưới (nếu cần) rồi bấm “Gửi lại hồ sơ”.
              </span>
            </div>
          )}
          {status === 'SUSPENDED' && (
            <div className="mss-alert mss-alert--danger flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Tài khoản nhà cung cấp đang bị tạm khóa.
                {decisionReason && <> Lý do: <strong>{decisionReason}</strong>.</>}
                {' '}Vui lòng liên hệ sàn qua hotline 1900 1509.
              </span>
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
          {draft && !status && !busy && (
            <p className="mss-card-meta">Thông tin bạn nhập khi đăng ký đã được điền sẵn. Kiểm tra lại rồi bấm gửi.</p>
          )}
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
              {busy ? 'Đang gửi…' : status === 'REJECTED' ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ xét duyệt'}
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
