import React, { useState } from 'react';
import { fulfillmentApi } from '../api/fulfillmentApi';

export const ReviewModal = ({ orderItem, isOpen, onClose, onReviewed }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !orderItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Vui lòng chọn từ 1 đến 5 sao.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fulfillmentApi.createReview({
        orderItemId: orderItem.id,
        rating,
        comment: comment.trim(),
      });
      if (onReviewed) {
        onReviewed(response);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Đánh giá sản phẩm</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.productInfo}>
          <div style={styles.productName}>{orderItem.productNameSnapshot || 'Bánh trung thu cao cấp'}</div>
          {orderItem.variantNameSnapshot && (
            <div style={styles.variantName}>Phân loại: {orderItem.variantNameSnapshot}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating Section */}
          <div style={styles.ratingSection}>
            <label style={styles.label}>Chất lượng sản phẩm:</label>
            <div style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    style={{
                      ...styles.starBtn,
                      color: isFilled ? '#f59e0b' : '#d1d5db',
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                );
              })}
              <span style={styles.ratingText}>
                {rating === 5 && 'Tuyệt vời'}
                {rating === 4 && 'Hài lòng'}
                {rating === 3 && 'Bình thường'}
                {rating === 2 && 'Chưa hài lòng'}
                {rating === 1 && 'Rất tệ'}
              </span>
            </div>
          </div>

          {/* Comment Section */}
          <div style={styles.commentSection}>
            <label style={styles.label}>Nhận xét của bạn (không bắt buộc):</label>
            <textarea
              style={styles.textarea}
              rows="4"
              placeholder="Chia sẻ cảm nhận về hương vị bánh, độ ngọt, bao bì đóng gói..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
            />
            <div style={styles.charCount}>{comment.length}/2000</div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
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
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#6b7280',
    cursor: 'pointer',
  },
  productInfo: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  productName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#1f2937',
  },
  variantName: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  ratingSection: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  starsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: 'color 0.15s ease',
  },
  ratingText: {
    marginLeft: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#d97706',
  },
  commentSection: {
    marginBottom: '16px',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  errorBox: {
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#d97706',
    color: '#ffffff',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
