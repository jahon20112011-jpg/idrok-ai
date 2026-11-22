const express = require('express');
const cors = require('cors');
const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '15mb' }));
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const hits = new Map();
app.use('/api', (req, res, next) => {
  const t = Date.now();
  const a = (hits.get(req.ip) || []).filter(x => t - x < 60000);
  if (a.length >= 30) return res.status(429).json({ error: 'Juda ko‘p so‘rov, bir daqiqa kuting' });
  a.push(t); hits.set(req.ip, a); next();
});
app.get('/', (req, res) => res.send('IDROK AI serveri ishlayapti'));
app.post('/api/chat', async (req, res) => {
  try {
    if (!KEY) return res.status(500).json({ error: 'Serverda GEMINI_API_KEY yo‘q' });
    const { messages = [], image } = req.body || {};
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }]
    }));
    if (image && contents.length) {
      contents[contents.length - 1].parts.push({ inlineData: { mimeType: image.mime, data: image.data } });
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({ contents })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'Gemini xatosi' });
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    res.json({ text: parts.map(p => p.text || '').join('') || '(bo‘sh javob)' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.listen(process.env.PORT || 3000);
