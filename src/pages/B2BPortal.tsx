import React, { useState } from 'react';
import { Building2, ShieldCheck, FileText, Send, Sparkles, CheckCircle2, MessageSquare, PhoneCall, Paperclip, Lock, Check } from 'lucide-react';

export default function B2BPortal() {
  const [companyName, setCompanyName] = useState('Công ty CP Công Nghệ VinaTech');
  const [taxCode, setTaxCode] = useState('0312345678');
  const [productName, setProductName] = useState('Hộp Quà Trăng Vàng Hoàng Kim - Kinh Đô');
  const [quantity, setQuantity] = useState(500);
  const [targetBudget, setTargetBudget] = useState(150000000);
  const [logoRequest, setLogoRequest] = useState(true);
  const [note, setNote] = useState('Yêu cầu xuất hóa đơn VAT đỏ và in logo doanh nghiệp dập nổi trên vỏ hộp.');

  const [rfqSubmitted, setRfqSubmitted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatClosed, setIsChatClosed] = useState(false);

  const [messages, setMessages] = useState<Array<{ id: string; sender: 'user' | 'supplier'; text: string; time: string; isQuote?: boolean }>>([
    { id: '1', sender: 'user', text: 'Chào xưởng Kinh Đô, chúng tôi đang xem xét báo giá phiên bản 1 (150 triệu). Với số lượng 500 hộp quà VIP, bên mình có thể hỗ trợ chiết khấu thêm 5% và miễn phí in dập ép kim logo MoonCorp lên nắp hộp được không? Lịch giao mong muốn là trước ngày 20/09/2026.', time: '11:30' },
    { id: '2', sender: 'supplier', text: 'Chào anh Đạt và công ty MoonCorp! Xưởng Kinh Đô đã họp và nhất trí chính sách ưu đãi đặc biệt cho đối tác B2B chiến lược: Giảm thêm 5% tổng đơn (còn 142.500.000 ₫) và tài trợ 100% chi phí dập ép kim nhũ vàng cao cấp + thiệp chúc mừng riêng.', time: '13:50' },
    { id: 'quote', sender: 'supplier', text: 'Báo giá chính thức • Phiên bản 2: 142.500.000 ₫ (Tiết kiệm 5%)', time: '14:15', isQuote: true },
    { id: '3', sender: 'user', text: 'Cảm ơn Kinh Đô. Báo giá rất tốt, chúng tôi đang trình ký hợp đồng và sẽ xác nhận thanh toán đặt cọc 30% trong chiều nay.', time: '14:20' }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatClosed) return;

    const newMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user' as const,
      text: chatInput,
      time: 'Vừa xong'
    };

    setMessages([...messages, newMsg]);
    setChatInput('');

    setTimeout(() => {
      const reply = {
        id: 'reply-' + Date.now(),
        sender: 'supplier' as const,
        text: 'Cảm ơn anh/chị. Chúng tôi đã nhận được thông tin và chuẩn bị hàng theo đúng thỏa thuận hợp đồng.',
        time: 'Vừa xong'
      };
      setMessages(prev => [...prev, reply]);
    }, 1200);
  };

  return (
    <div className="mss-container py-8 space-y-10">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-primary-900 to-accent-900 text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-accent-400 text-primary-950 font-bold px-3 py-1 rounded-full text-sm">
            <Building2 className="w-4 h-4" />
            <span>Cổng Giao Dịch Doanh Nghiệp & B2B</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold">Giải Pháp Quà Biếu Doanh Nghiệp 2026</h1>
          <p className="text-accent-100 text-sm max-w-2xl leading-relaxed">
            Chiết khấu thương mại hấp dẫn lên đến 30% • Hỗ trợ in logo doanh nghiệp dập nổi sang trọng • Xuất hóa đơn VAT đỏ nhanh chóng • Giao hàng phân bổ nhiều điểm toàn quốc.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center shrink-0 space-y-2">
          <p className="text-sm text-accent-200">Hotline Tư Vấn Doanh Nghiệp 24/7</p>
          <p className="text-xl font-bold font-mono text-white">1900 1509</p>
          <a href="tel:19001509" className="inline-block px-4 py-2 bg-accent-400 text-primary-950 text-sm font-bold rounded-lg shadow hover:bg-accent-300 transition">
            Gọi Ngay Cho Chuyên Viên
          </a>
        </div>
      </div>

      {/* 3-Pane Negotiation Chat Hub (from newly provided template) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col lg:flex-row h-auto lg:h-[720px] border border-accent-200/60">
        {/* PANE 1: Conversation List */}
        <div className="w-full lg:w-[330px] flex-shrink-0 flex flex-col bg-gray-50/70 border-r border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-white">
            <input
              type="text"
              placeholder="Tìm xưởng hoặc mã RFQ..."
              className="w-full h-10 pl-3 pr-3 bg-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-700"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 cursor-pointer shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  KD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span className="truncate">Kinh Đô Official Store</span>
                    <span className="text-gray-500">14:15</span>
                  </div>
                  <p className="text-xs text-primary-700 font-semibold mt-1">RFQ2026-0088 • 500 hộp VIP</p>
                  <p className="text-sm text-gray-600 truncate mt-1">Đã gửi báo giá phiên bản 2 kèm miễn phí ép kim...</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white hover:bg-gray-50 transition cursor-pointer border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  GV
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span className="truncate">Givral Bakery 1950</span>
                    <span className="text-gray-500">10:20</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">RFQ2026-0088 • 500 hộp VIP</p>
                  <p className="text-sm text-gray-600 truncate mt-1">Chúng tôi đã cập nhật thời gian giao sớm...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANE 2: Active Chat Thread */}
        <div className="flex-1 flex flex-col bg-accent-50/20 min-w-0">
          {/* Header */}
          <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-800 text-white flex items-center justify-center font-bold">KD</div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">Kinh Đô Official Store (Gian Hàng Chính Hãng)</h3>
                <p className="text-sm text-gray-500">Đang thương lượng cho #RFQ2026-0088 (500 hộp quà VIP)</p>
              </div>
            </div>
            <button
              onClick={() => setIsChatClosed(!isChatClosed)}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              {isChatClosed ? 'Mở lại hội thoại' : 'Demo Đóng/Mở Chat'}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, index) => {
              if (msg.isQuote) {
                return (
                  <div key={index} className="flex justify-start pl-10">
                    <div className="bg-accent-100/80 border border-accent-300 p-5 rounded-2xl shadow-sm space-y-3 max-w-lg w-full">
                      <div className="flex justify-between items-center text-sm font-bold text-primary-800">
                        <span>📋 BÁO GIÁ CHÍNH THỨC • PHIÊN BẢN 2</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-extrabold text-primary-700">142.500.000 ₫</span>
                        <span className="bg-primary-700 text-white text-xs font-bold px-3 py-1 rounded">Tiết kiệm 5%</span>
                      </div>
                      <p className="text-sm text-gray-700">Bao gồm: 500 hộp Trăng Vàng Hoàng Kim VIP, miễn phí dập ép kim nhũ vàng logo MoonCorp và vận chuyển xe lạnh.</p>
                      <button onClick={() => alert('Đã chấp nhận báo giá v2! Chuyển sang cọc Escrow.')} className="w-full py-2 bg-primary-700 text-white font-bold text-sm rounded-xl shadow hover:bg-primary-800 transition">
                        Chấp Nhận Báo Giá v2 Ngay
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[80%] ${
                    msg.sender === 'user' ? 'bg-primary-700 text-white rounded-tr-none shadow-sm' : 'bg-white text-gray-800 border border-accent-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 px-1">{msg.time}</span>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-gray-200">
            {isChatClosed ? (
              <div className="p-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl text-center">
                Cuộc hội thoại này đã đóng. Không thể gửi tin nhắn mới.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập tin nhắn trao đổi với xưởng Kinh Đô..."
                  className="flex-1 p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-700"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white text-sm font-bold rounded-xl shadow transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* PANE 3: Right Pane Summary (Current Quotation & RFQ Meta) */}
        <div className="w-full lg:w-[350px] flex-shrink-0 bg-white p-5 border-l border-gray-200 space-y-4 overflow-y-auto">
          <div className="bg-primary-50 border border-primary-200 p-4 rounded-2xl space-y-3">
            <span className="text-sm font-bold text-primary-800 bg-primary-200 px-2 py-1 rounded uppercase">Báo Giá Hiện Tại (v2)</span>
            <h3 className="text-2xl font-bold text-primary-700">142.500.000 ₫</h3>
            <p className="text-sm text-gray-600">Đơn giá: 285.000 ₫ / hộp (500 hộp VIP)</p>
            <div className="space-y-1 text-sm text-gray-700 pt-2 border-t border-primary-200">
              <div className="flex justify-between"><span>Đặt cọc 30%:</span><span className="font-bold">42.750.000 ₫</span></div>
              <div className="flex justify-between"><span>Vận chuyển xe lạnh:</span><span className="font-bold text-green-700">Miễn phí</span></div>
              <div className="flex justify-between"><span>Ngày giao:</span><span className="font-bold">18/09/2026</span></div>
            </div>
            <button onClick={() => alert('Đã chốt phương án báo giá v2!')} className="w-full py-3 bg-primary-700 text-white text-sm font-bold rounded-xl shadow hover:bg-primary-800 transition">
              Chấp Nhận Báo Giá Này
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-2 text-sm">
            <span className="font-bold text-gray-800 uppercase tracking-wide">Yêu Cầu Gốc #RFQ2026-0088</span>
            <h4 className="font-bold text-gray-900">500 hộp bánh trung thu cao cấp quà tặng đối tác VIP 2026</h4>
            <p className="text-gray-600">Địa điểm: Tòa nhà Landmark 81, Bình Thạnh, TP.HCM</p>
            <p className="text-gray-600">Yêu cầu: Dập ép kim logo công ty màu vàng ánh kim.</p>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-sm text-green-900 flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-green-700 shrink-0 mt-1" />
            <span>Khoản cọc 30% được phong tỏa an toàn bởi Sàn Bánh Trung Thu (Escrow) đến khi nghiệm thu thành công.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
