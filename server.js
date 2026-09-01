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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running');
});
module.exports = app;
