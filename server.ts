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
      return res.status(503).json({ error: 'Trợ lý AI chưa được cấu hình. Vui lòng thử lại sau.' });
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
    res.status(500).json({ error: 'Không thể kết nối với trợ lý AI'
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
    console.log(`Mooncake E-commerce server running on http://localhost:${PORT}`);
  });
}

startServer();
