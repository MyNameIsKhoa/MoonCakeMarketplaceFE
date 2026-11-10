import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { assistantHandler } from './server/marketplaceAssistant.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20kb' }));

const PORT = process.env.PORT || 3000;

// Initialize Gemini API client if key is available
const apiKey = process.env.GEMINI_API_KEY;
const ai = process.env.GEMINI_ENABLED === 'true' && apiKey && apiKey !== 'MY_GEMINI_API_KEY'
  ? new GoogleGenAI({ apiKey }) : null;

app.get('/api/gemini/status', (_req, res) => res.json({ enabled: ai !== null }));

const chat = assistantHandler(ai, process.env.API_GATEWAY_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8080',
  process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite');
app.post('/api/gemini/chat', chat);
// Keep the older suggestion form on the same grounded answer path.
app.post('/api/gemini/recommend', (req, res) => {
  const fields = ['recipient', 'taste', 'budget', 'dietary'].map(key =>
    typeof req.body?.[key] === 'string' ? req.body[key].slice(0, 150) : '').filter(Boolean);
  req.body = { message: 'Tư vấn sản phẩm bánh trung thu: ' + fields.join(', ') };
  const send = res.json.bind(res);
  res.json = ((body: any) => send(body.answer ? { ...body, recommendation: body.answer } : body)) as typeof res.json;
  return chat(req, res);
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
