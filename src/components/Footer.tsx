import React from 'react';
import { Sparkles, PhoneCall, Mail, MapPin, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-primary-950 text-gray-300 pt-16 pb-12 border-t-4 border-accent-500">
      <div className="mss-container">
        {/* Features row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-12 border-b border-gray-800">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="p-3 bg-accent-500/20 text-accent-400 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Chính Hãng 100%</h4>
              <p className="text-sm text-gray-500 mt-1">Cam kết trực tiếp từ Kinh Đô, Như Lan, Madame Hương...</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="p-3 bg-accent-500/20 text-accent-400 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Giao Hàng Siêu Tốc</h4>
              <p className="text-sm text-gray-500 mt-1">Vận chuyển nhanh chóng toàn quốc trong 2-4 giờ</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="p-3 bg-accent-500/20 text-accent-400 rounded-lg">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Hộp Quà Nghệ Thuật</h4>
              <p className="text-sm text-gray-500 mt-1">Miễn phí gói quà & thiệp chúc mừng sang trọng</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="p-3 bg-accent-500/20 text-accent-400 rounded-lg">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Hóa Đơn VAT Doanh Nghiệp</h4>
              <p className="text-sm text-gray-500 mt-1">Xuất hóa đơn đỏ điện tử nhanh chóng, chiết khấu lớn</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-12 border-b border-gray-800">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-500 text-primary-950 rounded-xl flex items-center justify-center font-bold text-xl">
                🥮
              </div>
              <h3 className="text-lg font-bold text-white">Sàn Bánh Trung Thu 2026</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Nền tảng thương mại điện tử chuyên biệt kết nối trực tiếp các thương hiệu bánh trung thu danh tiếng hàng đầu Việt Nam. Mang mùa trăng rằm trọn vẹn yêu thương đến mọi nhà.
            </p>
            <div className="text-sm text-accent-400 font-medium">
              ✨ Đón trăng vàng - Gửi trọn ân tình
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Thương Hiệu Nổi Bật</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#kinhdo" className="hover:text-accent-400 transition">Kinh Đô - Mondelez</a></li>
              <li><a href="#nhulan" className="hover:text-accent-400 transition">Đặc Sản Như Lan</a></li>
              <li><a href="#madame" className="hover:text-accent-400 transition">Madame Hương Hà Nội</a></li>
              <li><a href="#brodard" className="hover:text-accent-400 transition">Brodard Bakery</a></li>
              <li><a href="#givral" className="hover:text-accent-400 transition">Givral Bakery</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Hỗ Trợ Khách Hàng</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#faq" className="hover:text-accent-400 transition">Hướng dẫn đặt hàng & thanh toán</a></li>
              <li><a href="#policy" className="hover:text-accent-400 transition">Chính sách đổi trả & kiểm hàng</a></li>
              <li><a href="#b2b" className="hover:text-accent-400 transition">Chính sách chiết khấu doanh nghiệp</a></li>
              <li><a href="#security" className="hover:text-accent-400 transition">Bảo mật thông tin cá nhân</a></li>
              <li><a href="#contact" className="hover:text-accent-400 transition">Liên hệ hợp tác phân phối</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Liên Hệ Trực Tiếp</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-accent-500 shrink-0 mt-1" />
                <span>Tầng 12, Tòa nhà Bitexco Financial Tower, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-accent-500 shrink-0" />
                <span>Hotline: 1900 1509 - 0988 150 999</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent-500 shrink-0" />
                <span>hotro@banhtrungthu2026.vn</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <p>© 2026 Sàn Thương Mại Điện Tử Bánh Trung Thu Chính Hãng. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-4">
            <span>Thanh toán bảo mật:</span>
            <span className="bg-white/10 px-2 py-1 rounded text-white text-xs">VNPAY</span>
            <span className="bg-white/10 px-2 py-1 rounded text-white text-xs">MoMo</span>
            <span className="bg-white/10 px-2 py-1 rounded text-white text-xs">VISA / MASTERCARD</span>
            <span className="bg-white/10 px-2 py-1 rounded text-white text-xs">COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Gift(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
  );
}
