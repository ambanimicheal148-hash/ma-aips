const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'student.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'MA-AIPS running' });
});

app.get('/api/student', (req, res) => {
  const id = req.query.id || req.query.student_id || 'TEST123';
  res.json({
    student_id: id,
    name: 'Test Student',
    course: 'MA-AIPS Demo'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, student_id } = req.body;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are MA-AIPS AI Coach for student ${student_id}. Be intelligent, helpful, encouraging.` },
          { role: 'user', content: message }
        ],
        max_tokens: 600
      })
    });
    const data = await response.json();
    if (data.error) return res.json({ reply: 'AI Error: ' + data.error.message });
    res.json({ reply: data.choices[0].message.content });
  } catch (e) {
    res.json({ reply: 'Server error: ' + e.message });
  }
});

module.exports = app;
