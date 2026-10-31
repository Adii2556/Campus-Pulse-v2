/* ============================================================
   Vite plugin — dev-server mirror of the /api/* serverless
   functions. Lets `npm run dev` exercise the same code paths
   (and env vars) as the Vercel deployment. Production traffic
   goes to the real functions, not through Vite.
   ============================================================ */
import { runExtraction, runDigest, isAiConfigured } from './server/ai.ts';

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(text); } catch { return null; }
}

function makeHandler(run, validateInput) {
  return async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
    const body = await readBody(req);
    const err = validateInput(body);
    if (err) return sendJson(res, 400, { error: err });
    if (!isAiConfigured()) return sendJson(res, 503, { error: 'The AI service is not configured on this deployment.' });
    try {
      const result = await run(body);
      sendJson(res, 200, result);
    } catch (e) {
      const msg = String((e && e.message) || 'Unknown AI error');
      if (e && e.code === 'INVALID') return sendJson(res, 502, { error: 'The AI service returned an unusable result. Try again.' });
      const timedOut = /abort|timeout|timed out/i.test(msg);
      sendJson(res, timedOut ? 504 : 502, { error: timedOut ? 'The AI service took too long to respond.' : msg.slice(0, 240) });
    }
  };
}

export default function aiDevPlugin() {
  return {
    name: 'campus-pulse-ai-dev',
    configureServer(server) {
      server.middlewares.use('/api/extract', makeHandler(
        (body) => runExtraction(body.text, process.env),
        (body) => {
          const text = body && typeof body.text === 'string' ? body.text.trim() : '';
          if (text.length < 8) return 'Send at least 8 characters of notice text.';
          if (text.length > 4000) return 'Notice is too long (max 4000 characters).';
          return null;
        },
      ));
      server.middlewares.use('/api/digest', makeHandler(
        (body) => runDigest(body.items, process.env),
        (body) => {
          if (!body || !Array.isArray(body.items) || body.items.length === 0) return 'Provide a non-empty items array.';
          if (body.items.length > 60) return 'Too many items (max 60).';
          return null;
        },
      ));
    },
  };
}
