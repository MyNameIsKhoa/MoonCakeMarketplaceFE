import { http as apiClient } from '../../../services/api/http';

export const fulfillmentApi = {
  // --- Shipment Endpoints ---
  createShipment: async (shipmentData) => {
    const response = await apiClient.post('/api/shipments', shipmentData);
    return response.data;
  },

  getShipmentsBySellerOrder: async (sellerOrderId) => {
    const response = await apiClient.get('/api/shipments', {
      params: { sellerOrderId },
    });
    return response.data;
  },

  getShipmentById: async (id) => {
    const response = await apiClient.get(`/api/shipments/${id}`);
    return response.data;
  },

  updateShipment: async (id, data) => {
    const response = await apiClient.patch(`/api/shipments/${id}`, data);
    return response.data;
  },

  markAsShipped: async (id) => {
    const response = await apiClient.post(`/api/shipments/${id}/ship`);
    return response.data;
  },

  markAsDelivered: async (id) => {
    const response = await apiClient.post(`/api/shipments/${id}/delivered`);
    return response.data;
  },

  // --- Order Acceptance Endpoint ---
  acceptSellerOrder: async (sellerOrderId) => {
    const response = await apiClient.post(`/api/seller-orders/${sellerOrderId}/accept`);
    return response.data;
  },

  // --- Review Endpoints ---
  createReview: async (reviewData) => {
    const response = await apiClient.post('/api/reviews', reviewData);
    return response.data;
  },

  getReviewsByVariant: async (variantId) => {
    const response = await apiClient.get('/api/reviews', {
      params: { variantId },
    });
    return response.data;
  },

  getMyReviews: async () => {
    const response = await apiClient.get('/api/reviews', {
      params: { mine: true },
    });
    return response.data;
  },

  getReviewById: async (id) => {
    const response = await apiClient.get(`/api/reviews/${id}`);
    return response.data;
  },
};
