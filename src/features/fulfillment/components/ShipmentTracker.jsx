const STEPS = [
  { key: 'PLANNED', label: 'Lên kế hoạch', description: 'Shop chuẩn bị bánh và tạo vận đơn' },
  { key: 'SHIPPED', label: 'Đang vận chuyển', description: 'Đã giao cho đơn vị vận chuyển' },
  { key: 'DELIVERED', label: 'Đã giao hàng', description: 'Shipper đã giao đến địa chỉ nhận' },
  { key: 'ACCEPTED', label: 'Đã nghiệm thu', description: 'Khách hàng kiểm tra và xác nhận' },
];

export const ShipmentTracker = ({ shipment, orderStatus }) => {
  if (!shipment) {
    return (
      <div style={styles.card}>
        <h4 style={styles.title}>Trạng thái vận chuyển</h4>
        <p style={{ color: '#888' }}>Chưa có thông tin vận chuyển cho đơn hàng này.</p>
      </div>
    );
  }

  const getActiveStepIndex = () => {
    if (orderStatus === 'ACCEPTED' || orderStatus === 'SETTLED') return 3;
    if (shipment.status === 'DELIVERED' || orderStatus === 'DELIVERED') return 2;
    if (shipment.status === 'SHIPPED' || orderStatus === 'SHIPPING') return 1;
    return 0;
  };

  const activeIndex = getActiveStepIndex();

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h4 style={styles.title}>Theo dõi giao hàng & Nghiệm thu</h4>
        <span style={styles.badge}>{shipment.status || 'ĐANG XỬ LÝ'}</span>
      </div>

      {/* Progress Timeline */}
      <div style={styles.timeline}>
        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          return (
            <div key={step.key} style={styles.stepItem}>
              <div style={styles.nodeWrapper}>
                <div
                  style={{
                    ...styles.circle,
                    backgroundColor: isDone || isCurrent ? '#d97706' : '#e5e7eb',
                    color: isDone || isCurrent ? '#ffffff' : '#9ca3af',
                    boxShadow: isCurrent ? '0 0 0 4px #fef3c7' : 'none',
                  }}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      ...styles.line,
                      backgroundColor: idx < activeIndex ? '#d97706' : '#e5e7eb',
                    }}
                  />
                )}
              </div>
              <div style={styles.stepContent}>
                <div style={{ ...styles.stepLabel, fontWeight: isCurrent ? '700' : '500' }}>
                  {step.label}
                </div>
                <div style={styles.stepDesc}>{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipping Details */}
      <div style={styles.detailsGrid}>
        <div style={styles.detailCol}>
          <span style={styles.detailLabel}>Đơn vị vận chuyển:</span>
          <span style={styles.detailValue}>{shipment.provider || 'Tự giao nhận'}</span>
        </div>
        <div style={styles.detailCol}>
          <span style={styles.detailLabel}>Mã vận đơn (Tracking):</span>
          <span style={styles.detailValueCode}>{shipment.trackingCode || 'Chưa cập nhật'}</span>
        </div>
        <div style={styles.detailCol}>
          <span style={styles.detailLabel}>Phương thức:</span>
          <span style={styles.detailValue}>{shipment.shippingMethod || 'Tiêu chuẩn'}</span>
        </div>
        <div style={styles.detailCol}>
          <span style={styles.detailLabel}>Phí giao hàng:</span>
          <span style={styles.detailValue}>
            {shipment.shippingFee ? Number(shipment.shippingFee).toLocaleString('vi-VN') + ' đ' : '0 đ'}
          </span>
        </div>
        {shipment.expectedDeliveryAt && (
          <div style={styles.detailCol}>
            <span style={styles.detailLabel}>Dự kiến giao:</span>
            <span style={styles.detailValue}>{new Date(shipment.expectedDeliveryAt).toLocaleString('vi-VN')}</span>
          </div>
        )}
        {shipment.deliveredAt && (
          <div style={styles.detailCol}>
            <span style={styles.detailLabel}>Đã giao lúc:</span>
            <span style={styles.detailValueSuccess}>{new Date(shipment.deliveredAt).toLocaleString('vi-VN')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f3f4f6',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  timeline: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    position: 'relative',
  },
  stepItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
  },
  nodeWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: '8px',
  },
  circle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    zIndex: 2,
    transition: 'all 0.3s ease',
  },
  line: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '100%',
    height: '3px',
    zIndex: 1,
  },
  stepContent: {
    maxWidth: '120px',
  },
  stepLabel: {
    fontSize: '13px',
    color: '#374151',
    marginBottom: '4px',
  },
  stepDesc: {
    fontSize: '11px',
    color: '#6b7280',
    lineHeight: '1.3',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
  },
  detailCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  detailValueCode: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#b45309',
    fontFamily: 'monospace',
  },
  detailValueSuccess: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#15803d',
  },
};
