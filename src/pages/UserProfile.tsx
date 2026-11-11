import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { Address, Promotion, Store } from '../types';
import { addressApi, ApiError, userApi, catalogApi, toPromotion } from '../services/api';
import { errorMessage } from '../services/api/http';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { formatAddress, formatDate, formatPromotionRule, parseApiDate } from '../utils/format';
import PayoutAccountForm from '../components/PayoutAccountForm';

const EMPTY_ADDRESS = {
  recipientName: '',
  recipientPhone: '',
  addressLine: '',
  ward: '',
  district: '',
  city: 'TP. Hồ Chí Minh',
  isDefault: false
};

type AddressDraft = typeof EMPTY_ADDRESS;
type AddressField = Exclude<keyof AddressDraft, 'isDefault'>;
type AddressErrors = Partial<Record<AddressField, string>>;

/** Identity ValidationPatterns.PHONE_OR_EMPTY (the field is required, so only the non-empty branch applies). */
const PHONE_PATTERN = /^\+?[0-9][0-9 .-]{6,28}[0-9]$/;
const PHONE_MESSAGE = "Số điện thoại không hợp lệ: chỉ gồm chữ số, khoảng trắng, '.', '-' (có thể bắt đầu bằng '+'), tối thiểu 8 chữ số/ký tự.";

/** Identity validates the raw values (pattern, max length), so the form always sends them trimmed. */
const trimAddress = (d: AddressDraft): AddressDraft => ({
  recipientName: d.recipientName.trim(),
  recipientPhone: d.recipientPhone.trim(),
  addressLine: d.addressLine.trim(),
  ward: d.ward.trim(),
  district: d.district.trim(),
  city: d.city.trim(),
  isDefault: d.isDefault
});

/** Same rules as Identity AddressRequest (create) / UpdateAddressRequest (edit). Expects trimmed values. */
function validateAddress(d: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  if (!d.recipientName) errors.recipientName = 'Vui lòng nhập họ tên người nhận.';
  else if (d.recipientName.length > 255) errors.recipientName = 'Họ tên người nhận tối đa 255 ký tự.';
  if (!d.recipientPhone) errors.recipientPhone = 'Vui lòng nhập số điện thoại.';
  else if (d.recipientPhone.length > 30 || !PHONE_PATTERN.test(d.recipientPhone)) errors.recipientPhone = PHONE_MESSAGE;
  if (!d.addressLine) errors.addressLine = 'Vui lòng nhập địa chỉ cụ thể.';
  else if (d.addressLine.length > 500) errors.addressLine = 'Địa chỉ cụ thể tối đa 500 ký tự.';
  if (d.ward.length > 100) errors.ward = 'Phường/xã tối đa 100 ký tự.';
  if (d.district.length > 100) errors.district = 'Quận/huyện tối đa 100 ký tự.';
  if (!d.city) errors.city = 'Vui lòng nhập tỉnh/thành phố.';
  else if (d.city.length > 100) errors.city = 'Tỉnh/thành phố tối đa 100 ký tự.';
  return errors;
}

/** errorMessage(), with Vietnamese text where Identity answers in English. */
function addressErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 400) return 'Thông tin địa chỉ chưa hợp lệ, vui lòng kiểm tra lại các trường.';
  if (err instanceof ApiError && err.status === 404) return 'Địa chỉ không còn tồn tại (có thể đã bị xóa).';
  if (err instanceof ApiError && err.status === 409) return 'Không thể bỏ địa chỉ mặc định; hãy đặt một địa chỉ khác làm mặc định.';
  return errorMessage(err);
}

const toDraft = (a: Address): AddressDraft => ({
  recipientName: a.recipientName,
  recipientPhone: a.recipientPhone,
  addressLine: a.addressLine,
  ward: a.ward ?? '',
  district: a.district ?? '',
  city: a.city,
  isDefault: a.isDefault
});

interface AddressFormProps {
  idPrefix: string;
  initial: AddressDraft;
  /** Editing the current default: Identity rejects un-setting it, so the checkbox is locked. */
  isCurrentDefault?: boolean;
  submitLabel: string;
  /** Receives trimmed, validated values; a rejection is shown inside the form. */
  onSubmit: (draft: AddressDraft) => Promise<void>;
  onCancel: () => void;
}

/** Create and edit share the same fields and validation. */
function AddressForm({ idPrefix, initial, isCurrentDefault = false, submitLabel, onSubmit, onCancel }: AddressFormProps) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const update = (field: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = trimAddress(draft);
    const nextErrors = validateAddress(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setIsSaving(true);
    setFormError('');
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(addressErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const field = (name: AddressField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="mss-field">
      <label className="mss-label" htmlFor={`${idPrefix}-${name}`}>{label}</label>
      <input
        id={`${idPrefix}-${name}`}
        className="mss-input"
        value={draft[name]}
        onChange={update(name)}
        aria-invalid={!!errors[name]}
        {...props}
      />
      {errors[name] && <span className="mss-field-error">{errors[name]}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="mss-stack rounded-xl border border-gray-200 bg-gray-50 p-4 animate-fadeIn">
      {formError && <p role="alert" className="mss-alert mss-alert--danger m-0 text-sm">{formError}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('recipientName', 'Họ tên người nhận *', { required: true, maxLength: 255, placeholder: 'VD: Nguyễn Văn A', autoComplete: 'name' })}
        {field('recipientPhone', 'Số điện thoại *', { required: true, maxLength: 30, type: 'tel', placeholder: 'VD: 0912345678', autoComplete: 'tel' })}
      </div>
      {field('addressLine', 'Địa chỉ cụ thể (số nhà, đường) *', { required: true, maxLength: 500, placeholder: 'VD: 123 Lê Duẩn' })}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {field('ward', 'Phường/xã', { maxLength: 100 })}
        {field('district', 'Quận/huyện', { maxLength: 100 })}
        {field('city', 'Tỉnh/thành phố *', { required: true, maxLength: 100 })}
      </div>
      {isCurrentDefault ? (
        <p className="text-sm text-gray-600 m-0">
          Đây là địa chỉ mặc định. Muốn đổi, hãy chọn “Đặt làm mặc định” ở một địa chỉ khác.
        </p>
      ) : (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={draft.isDefault} onChange={update('isDefault')} />
          Đặt làm địa chỉ mặc định
        </label>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={onCancel} disabled={isSaving} className="mss-button mss-button--secondary mss-button--sm">Hủy</button>
        <button type="submit" disabled={isSaving} className="mss-button mss-button--primary mss-button--sm">
          {isSaving ? 'Đang lưu…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

type ProfileTab = 'info' | 'addresses' | 'promotions' | 'rfq';

interface UserProfileProps {
  initialTab?: ProfileTab;
  onOpenStore?: (s: Store) => void;
  setActiveTab: (tab: string) => void;
}

export default function UserProfile({
  onOpenStore,
  setActiveTab
}: UserProfileProps) {
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('info');

  // Account info: GET/PATCH /api/users/me (the page is only reachable when logged in).
  const { user, setUser, isAdmin, isSupplier, supplierProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? supplierProfile?.companyName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const displayName = user?.fullName || supplierProfile?.companyName || user?.email || 'Tài khoản';

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setProfileMessage({ ok: false, text: 'Họ và tên không được để trống.' });
      return;
    }
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      setUser(await userApi.updateMe({ fullName: fullName.trim(), phone: phone.trim() }));
      setProfileMessage({ ok: true, text: 'Đã lưu thông tin tài khoản.' });
    } catch (err) {
      setProfileMessage({ ok: false, text: err instanceof ApiError && err.status === 400 ? 'Thông tin chưa hợp lệ (họ tên tối đa 255, SĐT tối đa 30 ký tự).' : 'Không lưu được thông tin, vui lòng thử lại.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Delete failure shown inside the card it belongs to. */
  const [cardError, setCardError] = useState<{ addressId: string; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    addressApi.list()
      .then(items => { if (!cancelled) setAddresses(items); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAddresses([]);
        setAddressError(errorMessage(err));
      });
    return () => { cancelled = true; };
  }, []);

  const { findStore } = useCatalog();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionError, setPromotionError] = useState('');
  const [promotionLoading, setPromotionLoading] = useState(true);
  const [promotionReload, setPromotionReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setPromotionLoading(true); setPromotionError(''); setPromotions([]);
    async function load() {
      const first = await catalogApi.promotions.list({ size: 100 });
      const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
        catalogApi.promotions.list({ page: i + 1, size: 100 })));
      if (!cancelled) setPromotions([first, ...rest].flatMap(page => page.items.map(toPromotion)));
    }
    load().catch(() => { if (!cancelled) setPromotionError('Không tải được danh sách ưu đãi.'); })
      .finally(() => { if (!cancelled) setPromotionLoading(false); });
    return () => { cancelled = true; };
  }, [promotionReload]);

  const nowMs = Date.now();
  const activePromotions = promotions.filter(p => {
    const startMs = parseApiDate(p.startAt)?.getTime() ?? Date.parse(p.startAt);
    const endMs = parseApiDate(p.endAt)?.getTime() ?? Date.parse(p.endAt);
    return p.status === 'ACTIVE' && startMs <= nowMs && endMs > nowMs;
  });

  /** Never throws: a failed reload is shown above the list. */
  const reloadAddresses = async () => {
    try {
      setAddresses(await addressApi.list());
    } catch (err) {
      setAddressError(errorMessage(err));
    }
  };

  // Form handlers throw on failure so AddressForm shows the error inline; once the write succeeded the form
  // closes before the reload, so a failed reload can never lead to a duplicate submit.
  const handleAddAddress = async (draft: AddressDraft) => {
    setAddressError('');
    await addressApi.create({
      ...draft,
      ward: draft.ward || undefined,
      district: draft.district || undefined,
      isDefault: draft.isDefault || addresses?.length === 0
    });
    setShowAddAddress(false);
    await reloadAddresses();
  };

  const handleUpdateAddress = async (addr: Address, draft: AddressDraft) => {
    setAddressError('');
    await addressApi.update(addr.addressId, {
      recipientName: draft.recipientName,
      recipientPhone: draft.recipientPhone,
      addressLine: draft.addressLine,
      // '' clears the optional parts (Identity ignores null/omitted ward and district).
      ward: draft.ward,
      district: draft.district,
      city: draft.city,
      // Only ever sets a new default: un-setting the current default is rejected by Identity (409).
      ...(draft.isDefault && !addr.isDefault ? { isDefault: true } : {})
    });
    setEditingAddressId(null);
    await reloadAddresses();
  };

  const handleDeleteAddress = async (addressId: string) => {
    setDeletingId(addressId);
    setCardError(null);
    setAddressError('');
    try {
      await addressApi.remove(addressId);
      setConfirmDeleteId(null);
      // Identity may have moved the default to another address: always reload.
      await reloadAddresses();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Already gone (deleted in another tab): just refresh the list.
        setConfirmDeleteId(null);
        await reloadAddresses();
      } else {
        setCardError({ addressId, text: addressErrorMessage(err) });
      }
    } finally {
      setDeletingId(null);
    }
  };

  /** Identity hands the default to the oldest remaining address (lowest id) when the default is deleted. */
  const deleteWarning = (addr: Address, all: Address[]) => {
    if (!addr.isDefault) return 'Xóa địa chỉ này khỏi sổ địa chỉ? Thao tác không thể hoàn tác.';
    const next = all
      .filter(a => a.addressId !== addr.addressId)
      .sort((a, b) => Number(a.addressId) - Number(b.addressId))[0];
    return next
      ? `Đây là địa chỉ mặc định. Sau khi xóa, địa chỉ “${next.recipientName} – ${formatAddress(next)}” sẽ trở thành mặc định. Xóa địa chỉ này?`
      : 'Đây là địa chỉ duy nhất của bạn. Sau khi xóa, bạn cần thêm địa chỉ mới trước khi đặt hàng. Xóa địa chỉ này?';
  };

  const handleSetDefault = async (addressId: string) => {
    setAddressError('');
    try {
      setAddresses(await addressApi.setDefault(addressId));
    } catch (err) {
      setAddressError(errorMessage(err));
    }
  };

  return (
    <div className="mss-container mss-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-950 to-accent-950 text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-accent-400 text-primary-950 font-bold text-3xl flex items-center justify-center border-4 border-white shadow-xl">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <span className="bg-accent-400 text-primary-950 text-sm font-bold px-3 py-1 rounded-full">
              {isAdmin ? 'Quản trị viên' : isSupplier ? 'Nhà cung cấp' : 'Khách hàng'}
            </span>
          </div>
          <p className="text-gray-300 text-sm">Email: {user?.email}{user?.phone ? ` • SĐT: ${user.phone}` : ''}</p>
          {!promotionLoading && !promotionError && activePromotions.length > 0 && (
            <div className="text-sm text-accent-300 pt-1">
              <span>{activePromotions.length} ưu đãi gian hàng đang áp dụng trên sàn</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'info', label: 'Thông tin tài khoản' },
          { id: 'addresses', label: 'Sổ địa chỉ nhận hàng' },
          { id: 'promotions', label: `Ưu đãi gian hàng${!promotionLoading && activePromotions.length > 0 ? ` (${activePromotions.length})` : ''}` },
          { id: 'rfq', label: 'Yêu cầu báo giá (RFQ)' },
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
          <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">Thông Tin Tài Khoản</h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Họ và tên</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={255} className="w-full p-3 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Số điện thoại</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className="w-full p-3 border border-gray-300 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Địa chỉ Email (không thể thay đổi)</label>
              <input type="email" value={user?.email ?? ''} disabled className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-500" />
            </div>

            {profileMessage && (
              <div className={`mss-alert ${profileMessage.ok ? '' : 'mss-alert--danger'}`} role="status">{profileMessage.text}</div>
            )}
            <button onClick={handleSaveProfile} disabled={isSavingProfile} className="px-6 py-3 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold rounded-xl shadow transition text-sm">
              {isSavingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
          <PayoutAccountForm kind="CUSTOMER" />
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
            <AddressForm
              idPrefix="addr-new"
              initial={EMPTY_ADDRESS}
              submitLabel="Lưu địa chỉ"
              onSubmit={handleAddAddress}
              onCancel={() => setShowAddAddress(false)}
            />
          )}

          {addressError && <p role="alert" className="mss-alert mss-alert--danger m-0 text-sm">{addressError}</p>}
          {addresses === null ? (
            <p className="text-sm text-gray-500">Đang tải sổ địa chỉ…</p>
          ) : addresses.length === 0 ? (
            <p className="text-sm text-gray-500">Bạn chưa lưu địa chỉ nhận hàng nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => editingAddressId === addr.addressId ? (
                <div key={addr.addressId} className="md:col-span-2">
                  <AddressForm
                    idPrefix={`addr-${addr.addressId}`}
                    initial={toDraft(addr)}
                    isCurrentDefault={addr.isDefault}
                    submitLabel="Lưu thay đổi"
                    onSubmit={(draft) => handleUpdateAddress(addr, draft)}
                    onCancel={() => setEditingAddressId(null)}
                  />
                </div>
              ) : (
                <div key={addr.addressId} className="p-4 rounded-xl border border-gray-200 flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{addr.recipientName}</h3>
                    {addr.isDefault && <span className="mss-badge mss-badge--info">Mặc định</span>}
                  </div>
                  <p className="text-sm text-gray-600">{addr.recipientPhone}</p>
                  <p className="text-sm text-gray-600">{formatAddress(addr)}</p>
                  {confirmDeleteId === addr.addressId ? (
                    <div className="mss-alert mss-alert--danger mss-stack" role="alert">
                      <p className="m-0">{deleteWarning(addr, addresses)}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.addressId)}
                          disabled={deletingId === addr.addressId}
                          className="mss-button mss-button--danger mss-button--sm"
                        >
                          {deletingId === addr.addressId ? 'Đang xóa…' : 'Xóa địa chỉ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setConfirmDeleteId(null); setCardError(null); }}
                          disabled={deletingId === addr.addressId}
                          className="mss-button mss-button--secondary mss-button--sm"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {!addr.isDefault && (
                        <button onClick={() => handleSetDefault(addr.addressId)} className="mss-button mss-button--secondary mss-button--sm">
                          Đặt làm mặc định
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setEditingAddressId(addr.addressId); setConfirmDeleteId(null); setCardError(null); }}
                        className="mss-button mss-button--secondary mss-button--sm"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmDeleteId(addr.addressId); setCardError(null); }}
                        className="mss-button mss-button--danger mss-button--sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </div>
                  )}
                  {cardError?.addressId === addr.addressId && (
                    <p role="alert" className="mss-field-error m-0">{cardError.text}</p>
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
          <div>
            <h2 className="mss-card-title flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary-700" />
              <span>Ưu đãi đang áp dụng từ các gian hàng</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ưu đãi của từng gian hàng được hệ thống tự động trừ trực tiếp vào đơn hàng khi bạn thanh toán, không cần nhập mã giảm giá.
            </p>
          </div>
          {promotionLoading && <p role="status" className="text-sm text-gray-500">Đang tải danh sách ưu đãi…</p>}
          {promotionError && <p role="alert" className="text-sm text-red-600">{promotionError} <button className="mss-button mss-button--secondary mss-button--sm ml-2" onClick={() => setPromotionReload(k => k + 1)}>Thử lại</button></p>}
          {!promotionLoading && !promotionError && activePromotions.length === 0 && (
            <p className="text-sm text-gray-500">Hiện chưa có chương trình khuyến mãi nào đang diễn ra.</p>
          )}
          <div className="mss-grid-3">
            {activePromotions.map((promo) => {
              const store = findStore(promo.storeId);
              return (
                <div
                  key={promo.promotionId}
                  onClick={() => {
                    if (store && onOpenStore) {
                      onOpenStore(store);
                    }
                  }}
                  className={`rounded-xl border border-accent-200/70 bg-accent-50/30 p-4 flex flex-col justify-between gap-3 ${store && onOpenStore ? 'cursor-pointer hover:border-primary-700 hover:shadow-md transition' : ''}`}
                >
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
                      {store?.name ?? `Gian hàng #${promo.storeId}`}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug">{promo.name}</h3>
                    {promo.rules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {promo.rules.map((rule) => (
                          <span key={rule.promotionRuleId} className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-2 py-0.5 rounded-md">
                            {formatPromotionRule(rule)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 m-0 pt-2 border-t border-accent-200/50">
                    Hiệu lực: {formatDate(promo.startAt)} – {formatDate(promo.endAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab Content: RFQ */}
      {activeProfileTab === 'rfq' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-accent-200/70 shadow-sm space-y-4 max-w-4xl">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-lg">Yêu Cầu Báo Giá Doanh Nghiệp (RFQ)</h3>
            <button onClick={() => setActiveTab('b2b')} className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-xl shadow hover:bg-primary-800 transition">
              Mở cổng báo giá B2B
            </button>
          </div>

          <p className="text-sm text-gray-600">
            Theo dõi các yêu cầu báo giá đã gửi, so sánh đề xuất từ các nhà cung cấp và trao đổi trực tiếp tại cổng Doanh nghiệp &amp; B2B.
          </p>
        </div>
      )}
    </div>
  );
}
