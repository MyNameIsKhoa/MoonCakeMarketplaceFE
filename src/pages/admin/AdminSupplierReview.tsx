import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import {
  adminSupplierApi, ApiError,
  type ReviewSupplierRequest, type SpringPage, type SupplierProfileResponse, type SupplierVerificationStatus
} from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SUPPLIER_VERIFICATION } from '../../utils/status';
import { formatDateTime } from '../../utils/format';

const PAGE_SIZE = 20;
const STATUS_TABS: SupplierVerificationStatus[] = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];

type Decision = ReviewSupplierRequest['decision'];

/** Transitions Identity accepts from each status. */
const ACTIONS: Record<SupplierVerificationStatus, { decision: Decision; label: string; tone: 'primary' | 'danger' }[]> = {
  PENDING: [
    { decision: 'VERIFIED', label: 'Duyệt', tone: 'primary' },
    { decision: 'REJECTED', label: 'Từ chối', tone: 'danger' }
  ],
  VERIFIED: [{ decision: 'SUSPENDED', label: 'Tạm khóa', tone: 'danger' }],
  SUSPENDED: [{ decision: 'VERIFIED', label: 'Mở khóa', tone: 'primary' }],
  REJECTED: []
};

const DEFAULT_REASON: Record<Decision, string> = {
  VERIFIED: 'Hồ sơ hợp lệ.',
  REJECTED: '',
  SUSPENDED: ''
};

interface PendingAction {
  supplier: SupplierProfileResponse;
  decision: Decision;
  reason: string;
}

/** ROLE_ADMIN: review supplier applications (TV1 supplier onboarding). */
export default function AdminSupplierReview() {
  const [status, setStatus] = useState<SupplierVerificationStatus>('PENDING');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SpringPage<SupplierProfileResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminSupplierApi.list({ verificationStatus: status, page, size: PAGE_SIZE }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    if (!pending.reason.trim()) {
      setError('Vui lòng nhập lý do.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminSupplierApi.review(pending.supplier.supplierId, {
        decision: pending.decision,
        reason: pending.reason.trim()
      });
      setNotice(`${updated.companyName}: ${SUPPLIER_VERIFICATION[updated.verificationStatus].label}.`);
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409
        ? 'Trạng thái hồ sơ đã thay đổi, vui lòng tải lại danh sách.'
        : err instanceof ApiError ? err.message : 'Không cập nhật được hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  const suppliers = data?.content ?? [];

  return (
    <div className="mss-container mss-page">
      <header className="mss-page-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mss-page-title flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-700" /> Duyệt nhà cung cấp
          </h1>
          <p className="mss-page-description">Xét duyệt hồ sơ trước khi nhà cung cấp được tạo gian hàng trên sàn.</p>
        </div>
        <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="w-4 h-4" /> Tải lại
        </button>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => { setStatus(s); setPage(0); setPending(null); setNotice(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              status === s ? 'bg-primary-700 text-white shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {SUPPLIER_VERIFICATION[s].label}
          </button>
        ))}
      </div>

      {notice && <div className="mss-alert" role="status">{notice}</div>}
      {error && <div className="mss-alert mss-alert--danger" role="alert">{error}</div>}

      {pending && (
        <form onSubmit={submitDecision} className="mss-card mss-stack">
          <h2 className="mss-card-title">
            {ACTIONS[pending.supplier.verificationStatus].find((a) => a.decision === pending.decision)?.label}:{' '}
            {pending.supplier.companyName}
          </h2>
          <label className="mss-field">
            Lý do (lưu vào lịch sử xét duyệt)
            <textarea
              className="mss-textarea"
              rows={3}
              maxLength={1000}
              value={pending.reason}
              onChange={(e) => setPending({ ...pending, reason: e.target.value })}
              autoFocus
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="mss-button mss-button--primary" disabled={submitting}>
              {submitting ? 'Đang lưu…' : 'Xác nhận'}
            </button>
            <button type="button" className="mss-button mss-button--secondary" onClick={() => setPending(null)}>Hủy</button>
          </div>
        </form>
      )}

      {loading && !data ? (
        <p className="text-sm text-gray-500">Đang tải…</p>
      ) : suppliers.length === 0 ? (
        <EmptyState title="Không có hồ sơ nào" description={`Chưa có nhà cung cấp ở trạng thái "${SUPPLIER_VERIFICATION[status].label}".`} />
      ) : (
        <div className="mss-table-scroll">
          <table className="mss-table">
            <thead>
              <tr>
                <th>Công ty</th>
                <th>Mã số thuế</th>
                <th>User ID</th>
                <th>Gửi lúc</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.supplierId}>
                  <td className="font-semibold">{s.companyName}</td>
                  <td>{s.taxCode}</td>
                  <td>#{s.userId}</td>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td><StatusBadge map={SUPPLIER_VERIFICATION} status={s.verificationStatus} /></td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      {ACTIONS[s.verificationStatus].map((action) => (
                        <button
                          key={action.decision}
                          type="button"
                          className={`mss-button mss-button--sm ${action.tone === 'danger' ? 'mss-button--danger' : 'mss-button--primary'}`}
                          onClick={() => {
                            setNotice(null);
                            setPending({ supplier: s, decision: action.decision, reason: DEFAULT_REASON[action.decision] });
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Trang {data.number + 1}/{data.totalPages} · {data.totalElements} hồ sơ</span>
          <div className="flex gap-2">
            <button className="mss-button mss-button--secondary mss-button--sm" disabled={data.first} onClick={() => setPage((p) => p - 1)}>Trước</button>
            <button className="mss-button mss-button--secondary mss-button--sm" disabled={data.last} onClick={() => setPage((p) => p + 1)}>Sau</button>
          </div>
        </div>
      )}
    </div>
  );
}
