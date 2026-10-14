import React, { useState, useEffect } from 'react';
import { fulfillmentApi } from '../api/fulfillmentApi';

export const SupplierShipmentManager = ({ sellerOrderId, onShipmentUpdated }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [provider, setProvider] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [shippingFee, setShippingFee] = useState(30000);
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sellerOrderId) {
      loadShipments();
    }
  }, [sellerOrderId]);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fulfillmentApi.getShipmentsBySellerOrder(sellerOrderId);
      setShipments(data || []);
    } catch (err) {
      setError('Không thể tải thông tin vận chuyển.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await fulfillmentApi.createShipment({
        sellerOrderId,
        shippingMethod,
        provider,
        trackingCode: trackingCode.trim(),
        shippingFee: Number(shippingFee),
        expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
      });
      setShowCreateForm(false);
      await loadShipments();
      if (onShipmentUpdated) onShipmentUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tạo vận đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkShipped = async (shipmentId) => {
    try {
      await fulfillmentApi.markAsShipped(shipmentId);
      await loadShipments();
      if (onShipmentUpdated) onShipmentUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái đã gửi hàng.');
    }
  };

  const handleMarkDelivered = async (shipmentId) => {
    try {
      await fulfillmentApi.markAsDelivered(shipmentId);
      await loadShipments();
      if (onShipmentUpdated) onShipmentUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái đã giao hàng.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Quản lý Giao hàng (Dành cho Nhà cung cấp)</h4>
        {shipments.length === 0 && !showCreateForm && (
          <button
            type="button"
            style={styles.addBtn}
            onClick={() => setShowCreateForm(true)}
          >
            + Tạo vận đơn
          </button>
        )}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Form Tạo Vận Đơn */}
      {showCreateForm && (
        <form onSubmit={handleCreateShipment} style={styles.formCard}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1f2937' }}>
            Thông tin vận chuyển mới
          </h5>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Đơn vị vận chuyển:</label>
              <select
                style={styles.input}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                <option value="VIETTEL_POST">Viettel Post</option>
                <option value="SELF_DELIVERY">Cửa hàng tự giao</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Mã vận đơn (Tracking Code):</label>
              <input
                type="text"
                style={styles.input}
                placeholder="VD: GHTK12345678"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={styles.label}>Phương thức giao:</label>
              <select
                style={styles.input}
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              >
                <option value="STANDARD">Tiêu chuẩn</option>
                <option value="EXPRESS">Hỏa tốc</option>
                <option value="SAME_DAY">Trong ngày</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Phí vận chuyển (VNĐ):</label>
              <input
                type="number"
                style={styles.input}
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                min="0"
                required
              />
            </div>

            <div>
              <label style={styles.label}>Dự kiến giao ngày:</label>
              <input
                type="datetime-local"
                style={styles.input}
                value={expectedDeliveryAt}
                onChange={(e) => setExpectedDeliveryAt(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => setShowCreateForm(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : 'Lưu vận đơn'}
            </button>
          </div>
        </form>
      )}

      {/* Danh Sách Vận Đơn */}
      {loading ? (
        <p style={{ color: '#6b7280' }}>Đang tải...</p>
      ) : shipments.length === 0 && !showCreateForm ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Chưa có vận đơn nào được tạo cho đơn hàng này.</p>
      ) : (
        <div style={styles.shipmentList}>
          {shipments.map((s) => (
            <div key={s.shipmentId} style={styles.shipmentCard}>
              <div style={styles.shipmentHeader}>
                <div>
                  <span style={styles.providerBadge}>{s.provider}</span>
                  <span style={styles.trackingText}>{s.trackingCode}</span>
                </div>
                <span style={styles.statusBadge}>{s.status}</span>
              </div>

              <div style={styles.shipmentMeta}>
                <div>Phí: {Number(s.shippingFee).toLocaleString('vi-VN')} đ</div>
                {s.shippedAt && <div>Gửi: {new Date(s.shippedAt).toLocaleString('vi-VN')}</div>}
                {s.deliveredAt && <div>Đã giao: {new Date(s.deliveredAt).toLocaleString('vi-VN')}</div>}
              </div>

              {/* Action Buttons for Supplier */}
              <div style={styles.btnRow}>
                {s.status === 'PLANNED' && (
                  <button
                    type="button"
                    style={styles.actionBtnPrimary}
                    onClick={() => handleMarkShipped(s.shipmentId)}
                  >
                    🚀 Bàn giao cho Shipper (Gửi hàng)
                  </button>
                )}
                {s.status === 'SHIPPED' && (
                  <button
                    type="button"
                    style={styles.actionBtnSuccess}
                    onClick={() => handleMarkDelivered(s.shipmentId)}
                  >
                    📦 Xác nhận Đã giao đến khách
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  addBtn: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorBox: {
    padding: '10px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '14px',
  },
  formCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cancelBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '13px',
  },
  submitBtn: {
    padding: '6px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#d97706',
    color: '#ffffff',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
  },
  shipmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  shipmentCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  shipmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  providerBadge: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
    marginRight: '8px',
  },
  trackingText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: '13px',
    color: '#1f2937',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  shipmentMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '12px',
  },
  btnRow: {
    display: 'flex',
    gap: '8px',
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnSuccess: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
