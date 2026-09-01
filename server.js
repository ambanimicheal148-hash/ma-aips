const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/ai', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini error');
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer';
    res.json({ reply: text });
  } catch (e) {
    console.error(e);
    res.json({ reply: 'AI Error: ' + e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
