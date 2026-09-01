const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

// Serve static files if public folder exists
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

app.post('/api/ai', async (req, res) => {
  try {
    if (!GEMINI_KEY) return res.json({ reply: 'Server Error: GEMINI_API_KEY missing in Vercel' });
    const prompt = req.body.prompt || req.body.message || 'Hello';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer from Gemini';
    res.json({ reply: text });
  } catch (e) {
    console.error(e);
    res.json({ reply: 'AI Error: ' + e.message });
  }
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // fallback if no public folder
    res.send(`<!DOCTYPE html><html><head><title>MA-AIPS</title></head><body><h1>MA-AIPS is Running!</h1><p>Test: <a href="/?student_id=TEST123">/?student_id=TEST123</a></p><div id="r"></div><script>
    async function test(){const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Say hello in 5 words'})});const d=await res.json();document.getElementById('r').innerText=JSON.stringify(d)}
    test();
    </script></body></html>`);
  }
});

module.exports = app;
