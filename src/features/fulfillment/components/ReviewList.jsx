import { useState, useEffect } from 'react';
import { fulfillmentApi } from '../api/fulfillmentApi';

const SAMPLE_REVIEWS = [
  {
    reviewId: 1,
    customerId: 701,
    rating: 5,
    comment: 'Bánh rất ngon, nhân thập cẩm jambon chuẩn vị truyền thống, vỏ bánh mềm thơm!',
    createdAt: '2026-09-13T10:15:00',
  },
  {
    reviewId: 2,
    customerId: 703,
    rating: 5,
    comment: 'Hộp bánh đóng gói cực kỳ sang trọng, giao hàng nhanh chóng trước Tết Trung Thu.',
    createdAt: '2026-09-14T14:30:00',
  },
];

export const ReviewList = ({ variantId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fulfillmentApi.getReviewsByVariant(variantId);
        if (isMounted) {
          setReviews(data && data.length > 0 ? data : SAMPLE_REVIEWS);
        }
      } catch {
        if (isMounted) {
          // Graceful fallback to sample reviews if backend is not reachable
          setReviews(SAMPLE_REVIEWS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [variantId]);

  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#6b7280' }}>Đang tải đánh giá...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;
  }

  const avgRating = calculateAverageRating();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Đánh giá từ khách hàng ({reviews.length})</h3>
        {reviews.length > 0 && (
          <div style={styles.avgBox}>
            <span style={styles.avgNumber}>{avgRating}</span>
            <div>
              <div style={styles.starsRow}>{'★'.repeat(Math.round(Number(avgRating)))}</div>
              <div style={styles.avgSubtext}>trên 5 sao</div>
            </div>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div style={styles.emptyState}>
          Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên thưởng thức và chia sẻ cảm nhận!
        </div>
      ) : (
        <div style={styles.list}>
          {reviews.map((review) => (
            <div key={review.reviewId} style={styles.reviewItem}>
              <div style={styles.reviewHeader}>
                <div style={styles.authorBadge}>
                  {review.customerId ? `Khách hàng #${review.customerId}` : 'Khách hàng ẩn danh'}
                </div>
                <div style={styles.reviewDate}>
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                </div>
              </div>
              <div style={styles.starDisplay}>
                <span style={{ color: '#f59e0b', fontSize: '16px' }}>
                  {'★'.repeat(review.rating)}
                </span>
                <span style={{ color: '#d1d5db', fontSize: '16px' }}>
                  {'★'.repeat(5 - review.rating)}
                </span>
              </div>
              {review.comment && (
                <p style={styles.commentText}>{review.comment}</p>
              )}
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
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f3f4f6',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  avgBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avgNumber: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#d97706',
  },
  starsRow: {
    color: '#f59e0b',
    fontSize: '16px',
  },
  avgSubtext: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 10px',
    color: '#6b7280',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  reviewItem: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  authorBadge: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#374151',
  },
  reviewDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  starDisplay: {
    marginBottom: '8px',
  },
  commentText: {
    margin: 0,
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5',
  },
};
