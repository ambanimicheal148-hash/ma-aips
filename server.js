const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GEMINI_KEY = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'student.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'MA-AIPS running with Gemini FREE' });
});

app.get('/api/student', (req, res) => {
  const id = req.query.id || req.query.student_id || 'TEST123';
  res.json({ student_id: id, name: 'Test Student', course: 'MA-AIPS Demo' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, student_id } = req.body;
    if (!GEMINI_KEY) {
      return res.json({ reply: "AI Error: GEMINI_API_KEY not set. Add it in Vercel Settings > Environment Variables" });
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are MA-AIPS AI Coach for Kenyan students. Student ID: ${student_id}. Answer clearly and helpfully. Student asks: ${message}` }] }]
      })
    });
    const data = await r.json();
    if (data.error) return res.json({ reply: "AI Error: " + data.error.message });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I could not answer.";
    res.json({ reply: text });
  } catch (e) {
    res.json({ reply: "AI Error: " + e.message });
  }
});

module.exports = app;
