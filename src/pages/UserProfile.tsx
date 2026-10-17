import React, { useEffect, useState } from 'react';
import { Heart, Award, Plus, Building2 } from 'lucide-react';
import { Address, Product } from '../types';
import { BRANDS, PRODUCTS, PROMOTIONS } from '../data/mockData';
import { addressApi } from '../services/api';
import { formatAddress, formatDate } from '../utils/format';

const EMPTY_ADDRESS = {
  recipientName: '',
  recipientPhone: '',
  addressLine: '',
  ward: '',
  district: '',
  city: 'TP. Hồ Chí Minh',
  isDefault: false
};

type ProfileTab = 'info' | 'addresses' | 'promotions' | 'wishlist' | 'rfq';

interface UserProfileProps {
  initialTab?: ProfileTab;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  setSelectedProduct: (p: Product) => void;
  setActiveTab: (tab: string) => void;
}

export default function UserProfile({
  initialTab = 'info',
  wishlistIds,
  onToggleWishlist,
  setSelectedProduct,
  setActiveTab
}: UserProfileProps) {
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>(initialTab);

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [draft, setDraft] = useState(EMPTY_ADDRESS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    addressApi.list().then(setAddresses);
  }, []);

  const wishlistProducts = PRODUCTS.filter(p => wishlistIds.includes(p.id));
  const activePromotions = PROMOTIONS.filter(p => p.status === 'ACTIVE');

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addressApi.create({
        ...draft,
        ward: draft.ward || undefined,
        district: draft.district || undefined,
        isDefault: draft.isDefault || addresses?.length === 0
      });
      setAddresses(await addressApi.list());
      setDraft(EMPTY_ADDRESS);
      setShowAddAddress(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setAddresses(await addressApi.setDefault(addressId));
  };

  const updateDraft = (field: keyof typeof EMPTY_ADDRESS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="mss-container mss-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-950 to-accent-950 text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-accent-400 text-primary-950 font-bold text-3xl flex items-center justify-center border-4 border-white shadow-xl">
          Đ
        </div>
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-2xl font-bold">Nguyễn Hữu Đạt</h1>
            <span className="bg-accent-400 text-primary-950 text-sm font-bold px-3 py-1 rounded-full">Hội Viên Hoàng Gia (450 điểm)</span>
          </div>
          <p className="text-gray-300 text-sm">Email: nguyenhuudat.mkt@gmail.com • SĐT: 0901 234 567</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-accent-300 pt-1">
            <span className="flex items-center gap-1"><Award className="w-4 h-4" /> 1,450 Điểm tích lũy</span>
            <span>•</span>
            <span>{activePromotions.length} khuyến mãi đang chạy</span>
            <span>•</span>
            <span className="text-green-300 font-semibold">✓ Đã xác thực B2B</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'info', label: 'Thông tin tài khoản' },
          { id: 'addresses', label: 'Sổ địa chỉ nhận hàng' },
          { id: 'promotions', label: 'Khuyến mãi gian hàng' },
          { id: 'wishlist', label: `Sản phẩm yêu thích (${wishlistIds.length})` },
          { id: 'rfq', label: 'Yêu cầu báo giá của tôi (RFQ)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveProfileTab(tab.id as any)}
            className={`px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              activeProfileTab === tab.id ? 'bg-primary-700 text-white shadow' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: INFO */}
      {activeProfileTab === 'info' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-accent-200/70 shadow-sm space-y-6 max-w-3xl">
          <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Thông Tin Cá Nhân & Xuất Hóa Đơn VAT B2B</h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Họ và tên</label>
                <input type="text" defaultValue="Nguyễn Hữu Đạt" className="w-full p-3 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Số điện thoại</label>
                <input type="text" defaultValue="0901234567" className="w-full p-3 border border-gray-300 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Địa chỉ Email (Bảo mật)</label>
              <input type="email" defaultValue="nguyenhuudat.mkt@gmail.com" disabled className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-500" />
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-700" />
                <span>Thông tin xuất hóa đơn VAT công ty (B2B)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tên công ty</label>
                  <input type="text" defaultValue="Công ty TNHH Giải Pháp Công Nghệ MoonCorp" className="w-full p-3 border border-gray-300 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mã số thuế</label>
                  <input type="text" defaultValue="0316892341" className="w-full p-3 border border-gray-300 rounded-xl text-sm" />
                </div>
              </div>
            </div>

            <button onClick={() => alert('Cập nhật thông tin tài khoản thành công!')} className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white font-semibold rounded-xl shadow transition text-sm">
              Lưu Thay Đổi
            </button>
          </div>
        </div>
      )}

      {/* Tab Content: ADDRESSES (Identity.address) */}
      {activeProfileTab === 'addresses' && (
        <section className="mss-card mss-stack max-w-4xl">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="mss-card-title">Sổ địa chỉ nhận hàng</h2>
            <button onClick={() => setShowAddAddress(!showAddAddress)} className="mss-button mss-button--primary mss-button--sm">
              <Plus className="w-4 h-4" />
              Thêm địa chỉ mới
            </button>
          </div>

          {showAddAddress && (
            <form onSubmit={handleAddAddress} className="mss-stack rounded-xl border border-gray-200 bg-gray-50 p-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="mss-field">
                  <label className="mss-label" htmlFor="addr-name">Họ tên người nhận *</label>
                  <input id="addr-name" className="mss-input" required value={draft.recipientName} onChange={updateDraft('recipientName')} placeholder="VD: Nguyễn Văn A" />
                </div>
                <div className="mss-field">
                  <label className="mss-label" htmlFor="addr-phone">Số điện thoại *</label>
                  <input id="addr-phone" className="mss-input" required type="tel" value={draft.recipientPhone} onChange={updateDraft('recipientPhone')} placeholder="VD: 0912345678" />
                </div>
              </div>
              <div className="mss-field">
                <label className="mss-label" htmlFor="addr-line">Địa chỉ cụ thể (số nhà, đường) *</label>
                <input id="addr-line" className="mss-input" required value={draft.addressLine} onChange={updateDraft('addressLine')} placeholder="VD: 123 Lê Duẩn" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="mss-field">
                  <label className="mss-label" htmlFor="addr-ward">Phường/xã</label>
                  <input id="addr-ward" className="mss-input" value={draft.ward} onChange={updateDraft('ward')} />
                </div>
                <div className="mss-field">
                  <label className="mss-label" htmlFor="addr-district">Quận/huyện</label>
                  <input id="addr-district" className="mss-input" value={draft.district} onChange={updateDraft('district')} />
                </div>
                <div className="mss-field">
                  <label className="mss-label" htmlFor="addr-city">Tỉnh/thành phố *</label>
                  <input id="addr-city" className="mss-input" required value={draft.city} onChange={updateDraft('city')} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={draft.isDefault} onChange={updateDraft('isDefault')} />
                Đặt làm địa chỉ mặc định
              </label>
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => setShowAddAddress(false)} className="mss-button mss-button--secondary mss-button--sm">Hủy</button>
                <button type="submit" disabled={isSaving} className="mss-button mss-button--primary mss-button--sm">
                  {isSaving ? 'Đang lưu…' : 'Lưu địa chỉ'}
                </button>
              </div>
            </form>
          )}

          {addresses === null ? (
            <p className="text-sm text-gray-500">Đang tải sổ địa chỉ…</p>
          ) : addresses.length === 0 ? (
            <p className="text-sm text-gray-500">Bạn chưa lưu địa chỉ nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div key={addr.addressId} className="p-4 rounded-xl border border-gray-200 flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{addr.recipientName}</h3>
                    {addr.isDefault && <span className="mss-badge mss-badge--info">Mặc định</span>}
                  </div>
                  <p className="text-sm text-gray-600">{addr.recipientPhone}</p>
                  <p className="text-sm text-gray-600">{formatAddress(addr)}</p>
                  {!addr.isDefault && (
                    <button onClick={() => handleSetDefault(addr.addressId)} className="self-start text-sm font-semibold text-primary-700 hover:underline">
                      Đặt làm mặc định
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab Content: STORE PROMOTIONS (Catalog.promotion — applied automatically at checkout) */}
      {activeProfileTab === 'promotions' && (
        <section className="mss-card mss-stack max-w-4xl">
          <h2 className="mss-card-title">Khuyến mãi đang chạy</h2>
          <p className="text-sm text-gray-500">Khuyến mãi được hệ thống tự áp dụng theo từng gian hàng khi bạn thanh toán, không cần nhập mã.</p>
          <div className="mss-grid-3">
            {activePromotions.map((promo) => (
              <div key={promo.promotionId} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                <span className="text-sm font-semibold text-primary-700">{BRANDS.find((b) => b.id === promo.storeId)?.name ?? promo.storeId}</span>
                <h3 className="font-semibold text-gray-900">{promo.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(promo.startAt)} – {formatDate(promo.endAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab Content: WISHLIST */}
      {activeProfileTab === 'wishlist' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <h3 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3">Sản Phẩm Yêu Thích ({wishlistProducts.length})</h3>
          {wishlistProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-500 text-sm">Bạn chưa có sản phẩm yêu thích nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-accent-200/60 flex flex-col group">
                  <div className="relative overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}>
                    <img src={product.image} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-105 transition" />
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full shadow"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <h4
                      onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}
                      className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer"
                    >
                      {product.name}
                    </h4>
                    <span className="text-primary-700 font-bold text-base">{product.price.toLocaleString()}đ</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: RFQ */}
      {activeProfileTab === 'rfq' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-accent-200/70 shadow-sm space-y-6 max-w-4xl">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-lg">Yêu Cầu Báo Giá (RFQ) Đã Gửi</h3>
            <button onClick={() => setActiveTab('b2b')} className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-xl shadow hover:bg-primary-800 transition">
              + Tạo Yêu Cầu Báo Giá Mới
            </button>
          </div>

          <div className="space-y-4">
            <div className="border border-accent-200 bg-accent-50/40 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-primary-800 bg-accent-200 px-3 py-1 rounded">#RFQ2026-0088</span>
                <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">Đang nhận báo giá (3 xưởng phản hồi)</span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">500 hộp bánh trung thu cao cấp quà tặng đối tác VIP 2026</h4>
              <p className="text-sm text-gray-600">Ngân sách: 150.000.000 ₫ • Giao ngày 20/09/2026 tại Landmark 81, TP.HCM</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveTab('b2b')} className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-xl shadow">Xem Báo Giá Từ Xưởng (Kinh Đô, Givral...)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
