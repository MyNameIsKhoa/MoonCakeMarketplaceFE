import { useState } from 'react';
import { fulfillmentApi } from '../api/fulfillmentApi';

export const OrderAcceptanceCard = ({ sellerOrder, onAccepted }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  if (!sellerOrder) return null;

  const isDelivered = sellerOrder.status === 'DELIVERED';
  const isAccepted = sellerOrder.status === 'ACCEPTED' || sellerOrder.status === 'SETTLED';

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const orderId = sellerOrder.sellerOrderId ?? sellerOrder.id;
      const response = await fulfillmentApi.acceptSellerOrder(orderId);
      setShowConfirm(false);
      if (onAccepted) {
        onAccepted(response);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể nghiệm thu đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (isAccepted) {
    return (
      <div style={{ ...styles.card, borderColor: '#86efac', backgroundColor: '#f0fdf4' }}>
        <div style={styles.headerRow}>
          <span style={styles.checkIcon}>✓</span>
          <div>
            <h4 style={{ ...styles.title, color: '#166534' }}>Đơn hàng đã được nghiệm thu</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#15803d' }}>
              Bạn đã xác nhận nhận đủ và đúng chất lượng bánh. Cảm ơn bạn!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isDelivered) {
    return null;
  }

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <span style={styles.packageIcon}>📦</span>
        <div>
          <h4 style={styles.title}>Xác nhận Nghiệm thu đơn hàng</h4>
          <p style={styles.subtitle}>
            Bánh đã được giao đến bạn. Vui lòng kiểm tra kỹ bao bì, số lượng và chất lượng bánh trước khi xác nhận nghiệm thu.
          </p>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.actionRow}>
        <button
          type="button"
          className="mss-button mss-button--primary"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
        >
          Đã nhận đủ & Nghiệm thu
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Xác nhận Nghiệm thu bánh trung thu</h3>
            <p style={styles.modalText}>
              Hệ thống sẽ ghi nhận bạn đã nhận và kiểm tra hàng. Sàn xử lý chi trả cho nhà bán khi hết hạn khiếu nại và đơn đủ điều kiện.
            </p>
            <ul style={styles.checklist}>
              <li>✓ Đã kiểm tra đúng loại bánh và biến thể</li>
              <li>✓ Hộp bánh còn nguyên vẹn, không bị móp méo</li>
              <li>✓ Hạn sử dụng rõ ràng, đảm bảo an toàn</li>
            </ul>
            <div style={styles.modalActions}>
              <button
                type="button"
                className="mss-button mss-button--secondary"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                className="mss-button mss-button--primary"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận Nghiệm thu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    border: '1px solid #fde68a',
    backgroundColor: '#fffbeb',
    marginBottom: '20px',
  },
  headerRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  packageIcon: {
    fontSize: '28px',
  },
  checkIcon: {
    fontSize: '24px',
    color: '#16a34a',
    fontWeight: '700',
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#92400e',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#78350f',
    lineHeight: '1.4',
  },
  errorBox: {
    padding: '10px 14px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '12px',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '24px',
    maxWidth: '460px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  modalTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  modalText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  checklist: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#374151',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
};
