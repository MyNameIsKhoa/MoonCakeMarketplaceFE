import { useState } from 'react';
import { ShipmentTracker } from '../components/ShipmentTracker';
import { OrderAcceptanceCard } from '../components/OrderAcceptanceCard';
import { ReviewModal } from '../components/ReviewModal';
import { ReviewList } from '../components/ReviewList';
import { SupplierShipmentManager } from '../components/SupplierShipmentManager';

export const FulfillmentDemoPage = () => {
  const [viewRole, setViewRole] = useState('BUYER'); // 'BUYER' | 'SUPPLIER'

  // Simulated live state for demonstration
  const [sellerOrder, setSellerOrder] = useState({
    id: 101,
    orderId: 201,
    sellerOrderNo: 'SO-2026-MC001',
    storeNameSnapshot: 'Tiệm Bánh Trung Thu Kinh Đô Hoàng Gia',
    status: 'DELIVERED', // PLANNED -> SHIPPING -> DELIVERED -> ACCEPTED
  });

  const [shipment, setShipment] = useState({
    shipmentId: 301,
    sellerOrderId: 101,
    shippingMethod: 'EXPRESS',
    provider: 'Giao Hàng Tiết Kiệm (GHTK)',
    trackingCode: 'GHTK88992211VN',
    expectedShipAt: '2026-09-10T08:00:00',
    shippedAt: '2026-09-10T09:30:00',
    expectedDeliveryAt: '2026-09-12T15:00:00',
    deliveredAt: '2026-09-12T14:20:00',
    shippingFee: 35000,
    status: 'DELIVERED',
  });

  const [orderItems] = useState([
    {
      id: 901,
      productNameSnapshot: 'Hộp Bánh Trung Thu Trăng Vàng Hoàng Kim',
      variantNameSnapshot: 'Hộp 4 bánh x 180g (Thập cẩm jambon, Gà quay, Đậu xanh, Hạt sen)',
      quantity: 2,
      unitPrice: 650000,
    },
    {
      id: 902,
      productNameSnapshot: 'Hộp Bánh Trung Thu Tuyết Lava Trứng Chảy',
      variantNameSnapshot: 'Hộp 6 bánh mini x 60g',
      quantity: 1,
      unitPrice: 380000,
    },
  ]);

  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  const handleOrderAccepted = () => {
    setSellerOrder((prev) => ({ ...prev, status: 'ACCEPTED' }));
  };

  const handleStatusChange = (newStatus) => {
    setSellerOrder((prev) => ({ ...prev, status: newStatus }));
    setShipment((prev) => ({ ...prev, status: newStatus }));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoBadge}>TV6</span>
          <h2 style={styles.headerTitle}>Hệ Thống Quản Lý Giao Hàng & Đánh Giá Bánh Trung Thu</h2>
        </div>
        <p style={styles.headerSubtitle}>
          MSS Mooncake Marketplace — Fulfillment, Delivery Tracking, Buyer Acceptance & Product Reviews
        </p>

        {/* Role Switcher */}
        <div style={styles.roleSwitcher}>
          <button
            type="button"
            style={{
              ...styles.roleBtn,
              backgroundColor: viewRole === 'BUYER' ? '#d97706' : '#f3f4f6',
              color: viewRole === 'BUYER' ? '#ffffff' : '#4b5563',
            }}
            onClick={() => setViewRole('BUYER')}
          >
            👤 Khách Mua Hàng (Buyer View)
          </button>
          <button
            type="button"
            style={{
              ...styles.roleBtn,
              backgroundColor: viewRole === 'SUPPLIER' ? '#d97706' : '#f3f4f6',
              color: viewRole === 'SUPPLIER' ? '#ffffff' : '#4b5563',
            }}
            onClick={() => setViewRole('SUPPLIER')}
          >
            🏪 Nhà Cung Cấp (Supplier View)
          </button>
        </div>
      </div>

      {/* Quick Status Controller Bar for Demo */}
      <div style={styles.demoBar}>
        <span style={styles.demoLabel}>Mô phỏng đổi trạng thái nhanh:</span>
        <button type="button" style={styles.statusBtn} onClick={() => handleStatusChange('PREPARING')}>
          1. Đang chuẩn bị (PREPARING)
        </button>
        <button type="button" style={styles.statusBtn} onClick={() => handleStatusChange('SHIPPING')}>
          2. Đang giao hàng (SHIPPING)
        </button>
        <button type="button" style={styles.statusBtn} onClick={() => handleStatusChange('DELIVERED')}>
          3. Đã giao hàng (DELIVERED)
        </button>
        <button type="button" style={styles.statusBtn} onClick={() => handleStatusChange('ACCEPTED')}>
          4. Đã nghiệm thu (ACCEPTED)
        </button>
      </div>

      {reviewSuccessMsg && (
        <div style={styles.successBanner}>{reviewSuccessMsg}</div>
      )}

      {/* Main Content Area */}
      {viewRole === 'BUYER' ? (
        <div>
          {/* Order Details Header */}
          <div style={styles.orderSummaryCard}>
            <div style={styles.orderSummaryHeader}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1f2937' }}>
                  Đơn hàng: {sellerOrder.sellerOrderNo}
                </h3>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  Cửa hàng: <strong>{sellerOrder.storeNameSnapshot}</strong>
                </span>
              </div>
              <span style={styles.orderStatusBadge}>
                Trạng thái: <strong>{sellerOrder.status}</strong>
              </span>
            </div>

            {/* Items Table */}
            <div style={styles.itemsList}>
              {orderItems.map((item) => (
                <div key={item.id} style={styles.itemRow}>
                  <div>
                    <div style={styles.itemName}>{item.productNameSnapshot}</div>
                    <div style={styles.itemVariant}>{item.variantNameSnapshot}</div>
                    <div style={styles.itemPrice}>
                      {item.quantity} x {item.unitPrice.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div>
                    {(sellerOrder.status === 'DELIVERED' || sellerOrder.status === 'ACCEPTED') && (
                      <button
                        type="button"
                        style={styles.reviewBtn}
                        onClick={() => setSelectedReviewItem(item)}
                      >
                        ⭐ Viết đánh giá
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipment Tracker */}
          <ShipmentTracker shipment={shipment} orderStatus={sellerOrder.status} />

          {/* Buyer Acceptance Action Card */}
          <OrderAcceptanceCard sellerOrder={sellerOrder} onAccepted={handleOrderAccepted} />

          {/* Product Reviews List */}
          <ReviewList variantId={1001} />
        </div>
      ) : (
        <div>
          {/* Supplier Management View */}
          <SupplierShipmentManager
            sellerOrderId={sellerOrder.id}
            onShipmentUpdated={(newStatus) => {
              if (newStatus) {
                handleStatusChange(newStatus);
              }
            }}
          />
        </div>
      )}

      {/* Review Modal */}
      {selectedReviewItem && (
        <ReviewModal
          orderItem={selectedReviewItem}
          isOpen={Boolean(selectedReviewItem)}
          onClose={() => setSelectedReviewItem(null)}
          onReviewed={() => {
            setReviewSuccessMsg('Cảm ơn bạn đã gửi đánh giá sản phẩm thành công!');
            setTimeout(() => setReviewSuccessMsg(''), 5000);
          }}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '960px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f3f4f6',
    marginBottom: '20px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  logoBadge: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: '#1f2937',
  },
  headerSubtitle: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#6b7280',
  },
  roleSwitcher: {
    display: 'flex',
    gap: '10px',
  },
  roleBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  demoBar: {
    backgroundColor: '#fffbeb',
    border: '1px dashed #f59e0b',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  demoLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#92400e',
  },
  statusBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #d97706',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#b45309',
    cursor: 'pointer',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '12px 18px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '20px',
    border: '1px solid #86efac',
  },
  orderSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #f3f4f6',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    marginBottom: '20px',
  },
  orderSummaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  orderStatusBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  itemName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
  },
  itemVariant: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  itemPrice: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#d97706',
    marginTop: '4px',
  },
  reviewBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #f59e0b',
    color: '#d97706',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
