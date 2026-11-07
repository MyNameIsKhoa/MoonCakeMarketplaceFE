import { useState, useEffect } from 'react';
import { fulfillmentApi } from '../api/fulfillmentApi';

const STATUS_LABELS = {
  PLANNED: { label: 'Đã lên kế hoạch', bg: '#fef3c7', color: '#92400e' },
  READY_TO_SHIP: { label: 'Sẵn sàng gửi', bg: '#e0f2fe', color: '#0369a1' },
  SHIPPED: { label: 'Đang vận chuyển', bg: '#dbeafe', color: '#1d4ed8' },
  DELIVERED: { label: 'Đã giao thành công', bg: '#dcfce7', color: '#15803d' },
  FAILED: { label: 'Giao thất bại', bg: '#fee2e2', color: '#b91c1c' },
  RETURNED: { label: 'Hoàn trả', bg: '#f3f4f6', color: '#4b5563' },
};

const METHOD_LABELS = {
  STANDARD: 'Tiêu chuẩn',
  EXPRESS: 'Hỏa tốc',
  SAME_DAY: 'Giao trong ngày',
};

/**
 * @param {{ sellerOrderId: number | string; sellerOrder?: any; onShipmentUpdated?: (status?: string) => void }} props
 */
export const SupplierShipmentManager = ({ sellerOrderId, sellerOrder, onShipmentUpdated }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [provider, setProvider] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [shippingFee, setShippingFee] = useState(30000);
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const orderStatus = sellerOrder?.status || null;
  const canCreateShipment = !orderStatus || ['READY_FOR_FULFILLMENT', 'PREPARING', 'SHIPPING'].includes(orderStatus);

  useEffect(() => {
    if (!sellerOrderId) return;
    let isMounted = true;
    const fetchShipments = async () => {
      try {
        const data = await fulfillmentApi.getShipmentsBySellerOrder(sellerOrderId);
        if (isMounted) {
          setShipments(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setError('Không tải được vận đơn.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchShipments();
    return () => {
      isMounted = false;
    };
  }, [sellerOrderId]);

  const refreshShipments = async () => {
    try {
      const data = await fulfillmentApi.getShipmentsBySellerOrder(sellerOrderId);
      const list = Array.isArray(data) ? data : [];
      setShipments(list);
      return list;
    } catch {
      return shipments;
    }
  };

  const openCreateForm = () => {
    setEditingShipmentId(null);
    setShippingMethod('STANDARD');
    setProvider('GHTK');
    setTrackingCode('');
    setShippingFee(shipments.length === 0 ? 30000 : 0);
    setExpectedDeliveryAt('');
    setError(null);
    setShowCreateForm(true);
  };

  const openEditForm = (shipment) => {
    setEditingShipmentId(shipment.shipmentId);
    setShippingMethod(shipment.shippingMethod || 'STANDARD');
    setProvider(shipment.provider || 'GHTK');
    setTrackingCode(shipment.trackingCode || '');
    setShippingFee(shipment.shippingFee ?? 0);
    setExpectedDeliveryAt(
      shipment.expectedDeliveryAt ? String(shipment.expectedDeliveryAt).slice(0, 16) : ''
    );
    setError(null);
    setShowCreateForm(true);
  };

  const handleSaveShipment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const resolvedTracking =
      trackingCode.trim() ||
      (provider === 'SELF_DELIVERY' ? `SELF-${sellerOrderId}-${Date.now().toString().slice(-4)}` : '');

    try {
      if (editingShipmentId) {
        await fulfillmentApi.updateShipment(editingShipmentId, {
          shippingMethod,
          provider,
          trackingCode: resolvedTracking,
          expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
        });
      } else {
        await fulfillmentApi.createShipment({
          sellerOrderId,
          shippingMethod,
          provider,
          trackingCode: resolvedTracking,
          shippingFee: Number(shippingFee),
          expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
        });
      }
      setShowCreateForm(false);
      setEditingShipmentId(null);
      await refreshShipments();
      if (onShipmentUpdated) onShipmentUpdated('PREPARING');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi lưu vận đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkShipped = async (shipmentId) => {
    setError(null);
    try {
      await fulfillmentApi.markAsShipped(shipmentId);
      await refreshShipments();
      if (onShipmentUpdated) onShipmentUpdated('SHIPPING');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái đã gửi hàng.');
    }
  };

  const handleMarkDelivered = async (shipmentId) => {
    setError(null);
    try {
      await fulfillmentApi.markAsDelivered(shipmentId);
      const latest = await refreshShipments();
      const allDelivered = latest.length > 0 && latest.every((s) => s.status === 'DELIVERED');
      if (onShipmentUpdated) onShipmentUpdated(allDelivered ? 'DELIVERED' : 'SHIPPING');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái đã giao hàng.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h4 style={styles.title}>
            Quản lý Giao hàng {sellerOrder?.sellerOrderNo ? `— Đơn ${sellerOrder.sellerOrderNo}` : `(Mã đơn #${sellerOrderId})`}
          </h4>
          {sellerOrder?.storeNameSnapshot && (
            <p style={styles.subtitle}>Gian hàng: {sellerOrder.storeNameSnapshot}</p>
          )}
        </div>
        {canCreateShipment && !showCreateForm && (
          <button
            type="button"
            style={styles.addBtn}
            onClick={openCreateForm}
          >
            {shipments.length === 0 ? '+ Tạo vận đơn' : '+ Thêm kiện hàng / đợt giao'}
          </button>
        )}
      </div>

      {orderStatus && ['AWAITING_PAYMENT', 'AWAITING_DEPOSIT'].includes(orderStatus) && (
        <div style={styles.infoBox}>
          Đơn hàng đang chờ khách thanh toán (hoặc đặt cọc). Hệ thống sẽ mở chức năng tạo vận đơn ngay khi thu đủ mức thanh toán quy định.
        </div>
      )}

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Form Tạo / Cập Nhật Vận Đơn */}
      {showCreateForm && (
        <form onSubmit={handleSaveShipment} style={styles.formCard}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1f2937' }}>
            {editingShipmentId ? `Cập nhật vận đơn #${editingShipmentId}` : 'Thông tin kiện hàng / đợt vận chuyển mới'}
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
                <option value="SELF_DELIVERY">Cửa hàng tự giao (Xe lạnh / Nội thành)</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Mã vận đơn (Tracking Code){provider === 'SELF_DELIVERY' ? ' (Tự sinh nếu để trống)' : ''}:
              </label>
              <input
                type="text"
                style={styles.input}
                placeholder={provider === 'SELF_DELIVERY' ? 'Để trống để tự tạo mã giao nội bộ' : 'VD: GHTK12345678'}
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                required={provider !== 'SELF_DELIVERY'}
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
                <option value="SAME_DAY">Giao trong ngày</option>
              </select>
            </div>

            {!editingShipmentId && (
              <div>
                <label style={styles.label}>Phí vận chuyển kiện này (VNĐ):</label>
                <input
                  type="number"
                  style={styles.input}
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  min="0"
                  required
                />
              </div>
            )}

            <div>
              <label style={styles.label}>Dự kiến giao đến khách:</label>
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
              onClick={() => {
                setShowCreateForm(false);
                setEditingShipmentId(null);
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : editingShipmentId ? 'Lưu cập nhật' : 'Tạo vận đơn'}
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
          {shipments.map((s, index) => {
            const statusStyle = STATUS_LABELS[s.status] || { label: s.status, bg: '#f3f4f6', color: '#374151' };
            return (
              <div key={s.shipmentId} style={styles.shipmentCard}>
                <div style={styles.shipmentHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={styles.batchLabel}>Đợt #{index + 1}</span>
                    <span style={styles.providerBadge}>{s.provider || s.shippingMethod}</span>
                    {s.trackingCode && <span style={styles.trackingText}>Mã vận đơn: {s.trackingCode}</span>}
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      ({METHOD_LABELS[s.shippingMethod] || s.shippingMethod})
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <div style={styles.shipmentMeta}>
                  <div>Phí vận chuyển: {Number(s.shippingFee).toLocaleString('vi-VN')} đ</div>
                  {s.expectedDeliveryAt && !s.deliveredAt && (
                    <div>Dự kiến giao: {new Date(s.expectedDeliveryAt).toLocaleString('vi-VN')}</div>
                  )}
                  {s.shippedAt && <div>Đã xuất kho: {new Date(s.shippedAt).toLocaleString('vi-VN')}</div>}
                  {s.deliveredAt && <div>Đã giao lúc: {new Date(s.deliveredAt).toLocaleString('vi-VN')}</div>}
                </div>

                {/* Action Buttons for Supplier */}
                <div style={styles.btnRow}>
                  {s.status !== 'DELIVERED' && (
                    <button
                      type="button"
                      style={styles.actionBtnSecondary}
                      onClick={() => openEditForm(s)}
                    >
                      ✏️ Cập nhật mã vận đơn
                    </button>
                  )}
                  {(s.status === 'PLANNED' || s.status === 'READY_TO_SHIP') && (
                    <button
                      type="button"
                      style={styles.actionBtnPrimary}
                      onClick={() => handleMarkShipped(s.shipmentId)}
                    >
                      🚀 Xuất kho / Bàn giao Shipper
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
            );
          })}
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
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  addBtn: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  infoBox: {
    padding: '10px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '14px',
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
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  shipmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px',
  },
  batchLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#374151',
  },
  providerBadge: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  },
  trackingText: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#374151',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '9999px',
  },
  shipmentMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  btnRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionBtnSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnSuccess: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
