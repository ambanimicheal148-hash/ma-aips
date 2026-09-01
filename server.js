module.exports = async (req, res) => {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle AI API
  if (req.url.startsWith('/api/ai') && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { prompt } = JSON.parse(body || '{}');
      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt || 'Hello' }] }] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini error');
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer';
      return res.json({ reply: text });
    } catch (e) {
      return res.json({ reply: 'AI Error: ' + e.message });
    }
  }

  // Serve HTML for everything else
  const html = `<!DOCTYPE html>
  <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MA-AIPS</title>
  <style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto}#chat{border:1px solid #ccc;height:300px;overflow:auto;padding:10px;margin:10px 0}input{width:70%;padding:10px}button{padding:10px}</style>
  </head><body>
  <h2>MA-AIPS 🤖</h2>
  <div id="chat"></div>
  <input id="msg" placeholder="Type message..."><button onclick="send()">Send</button>
  <script>
  const params = new URLSearchParams(location.search);
  const sid = params.get('student_id') || 'Guest';
  document.getElementById('chat').innerHTML += '<div><b>Welcome '+sid+'!</b></div>';
  async function send(){
    const input = document.getElementById('msg');
    const text = input.value;
    if(!text) return;
    const chat = document.getElementById('chat');
    chat.innerHTML += '<div><b>You:</b> '+text+'</div>';
    input.value='';
    const res = await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:text})});
    const data = await res.json();
    chat.innerHTML += '<div><b>AI:</b> '+data.reply+'</div>';
    chat.scrollTop = chat.scrollHeight;
  }
  </script></body></html>`;

  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
};
