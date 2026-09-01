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

// FIX: Add missing APIs
app.get('/api/student', (req, res) => {
  const id = req.query.id || req.query.student_id || 'UNKNOWN';
  res.json({ 
    student_id: id,
    name: 'Test Student',
    course: 'MA-AIPS Demo',
    status: 'Active'
  });
});

app.post('/api/chat', (req, res) => {
  res.json({ reply: 'Hello! MA-AIPS AI is working. You said: ' + (req.body.message || 'hi') });
});
app.get('/api/:anything', (req, res) => {
  res.json({ message: 'API works', path: req.path });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running');
});

module.exports = app;
