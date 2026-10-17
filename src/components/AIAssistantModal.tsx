import React, { useState } from 'react';
import { Sparkles, X, Gift, Coffee, Heart, CheckCircle2, Loader2 } from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (productName: string) => void;
}

export default function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
  const [recipient, setRecipient] = useState('Bố mẹ / Người lớn tuổi');
  const [taste, setTaste] = useState('Ít ngọt, truyền thống (Đậu xanh, sen nhuyễn)');
  const [budget, setBudget] = useState('400K - 800K');
  const [dietary, setDietary] = useState('Thích hợp người lớn tuổi / Giảm đường');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    recommendation: string;
    teaPairing: string;
    greetingMessage: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, taste, budget, dietary })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
        recommendation: 'Gợi ý Hộp Quà Trăng Vàng Hoàng Kim Kinh Đô hoặc Bánh Nướng Thập Cẩm Như Lan sẽ là món quà trọn vẹn nghĩa tình.',
        teaPairing: 'Trà Ô Long thượng hạng',
        greetingMessage: 'Chúc gia đình mùa Trung Thu an khang thịnh vượng, vạn sự như ý!'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-accent-50 to-white w-full max-w-2xl rounded-2xl shadow-2xl border border-accent-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-800 to-accent-700 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent-400 text-primary-900 rounded-xl shadow">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Trợ Lý AI Tư Vấn Bánh & Trà Trung Thu</h2>
              <p className="text-accent-100 text-sm">Gợi ý quà biếu tinh tế, chuẩn vị và ý nghĩa nhất cùng chuyên gia AI</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {!result ? (
            <form onSubmit={handleConsult} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1. Người nhận quà / thưởng thức là ai?</label>
                <select 
                  value={recipient} 
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full p-3 border border-accent-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-primary-700 outline-none"
                >
                  <option value="Bố mẹ / Người lớn tuổi">Bố mẹ / Người lớn tuổi (Cần ít ngọt, bổ dưỡng)</option>
                  <option value="Sếp / Đối tác kinh doanh">Sếp / Đối tác kinh doanh (Sang trọng, đẳng cấp)</option>
                  <option value="Cả gia đình quây quần">Cả gia đình quây quần đêm rằm</option>
                  <option value="Bạn bè / Đồng nghiệp trẻ">Bạn bè / Đồng nghiệp trẻ (Thích vị hiện đại, lava)</option>
                  <option value="Các bé thiếu nhi">Các bé thiếu nhi (Ngộ nghĩnh, kèm lồng đèn)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. Sở thích hương vị mong muốn?</label>
                <select 
                  value={taste} 
                  onChange={(e) => setTaste(e.target.value)}
                  className="w-full p-3 border border-accent-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-primary-700 outline-none"
                >
                  <option value="Ít ngọt, truyền thống (Đậu xanh, sen nhuyễn)">Ít ngọt, truyền thống (Đậu xanh, sen nhuyễn)</option>
                  <option value="Thập cẩm mặn đậm đà (Gà quay, vi cá, lạp xưởng)">Thập cẩm mặn đậm đà (Gà quay, vi cá, lạp xưởng)</option>
                  <option value="Hiện đại, béo ngậy (Lava sầu riêng, trứng muối)">Hiện đại, béo ngậy (Lava sầu riêng, trứng muối)</option>
                  <option value="Thanh mát, thực dưỡng (Cốm, trà xanh, hạt chia)">Thanh mát, thực dưỡng (Cốm, trà xanh, hạt chia)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">3. Khoảng ngân sách dự kiến (cho hộp 4 bánh)?</label>
                <select 
                  value={budget} 
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-3 border border-accent-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-primary-700 outline-none"
                >
                  <option value="Dưới 400.000đ">Dưới 400.000đ</option>
                  <option value="400K - 800K">400.000đ - 800.000đ</option>
                  <option value="800K - 1.500K">800.000đ - 1.500.000đ</option>
                  <option value="Trên 1.500.000đ (Cao cấp/Thượng hạng)">Trên 1.500.000đ (Cao cấp / Thượng hạng)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">4. Lưu ý về sức khỏe hoặc chế độ ăn</label>
                <input 
                  type="text" 
                  value={dietary} 
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="Ví dụ: Ăn chay, kiêng đường, dị ứng các loại hạt..."
                  className="w-full p-3 border border-accent-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-primary-700 outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 bg-gradient-to-r from-primary-700 to-accent-600 hover:from-primary-800 hover:to-accent-700 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI đang phân tích & thiết kế gợi ý...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-accent-300" />
                    <span>Nhận Tư Vấn Quà Tặng AI Ngay</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-accent-100/70 border border-accent-300 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-primary-800 font-bold mb-2">
                  <Gift className="w-5 h-5" />
                  <h3>Gợi Ý Lựa Chọn Từ Chuyên Gia AI:</h3>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{result.recommendation}</p>
              </div>

              <div className="bg-white border border-accent-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div className="p-2 bg-accent-50 text-accent-700 rounded-lg">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Trà Thưởng Thức Hoàn Hảo:</h4>
                  <p className="text-gray-600 text-sm mt-1">{result.teaPairing}</p>
                </div>
              </div>

              <div className="bg-white border border-accent-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <div className="p-2 bg-primary-50 text-primary-700 rounded-lg">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Gợi Ý Lời Chúc Gửi Thiệp:</h4>
                  <p className="text-gray-600 text-sm mt-1 italic">"{result.greetingMessage}"</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
                >
                  Tư Vấn Lại
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-primary-700 hover:bg-primary-800 text-white font-medium rounded-xl shadow transition"
                >
                  Khám Phá Sản Phẩm Ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
