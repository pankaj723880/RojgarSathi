// AI controller: uses Gemini (Google Generative Language) if `GEMINI_API_KEY` is set,
// otherwise replies with canned answers for common RojgarSathi issues.
const https = require('https');

const callGenerativeAPI = (apiKey, promptText) => {
  return new Promise((resolve, reject) => {
    try {
      const hostname = 'generativelanguage.googleapis.com';
      const path = `/v1beta2/models/text-bison-001:generateText?key=${encodeURIComponent(apiKey)}`;
      const payload = JSON.stringify({
        prompt: { text: promptText },
        temperature: 0.2,
        maxOutputTokens: 512,
        candidateCount: 1
      });

      const options = {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 15000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data || '{}');
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy(new Error('Generative API request timed out'));
      });
      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

const extractReplyFromResponse = (json) => {
  if (!json) return null;
  if (Array.isArray(json.candidates) && json.candidates.length) {
    const c = json.candidates[0];
    if (typeof c.content === 'string') return c.content;
    if (Array.isArray(c.content)) {
      return c.content.map((p) => (typeof p === 'string' ? p : p.text || '')).join('');
    }
  }
  if (Array.isArray(json.output) && json.output.length) {
    const o = json.output[0];
    if (typeof o === 'string') return o;
    if (o.content) {
      if (typeof o.content === 'string') return o.content;
      if (Array.isArray(o.content)) return o.content.map((p) => p.text || '').join('');
    }
  }
  if (json.reply) return json.reply;
  if (json.choices && Array.isArray(json.choices) && json.choices[0]) {
    return json.choices[0].content || json.choices[0].text || null;
  }
  return null;
};

const chat = async (req, res) => {
  try {
    const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';

    if (!message) {
      return res.status(200).json({ reply: "Hi — I'm RojgarSathi assistant. Ask me about jobs, applications, or chat help." });
    }

    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GENERATIVE_API_KEY;

    // Compose a strong prompt for RojgarSathi context
    const promptText = `You are RojgarSathi assistant. The platform includes: users (worker/employer), job listings, applications, real-time chat (Socket.IO), user profiles, uploads (resumes, photos), notifications, and admin tools. The user asked: "${message}". Provide a concise, step-by-step answer targeted to the user, and when helpful include a short developer troubleshooting checklist prefixed with 'Dev:'. Keep replies under 300 words.`;

    if (API_KEY) {
      try {
        const apiJson = await callGenerativeAPI(API_KEY, promptText);
        const reply = extractReplyFromResponse(apiJson);
        if (reply) {
          return res.status(200).json({ reply: String(reply) });
        }
        // If no reply extracted, log and fall through to canned responses below
        console.warn('Generative API returned no extractable reply');
      } catch (err) {
        console.error('Generative API error:', err.message || err);
        // fall through to canned responses as fallback
      }
    }

    // Canned fallback responses (short list)
    const lower = message.toLowerCase();
    const canned = [
      { test: /login|logged out|logout|session|kicks me out/, reply: `Login issues — User: clear browser cache, try Incognito, verify system clock, and re-login. Dev: check token storage, refresh-token flow, token expiry, and server time sync.` },
      { test: /chat|messages|socket|real-time/, reply: `Chat troubleshooting — User: ensure you're logged in and re-open the Messages page. Dev: verify Socket.IO server, CORS, and client auth headers.` },
      { test: /apply|resume|upload/, reply: `Applying/uploading — User: confirm file type and size, try smaller file. Dev: check multer/storage and server error logs.` },
      { test: /forgot password|reset password/, reply: `Password reset — check spam folder. Dev: verify SMTP and reset-token creation.` }
    ];

    for (const itm of canned) {
      if (itm.test.test(lower)) return res.status(200).json({ reply: itm.reply });
    }

    return res.status(200).json({ reply: "I'm here to help — please provide more detail or try: 'How do I apply', 'Chat not working', or 'Login fails'." });
  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({ reply: 'Internal error handling chat. Please try again later.' });
  }
};

module.exports = { chat };
