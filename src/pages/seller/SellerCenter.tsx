import React, { useState } from 'react';
import { 
  LayoutDashboard, Store, Package, Tag, Receipt, Truck, 
  FileText, DollarSign, MessageSquare, Wallet, Star, 
  ShieldCheck, Plus, Megaphone, TrendingUp, Search, Bell, 
  User as UserIcon, LogOut, BookOpen, CheckCircle, AlertTriangle, Edit3, 
  Eye, Trash2, Cloud, ArrowRight, RefreshCw, Download, Printer, Zap, 
  Layers, Sliders, BarChart3, Check, Clock, UserCheck, HelpCircle
} from 'lucide-react';

interface SellerCenterProps {
  onBackToShop: () => void;
}

export default function SellerCenter({ onBackToShop }: SellerCenterProps) {
  const [currentSubTab, setCurrentSubTab] = useState<string>('tong-quan');
  const [selectedTheme, setSelectedTheme] = useState<'red' | 'green' | 'amber'>('red');
  const [storeName, setStoreName] = useState('Kinh Đô Official Store');
  const [productSearch, setProductSearch] = useState('');
  const [newProdName, setNewProdName] = useState('Hộp Bánh Trung Thu Trăng Vàng Hoàng Kim VIP (4 bánh 180g + Trà)');
  const [newProdPrice, setNewProdPrice] = useState('1250000');
  const [newProdStock, setNewProdStock] = useState('80');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const navItems = [
    { id: 'tong-quan', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'ho-so-gian-hang', label: 'Hồ sơ gian hàng', icon: Store },
    { id: 'san-pham', label: 'Sản phẩm', icon: Package },
    { id: 'khuyen-mai', label: 'Khuyến mãi', icon: Tag },
    { id: 'don-hang', label: 'Đơn hàng', icon: Receipt },
    { id: 'van-chuyen', label: 'Vận chuyển', icon: Truck },
    { id: 'yeu-cau-bao-gia', label: 'Yêu cầu báo giá (RFQ)', icon: FileText, badge: 'RFQ' },
    { id: 'bao-gia-cua-toi', label: 'Báo giá của tôi', icon: DollarSign },
    { id: 'tin-nhan', label: 'Tin nhắn', icon: MessageSquare, dot: true },
    { id: 'doi-soat', label: 'Đối soát', icon: Wallet },
    { id: 'admin-duyet', label: 'Quản trị Sàn & Duyệt người bán', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[var(--mss-bg)] flex text-[var(--mss-text)] font-sans">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white z-50 flex-col shadow-md">
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-900 text-white flex items-center justify-center font-bold">
              🥮
            </div>
            <div>
              <span className="font-bold text-primary-900 text-sm block leading-tight">Bánh Trung Thu</span>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Kênh Người Bán</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSubTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-green-100 text-green-800'}`}>
                    {item.badge}
                  </span>
                )}
                {item.dot && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
              </button>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <button
            onClick={onBackToShop}
            className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-primary-950 font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2"
          >
            <span>Quay Lại Sàn Mua Sắm</span>
          </button>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Hotline: 1900 6868</span>
            <button onClick={onBackToShop} className="text-red-600 hover:underline">Thoát</button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 h-16 bg-white/90 backdrop-blur-md z-40 shadow-sm flex items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold text-gray-800">Kênh Người Bán (Seller Center)</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-sm">
                KD
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-none">{storeName}</span>
                <span className="text-xs text-green-700 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3 h-3" /> Đã chứng nhận VSATTP
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="p-4 lg:p-6 flex-1 flex flex-col gap-6 min-w-0">
          {/* Mobile navigation (sidebar is desktop-only) */}
          <div className="lg:hidden flex flex-col gap-2">
            <select
              className="mss-select"
              value={currentSubTab}
              onChange={(e) => setCurrentSubTab(e.target.value)}
              aria-label="Chọn mục quản lý"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <button onClick={onBackToShop} className="mss-button mss-button--secondary mss-button--sm self-start">Quay lại sàn mua sắm</button>
          </div>
          {/* TAB 1: TỔNG QUAN (DASHBOARD) */}
          {currentSubTab === 'tong-quan' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Alert banner */}
              <div className="rounded-xl bg-accent-100/70 border border-accent-300 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-200 text-accent-900 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Hồ sơ đang chờ xét duyệt định danh gian hàng mùa vụ 2026</h3>
                    <p className="text-gray-600 text-sm mt-1">Gian hàng sẽ hiển thị công khai trên sàn sau khi xác minh giấy phép kinh doanh và chứng nhận VSATTP.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentSubTab('ho-so-gian-hang')}
                  className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 transition shrink-0"
                >
                  Xem chi tiết hồ sơ →
                </button>
              </div>

              {/* Welcome Banner */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Xin chào, {storeName} 👋</h1>
                  <p className="text-gray-500 text-sm mt-1">Tổng quan tình hình kinh doanh mùa Tết Trung Thu 2026 hôm nay (Cập nhật thời gian thực)</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCurrentSubTab('khuyen-mai')}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl flex items-center gap-2 transition"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>Tạo Khuyến Mãi</span>
                  </button>
                  <button 
                    onClick={() => setCurrentSubTab('san-pham')}
                    className="px-4 py-3 bg-primary-700 hover:bg-primary-800 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Sản Phẩm Mới</span>
                  </button>
                </div>
              </div>

              {/* KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500 uppercase font-semibold">Đơn chờ xử lý</span>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">18</h3>
                    </div>
                    <div className="p-3 bg-primary-50 text-primary-700 rounded-xl"><Package className="w-5 h-5" /></div>
                  </div>
                  <span className="mt-4 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded font-semibold w-fit">+5 đơn mới cần xác nhận</span>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500 uppercase font-semibold">Đơn đang giao xe lạnh</span>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">42</h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-700 rounded-xl"><Truck className="w-5 h-5" /></div>
                  </div>
                  <span className="mt-4 text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold w-fit">Đúng hẹn 98.5%</span>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500 uppercase font-semibold">Yêu cầu báo giá mới (RFQ)</span>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">05</h3>
                    </div>
                    <div className="p-3 bg-accent-50 text-accent-700 rounded-xl"><FileText className="w-5 h-5" /></div>
                  </div>
                  <span className="mt-4 text-xs bg-accent-100 text-accent-900 px-2 py-1 rounded font-semibold w-fit">2 sắp hết hạn báo giá</span>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500 uppercase font-semibold">Doanh thu chờ đối soát</span>
                      <h3 className="text-lg font-bold text-primary-700 mt-1">186.450.000 ₫</h3>
                    </div>
                    <div className="p-3 bg-gray-100 text-gray-800 rounded-xl"><Wallet className="w-5 h-5" /></div>
                  </div>
                  <span className="mt-4 text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold w-fit">+12.4% tuần này</span>
                </div>
              </div>

              {/* Quick actions or table preview */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-base">Đơn Hàng Doanh Nghiệp Mới Nhất</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase">
                        <th className="py-3 px-3 font-semibold">Mã đơn</th>
                        <th className="py-3 px-3 font-semibold">Khách hàng B2B</th>
                        <th className="py-3 px-3 font-semibold">Sản phẩm</th>
                        <th className="py-3 px-3 font-semibold text-right">Tổng tiền</th>
                        <th className="py-3 px-3 font-semibold text-center">Trạng thái</th>
                        <th className="py-3 px-3 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-3 font-mono font-bold text-gray-900">SO-KD-88391</td>
                        <td className="py-3 px-3 font-semibold text-gray-900">Công ty TNHH MoonCorp</td>
                        <td className="py-3 px-3 text-gray-600">500 hộp Trăng Vàng Kim VIP</td>
                        <td className="py-3 px-3 text-right font-bold text-primary-700">142.500.000 ₫</td>
                        <td className="py-3 px-3 text-center"><span className="bg-accent-100 text-accent-800 px-2 py-1 rounded font-semibold">Chờ xử lý</span></td>
                        <td className="py-3 px-3 text-right">
                          <button onClick={() => setCurrentSubTab('don-hang')} className="px-3 py-1 bg-primary-700 text-white rounded font-semibold hover:bg-primary-800">Xử lý</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HỒ SƠ GIAN HÀNG (STORE PROFILE) */}
          {currentSubTab === 'ho-so-gian-hang' && (
            <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Hồ Sơ Gian Hàng & Nhận Diện</h1>
                  <p className="text-gray-500 text-sm mt-1">Quản lý thông tin pháp lý doanh nghiệp và tùy biến giao diện hiển thị trên sàn</p>
                </div>
                <button 
                  onClick={() => showToast('Đã lưu thay đổi hồ sơ gian hàng thành công!')}
                  className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white text-sm font-bold rounded-xl shadow transition"
                >
                  Lưu Thay Đổi
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">Thông Tin Pháp Lý Doanh Nghiệp (B2B)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Tên công ty đăng ký kinh doanh *</label>
                    <input type="text" defaultValue="Công ty Cổ phần Mondelez Kinh Đô Việt Nam" className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Mã số thuế (MST) *</label>
                    <input type="text" defaultValue="0302721831" className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Tên hiển thị gian hàng trên sàn *</label>
                    <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl font-bold text-primary-800" />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Hotline CSKH Doanh Nghiệp</label>
                    <input type="text" defaultValue="1900 1509" className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm">Chọn Màu Sắc Chủ Đạo Gian Hàng</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'red', name: 'Đỏ Hoàng Kim (Mặc định)', color: '#990000' },
                      { id: 'green', name: 'Xanh Thảo Mộc (Chay/Trà)', color: '#006D40' },
                      { id: 'amber', name: 'Hổ Phách Thượng Hạng', color: '#5F4600' }
                    ].map(t => (
                      <div 
                        key={t.id}
                        onClick={() => setSelectedTheme(t.id as any)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedTheme === t.id ? 'border-primary-700 bg-primary-50/50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full" style={{ backgroundColor: t.color }}></span>
                          <span className="text-sm font-semibold">{t.name}</span>
                        </div>
                        {selectedTheme === t.id && <CheckCircle className="w-4 h-4 text-primary-700" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SẢN PHẨM & THÊM/SỬA SẢN PHẨM */}
          {currentSubTab === 'san-pham' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Quản Lý Sản Phẩm (Seller Inventory)</h1>
                  <p className="text-gray-500 text-sm mt-1">Thêm, sửa SKU bánh trung thu và cập nhật tồn kho mùa vụ</p>
                </div>
                <button
                  onClick={() => showToast('Mở form thêm sản phẩm mới thành công!')}
                  className="px-5 py-3 bg-primary-700 hover:bg-primary-800 text-white font-bold text-sm rounded-xl shadow transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Sản Phẩm Mới</span>
                </button>
              </div>

              {/* Add / Edit Form Simulator */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">Thêm Nhanh Sản Phẩm SKU Mới</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Tên sản phẩm</label>
                    <input type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Giá bán (đ)</label>
                    <input type="text" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Số lượng tồn kho</label>
                    <input type="number" value={newProdStock} onChange={(e) => setNewProdStock(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                </div>
                <button 
                  onClick={() => showToast(`Đã đăng bán sản phẩm "${newProdName}" thành công!`)}
                  className="px-6 py-3 bg-green-700 text-white font-bold text-sm rounded-xl shadow hover:bg-green-800 transition"
                >
                  Xác Nhận Đăng Bán
                </button>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Danh Sách SKU Đang Mở Bán (28)</h3>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm kiếm SKU..."
                    className="p-2 border border-gray-300 rounded-xl text-sm w-60"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase">
                        <th className="py-3 px-4 font-semibold">Tên sản phẩm & SKU</th>
                        <th className="py-3 px-4 font-semibold">Danh mục</th>
                        <th className="py-3 px-4 font-semibold text-right">Giá bán</th>
                        <th className="py-3 px-4 font-semibold text-center">Tồn kho</th>
                        <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                        <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-4 px-4 font-bold text-gray-900">
                          Hộp Trăng Vàng Hoàng Kim VIP
                          <span className="block text-xs text-gray-500 font-mono">SKU: SP-KD-TV01</span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">Hộp quà cao cấp</td>
                        <td className="py-4 px-4 text-right font-bold text-primary-700">1.280.000 ₫</td>
                        <td className="py-4 px-4 text-center font-semibold text-green-700">145 hộp</td>
                        <td className="py-4 px-4 text-center"><span className="bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">Đang bán</span></td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button onClick={() => showToast('Mở cửa sổ chỉnh sửa SKU')} className="text-blue-600 hover:underline">Sửa</button>
                          <button onClick={() => showToast('Đã ẩn sản phẩm')} className="text-red-600 hover:underline">Ẩn</button>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-bold text-gray-900">
                          Bánh Nướng Thập Cẩm Gà Quay 2 Trứng
                          <span className="block text-xs text-gray-500 font-mono">SKU: SP-KD-NC08</span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">Bánh truyền thống</td>
                        <td className="py-4 px-4 text-right font-bold text-primary-700">185.000 ₫</td>
                        <td className="py-4 px-4 text-center font-semibold text-accent-700">28 chiếc (Sắp hết)</td>
                        <td className="py-4 px-4 text-center"><span className="bg-accent-100 text-accent-800 px-2 py-1 rounded font-semibold">Cảnh báo tồn</span></td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button onClick={() => showToast('Mở cửa sổ chỉnh sửa SKU')} className="text-blue-600 hover:underline">Sửa</button>
                          <button onClick={() => showToast('Đã ẩn sản phẩm')} className="text-red-600 hover:underline">Ẩn</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ĐƠN HÀNG & VẬN CHUYỂN (ORDERS & COLD-CHAIN) */}
          {currentSubTab === 'don-hang' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Quản Lý Đơn Hàng & Vận Chuyển Xe Lạnh</h1>
                  <p className="text-gray-500 text-sm mt-1">Xác nhận đơn, in vận đơn bảo ôn giữ nhiệt cho bánh trung thu</p>
                </div>
                <button 
                  onClick={() => showToast('Đã in hàng loạt phiếu đóng gói thành công!')}
                  className="px-4 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl shadow hover:bg-black transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Phiếu Đóng Gói Hàng Loạt</span>
                </button>
              </div>

              {/* Orders table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex gap-2 border-b border-gray-100 pb-3 text-sm font-semibold">
                  <button className="px-3 py-2 bg-primary-700 text-white rounded-lg">Tất cả (68)</button>
                  <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Chờ xử lý (18)</button>
                  <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Đang giao xe lạnh (42)</button>
                  <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Hoàn tất (8)</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase">
                        <th className="py-3 px-3 font-semibold">Mã đơn hàng</th>
                        <th className="py-3 px-3 font-semibold">Khách hàng B2B / B2C</th>
                        <th className="py-3 px-3 font-semibold">Sản phẩm</th>
                        <th className="py-3 px-3 font-semibold text-right">Tổng tiền</th>
                        <th className="py-3 px-3 font-semibold text-center">Trạng thái xe lạnh</th>
                        <th className="py-3 px-3 font-semibold text-right">Thao tác Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-4 px-3 font-mono font-bold text-gray-900">SO-KD-88391</td>
                        <td className="py-4 px-3">
                          <span className="font-bold text-gray-900 block">Công ty TNHH MoonCorp</span>
                          <span className="text-gray-500">Đại diện: Nguyễn Hữu Đạt</span>
                        </td>
                        <td className="py-4 px-3 text-gray-700">500 hộp Trăng Vàng Hoàng Kim VIP</td>
                        <td className="py-4 px-3 text-right font-bold text-primary-700">142.500.000 ₫</td>
                        <td className="py-4 px-3 text-center">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">Xe lạnh 18°C - 22°C</span>
                        </td>
                        <td className="py-4 px-3 text-right space-x-2">
                          <button onClick={() => showToast('Đã phát lệnh vận chuyển xe lạnh cho đơn #SO-KD-88391!')} className="px-3 py-2 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800">Tạo Vận Đơn</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KHUYẾN MÃI (PROMOTIONS) */}
          {currentSubTab === 'khuyen-mai' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Quản Lý Khuyến Mãi Mùa Trăng 2026</h1>
                  <p className="text-gray-500 text-sm mt-1">Tạo ưu đãi chiết khấu đơn lớn & Mua X tặng Y hộp trà</p>
                </div>
                <button 
                  onClick={() => showToast('Mở trình tạo khuyến mãi mới')}
                  className="px-5 py-3 bg-primary-700 hover:bg-primary-800 text-white font-bold text-sm rounded-xl shadow transition"
                >
                  + Tạo Khuyến Mãi Mới
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Đang chạy</span>
                    <span className="text-sm text-gray-500 font-mono">KM-EARLYBIRD-26</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Chiết khấu mở sớm Mùa Trăng 2026</h3>
                  <p className="text-sm text-gray-600">Giảm 15% cho đơn hàng từ 10 hộp Trăng Vàng Hoàng Kim.</p>
                  <div className="pt-2 flex justify-between items-center text-sm font-semibold text-primary-700 border-t border-gray-100">
                    <span>Doanh thu: 128.500.000 ₫</span>
                    <button onClick={() => showToast('Đã bật/tắt khuyến mãi')} className="text-gray-600 hover:underline">Chỉnh sửa</button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Đang chạy</span>
                    <span className="text-sm text-gray-500 font-mono">KM-B2B-VIP26</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Ưu đãi Doanh nghiệp B2B (Đơn sỉ)</h3>
                  <p className="text-sm text-gray-600">Mua 5 hộp Gỗ Sơn Mài VIP tặng ngay 1 hộp trà Shan Tuyết cổ thụ.</p>
                  <div className="pt-2 flex justify-between items-center text-sm font-semibold text-primary-700 border-t border-gray-100">
                    <span>Doanh thu: 312.000.000 ₫</span>
                    <button onClick={() => showToast('Đã bật/tắt khuyến mãi')} className="text-gray-600 hover:underline">Chỉnh sửa</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: YÊU CẦU BÁO GIÁ (RFQ) & BÁO GIÁ CỦA TÔI */}
          {(currentSubTab === 'yeu-cau-bao-gia' || currentSubTab === 'bao-gia-cua-toi') && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Cổng Yêu Cầu Báo Giá (RFQ) & Thương Lượng Doanh Nghiệp</h1>
                  <p className="text-gray-500 text-sm mt-1">Tiếp nhận đơn sỉ từ doanh nghiệp và gửi báo giá chính thức v1/v2</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-sm bg-accent-100 text-accent-900 font-bold px-3 py-1 rounded">#RFQ2026-0088</span>
                    <h3 className="font-bold text-gray-900 text-base mt-1">Tập đoàn Công nghệ MoonCorp • 500 hộp Trăng Vàng</h3>
                    <p className="text-sm text-gray-500 mt-1">Ngân sách: 140tr - 160tr • Giao ngày 18/09/2026 (Tòa Landmark 81)</p>
                  </div>
                  <button 
                    onClick={() => showToast('Đã gửi báo giá phiên bản v2.0 trọn gói 142.500.000 ₫!')}
                    className="px-5 py-3 bg-primary-700 hover:bg-primary-800 text-white font-bold text-sm rounded-xl shadow transition"
                  >
                    Soạn / Gửi Báo Giá Ngay
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm">Báo Giá Đã Gửi Của Bạn (Báo giá của tôi)</h4>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-gray-900">Hợp đồng #RFQ2026-0088 (Phiên bản v2.0)</span>
                      <p className="text-gray-500 mt-1">Tổng chào thầu: 142.500.000 ₫ (Đã chiết khấu 18% + Quà tặng dao dĩa)</p>
                    </div>
                    <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full">Khách đã chấp nhận (Escrow 30% đã cọc)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ĐỐI SOÁT (RECONCILIATION) */}
          {currentSubTab === 'doi-soat' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Đối Soát Tài Chính & Ký Quỹ Escrow Sàn</h1>
                <p className="text-gray-500 text-sm mt-1">Minh bạch dòng tiền, lịch sử chi trả và yêu cầu rút tiền nhanh qua cổng NAPAS 24/7</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                  <span className="text-sm text-gray-500 uppercase font-semibold">Chờ đối soát (Pending)</span>
                  <h3 className="text-xl font-bold text-gray-900">187.250.000 ₫</h3>
                  <p className="text-sm text-gray-500">14 đơn đang giao hoặc trong 7 ngày nghiệm thu</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                  <span className="text-sm text-green-700 uppercase font-semibold">Sẵn sàng chi trả (Ready)</span>
                  <h3 className="text-xl font-bold text-green-700">324.800.000 ₫</h3>
                  <button 
                    onClick={() => showToast('Đã tạo lệnh rút tiền 324.800.000 ₫ về Vietcombank!')}
                    className="mt-2 w-full py-2 bg-green-700 text-white font-bold rounded-xl text-sm hover:bg-green-800 transition shadow"
                  >
                    Yêu Cầu Rút Tiền Nhanh
                  </button>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                  <span className="text-sm text-gray-500 uppercase font-semibold">Đã chi trả tháng này</span>
                  <h3 className="text-xl font-bold text-primary-700">1.458.000.000 ₫</h3>
                  <p className="text-sm text-green-700 font-semibold">+35.4% so với cùng kỳ</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: QUẢN TRỊ SÀN & DUYỆT NGƯỜI BÁN (ADMIN PANEL) */}
          {currentSubTab === 'admin-duyet' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản Trị Hệ Thống Sàn & Duyệt Người Bán (Admin Panel)</h1>
                <p className="text-gray-500 text-sm mt-1">Thẩm định hồ sơ pháp lý doanh nghiệp, mã số thuế và điều kiện ATTP mùa trăng 2026</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">Hồ Sơ Đăng Ký Người Bán Chờ Thẩm Định (18)</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase">
                        <th className="py-3 px-4 font-semibold">Doanh nghiệp / Xưởng</th>
                        <th className="py-3 px-4 font-semibold">Mã số thuế</th>
                        <th className="py-3 px-4 font-semibold">Hồ sơ VSATTP</th>
                        <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                        <th className="py-3 px-4 font-semibold text-right">Thao tác Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-4 px-4 font-bold text-gray-900">
                          Bảo Phương Truyền Thống
                          <span className="block text-xs text-gray-500 font-normal">Công ty TNHH Bánh Mứt Kẹo Bảo Phương</span>
                        </td>
                        <td className="py-4 px-4 font-mono font-semibold">0102938475</td>
                        <td className="py-4 px-4 text-blue-600 underline cursor-pointer">ATTP_HN_2026.pdf (18 thg)</td>
                        <td className="py-4 px-4 text-center"><span className="bg-accent-100 text-accent-900 px-3 py-1 rounded-full font-semibold">Chờ duyệt</span></td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button onClick={() => showToast('Đã duyệt thành công hồ sơ Bảo Phương!')} className="px-3 py-2 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800">Duyệt</button>
                          <button onClick={() => showToast('Đã từ chối hồ sơ')} className="px-3 py-2 bg-primary-100 text-primary-700 font-bold rounded-lg hover:bg-primary-200">Từ chối</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
