import { useState, useEffect } from 'react';
import { fulfillmentApi } from '../api/fulfillmentApi';
import { formatDateTime, toLocalDateTimeInput } from '../../../utils/format';

const STATUS_LABELS = {
  PLANNED: { label: 'Đã lên kế hoạch', bg: '#fef3c7', color: '#92400e' },
  READY_TO_SHIP: { label: 'Sẵn sàng gửi', bg: '#e0f2fe', color: '#0369a1' },
  SHIPPED: { label: 'Đang vận chuyển', bg: '#dbeafe', color: '#1d4ed8' },
  DELIVERED: { label: 'Đã giao thành công', bg: '#dcfce7', color: '#15803d' },
  FAILED: { label: 'Giao thất bại', bg: '#fee2e2', color: '#b91c1c' },
  RETURNED: { label: 'Hoàn trả', bg: '#f3f4f6', color: '#4b5563' },
  CANCELLED: { label: 'Đã hủy kiện', bg: '#f3f4f6', color: '#6b7280' },
};

const METHOD_LABELS = {
  STANDARD: 'Tiêu chuẩn',
  EXPRESS: 'Hỏa tốc',
  SAME_DAY: 'Giao trong ngày',
};

const itemLabel = (item) =>
  `${item.productNameSnapshot || `Sản phẩm #${item.orderItemId}`}${item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ''}`;

/** Every ordered unit is in a delivered shipment; a legacy shipment without lines keeps the old all-delivered rule. */
const isFullyDelivered = (shipments, items) => {
  const live = shipments.filter((s) => s.status !== 'CANCELLED');
  const legacy = live.some((s) => !Array.isArray(s.lines) || s.lines.length === 0);
  if (legacy || items.length === 0) return live.length > 0 && live.every((s) => s.status === 'DELIVERED');
  return items.every((i) => i.deliveredQuantity >= i.orderedQuantity);
};

/**
 * @param {{ sellerOrderId: number | string; sellerOrder?: any; onShipmentUpdated?: (status?: string) => void }} props
 */
export const SupplierShipmentManager = ({ sellerOrderId, sellerOrder, onShipmentUpdated }) => {
  const [shipments, setShipments] = useState([]);
  /** Per order item: ordered / allocated / shipped / delivered / remaining units (GET /api/shipments/items). */
  const [items, setItems] = useState([]);
  /** orderItemId -> quantity typed for the new shipment. */
  const [lineQuantities, setLineQuantities] = useState({});
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
  const remainingUnits = items.reduce((sum, i) => sum + i.remainingQuantity, 0);
  // Until the item progress has loaded (or for an order without items) the backend decides what remains.
  const nothingLeftToShip = items.length > 0 && remainingUnits === 0;
  const canCreateShipment = (!orderStatus || ['READY_FOR_FULFILLMENT', 'PREPARING', 'SHIPPING'].includes(orderStatus))
    && !nothingLeftToShip;

  useEffect(() => {
    if (!sellerOrderId) return;
    let isMounted = true;
    const fetchShipments = async () => {
      try {
        const [data, progress] = await Promise.all([
          fulfillmentApi.getShipmentsBySellerOrder(sellerOrderId),
          fulfillmentApi.getShipmentItems(sellerOrderId).catch(() => []),
        ]);
        if (isMounted) {
          setShipments(Array.isArray(data) ? data : []);
          setItems(Array.isArray(progress) ? progress : []);
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
      const [data, progress] = await Promise.all([
        fulfillmentApi.getShipmentsBySellerOrder(sellerOrderId),
        fulfillmentApi.getShipmentItems(sellerOrderId).catch(() => items),
      ]);
      const list = Array.isArray(data) ? data : [];
      const itemList = Array.isArray(progress) ? progress : [];
      setShipments(list);
      setItems(itemList);
      return { list, itemList };
    } catch {
      return { list: shipments, itemList: items };
    }
  };

  const openCreateForm = () => {
    setEditingShipmentId(null);
    setShippingMethod('STANDARD');
    setProvider('GHTK');
    setTrackingCode('');
    setShippingFee(shipments.length === 0 ? 30000 : 0);
    setExpectedDeliveryAt('');
    // Default: every unit not yet in a shipment.
    setLineQuantities(Object.fromEntries(items.map((i) => [i.orderItemId, String(i.remainingQuantity)])));
    setError(null);
    setShowCreateForm(true);
  };

  /** Lines for the new shipment; null lets the backend take every remaining unit (no item progress loaded). */
  const buildLines = () => {
    if (items.length === 0) return null;
    return items
      .map((i) => ({ orderItemId: i.orderItemId, quantity: Number(lineQuantities[i.orderItemId] || 0) }))
      .filter((line) => line.quantity > 0);
  };

  const openEditForm = (shipment) => {
    setEditingShipmentId(shipment.shipmentId);
    setShippingMethod(shipment.shippingMethod || 'STANDARD');
    setProvider(shipment.provider || 'GHTK');
    setTrackingCode(shipment.trackingCode || '');
    setShippingFee(shipment.shippingFee ?? 0);
    setExpectedDeliveryAt(
      toLocalDateTimeInput(shipment.expectedDeliveryAt)
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
        const lines = buildLines();
        if (lines !== null && lines.length === 0) {
          setError('Chọn ít nhất một sản phẩm với số lượng lớn hơn 0 cho kiện hàng này.');
          return;
        }
        await fulfillmentApi.createShipment({
          sellerOrderId,
          shippingMethod,
          provider,
          trackingCode: resolvedTracking,
          shippingFee: Number(shippingFee),
          expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
          ...(lines ? { lines } : {}),
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

  const handleCancelShipment = async (shipmentId) => {
    if (!window.confirm('Hủy kiện hàng chưa gửi này?')) return;
    setError(null);
    try {
      await fulfillmentApi.cancelShipment(shipmentId);
      await refreshShipments();
      if (onShipmentUpdated) onShipmentUpdated('SHIPPING');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không hủy được kiện hàng.');
    }
  };

  const handleMarkDelivered = async (shipmentId) => {
    setError(null);
    try {
      await fulfillmentApi.markAsDelivered(shipmentId);
      const latest = await refreshShipments();
      const allDelivered = isFullyDelivered(latest.list, latest.itemList);
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

      {items.length > 0 && (
        <div style={styles.progressCard}>
          <div style={styles.progressTitle}>Tiến độ giao theo sản phẩm</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sản phẩm</th>
                <th style={styles.thNum}>Đặt</th>
                <th style={styles.thNum}>Đã xếp kiện</th>
                <th style={styles.thNum}>Đã gửi</th>
                <th style={styles.thNum}>Đã giao</th>
                <th style={styles.thNum}>Còn lại</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.orderItemId}>
                  <td style={styles.td}>{itemLabel(i)}</td>
                  <td style={styles.tdNum}>{i.orderedQuantity}</td>
                  <td style={styles.tdNum}>{i.allocatedQuantity}</td>
                  <td style={styles.tdNum}>{i.shippedQuantity}</td>
                  <td style={styles.tdNum}>{i.deliveredQuantity}</td>
                  <td style={{ ...styles.tdNum, fontWeight: 700, color: i.remainingQuantity > 0 ? '#b45309' : '#15803d' }}>
                    {i.remainingQuantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nothingLeftToShip && (
            <p style={styles.progressNote}>Tất cả sản phẩm đã được xếp vào các kiện hàng. Hủy một kiện chưa gửi để xếp lại.</p>
          )}
        </div>
      )}

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

          {!editingShipmentId && items.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={styles.label}>Sản phẩm trong kiện này (mặc định: toàn bộ phần còn lại):</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Sản phẩm</th>
                    <th style={styles.thNum}>Còn lại</th>
                    <th style={styles.thNum}>Số lượng gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.orderItemId}>
                      <td style={styles.td}>{itemLabel(i)}</td>
                      <td style={styles.tdNum}>{i.remainingQuantity}</td>
                      <td style={styles.tdNum}>
                        <input
                          type="number"
                          aria-label={`Số lượng gửi của ${itemLabel(i)}`}
                          style={styles.qtyInput}
                          min="0"
                          max={i.remainingQuantity}
                          step="1"
                          disabled={i.remainingQuantity === 0}
                          value={lineQuantities[i.orderItemId] ?? '0'}
                          onChange={(e) => setLineQuantities((current) => ({ ...current, [i.orderItemId]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                    <div>Dự kiến giao: {formatDateTime(s.expectedDeliveryAt)}</div>
                  )}
                  {s.shippedAt && <div>Đã xuất kho: {formatDateTime(s.shippedAt)}</div>}
                  {s.deliveredAt && <div>Đã giao lúc: {formatDateTime(s.deliveredAt)}</div>}
                </div>

                <div style={styles.linesBox}>
                  <span style={{ fontWeight: 600 }}>Sản phẩm trong kiện: </span>
                  {Array.isArray(s.lines) && s.lines.length > 0
                    ? s.lines.map((line) => `${itemLabel(line)} × ${line.quantity}`).join('; ')
                    : 'Toàn bộ đơn hàng (vận đơn tạo trước khi tách kiện theo sản phẩm)'}
                </div>

                {/* Action Buttons for Supplier */}
                <div style={styles.btnRow}>
                  {s.status !== 'DELIVERED' && s.status !== 'CANCELLED' && (
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
                  {s.status === 'PLANNED' && (
                    <button
                      type="button"
                      style={styles.actionBtnSecondary}
                      onClick={() => handleCancelShipment(s.shipmentId)}
                    >
                      ✖ Hủy kiện chưa gửi
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
  linesBox: {
    fontSize: '12px',
    color: '#374151',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '6px 10px',
    marginBottom: '12px',
  },
  progressCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    overflowX: 'auto',
  },
  progressTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },
  progressNote: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#15803d',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: '600',
  },
  thNum: {
    textAlign: 'right',
    padding: '6px 8px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '6px 8px',
    borderBottom: '1px solid #f3f4f6',
    color: '#1f2937',
  },
  tdNum: {
    padding: '6px 8px',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right',
    color: '#1f2937',
  },
  qtyInput: {
    width: '80px',
    boxSizing: 'border-box',
    padding: '4px 6px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '12px',
    textAlign: 'right',
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
