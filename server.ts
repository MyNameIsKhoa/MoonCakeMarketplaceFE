import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Gemini API client if key is available
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// API endpoint for AI Mooncake Pairing & Recommendations
app.post('/api/gemini/recommend', async (req, res) => {
  try {
    const { recipient, taste, budget, dietary } = req.body;

    if (!ai) {
      // Fallback response if API key is not configured
      return res.json({
        recommendation: `Dựa trên sở thích của bạn (Người nhận: ${recipient}, Vị: ${taste}, Ngân sách: ${budget}, Chế độ: ${dietary}), chúng tôi gợi ý Hộp Quà Trăng Vàng Hoàng Kim Kinh Đô hoặc Bánh Nướng Thập Cẩm Như Lan. Kết hợp cùng trà Ô Long thanh tao sẽ mang lại trải nghiệm mùa trăng tuyệt vời nhất! (Lưu ý: Cần cấu hình GEMINI_API_KEY để sử dụng tư vấn AI thông minh thực tế).`,
        teaPairing: 'Trà Ô Long thượng hạng hoặc Trà Sen Tây Hồ',
        greetingMessage: 'Chúc gia đình mùa Trung Thu an khang thịnh vượng, vạn sự như ý!'
      });
    }

    const prompt = `Bạn là chuyên gia ẩm thực truyền thống và quà tặng Tết Trung Thu tại Việt Nam.
Hãy tư vấn chọn bánh trung thu và trà phù hợp nhất dựa trên các tiêu chí sau của khách hàng:
- Người nhận quà/thưởng thức: ${recipient || 'Cả gia đình'}
- Sở thích hương vị: ${taste || 'Truyền thống / Ít ngọt'}
- Khoảng ngân sách: ${budget || 'Linh hoạt'}
- Chế độ ăn uống / sức khỏe: ${dietary || 'Bình thường'}

Hãy trả về kết quả định dạng JSON thuần (không có markdown code block) với các trường sau:
{
  "recommendation": "Đoạn văn tư vấn chi tiết, ấm áp và chuyên nghiệp bằng tiếng Việt",
  "teaPairing": "Gợi ý loại trà đi kèm phù hợp nhất",
  "greetingMessage": "Gợi ý lời chúc ý nghĩa in trên thiệp tặng quà"
}`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text || '';
    // Clean up markdown code blocks if present
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    res.json(result);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: 'Không thể kết nối với trợ lý AI',
      recommendation: 'Hộp Quà Trăng Vàng Kinh Đô là lựa chọn hoàn hảo cho mọi dịp biếu tặng.',
      teaPairing: 'Trà Ô Long',
      greetingMessage: 'Chúc mừng Trung Thu đoàn viên hạnh phúc!'
    });
  }
});

// Vite middleware in development
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Mooncake E-commerce server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
