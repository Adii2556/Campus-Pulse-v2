// Vercel serverless function — POST /api/extract
// Extracts title/date/time/endTime/venue/category/priority/cancelled from a pasted notice.
import { runExtraction, isAiConfigured } from '../server/ai.ts';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const text = body && typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 8) {
    res.status(400).json({ error: 'Send at least 8 characters of notice text.' });
    return;
  }
  if (text.length > 4000) {
    res.status(400).json({ error: 'Notice is too long (max 4000 characters).' });
    return;
  }
  if (!isAiConfigured()) {
    res.status(503).json({ error: 'The AI service is not configured on this deployment.' });
    return;
  }
  try {
    const result = await runExtraction(text, process.env);
    res.status(200).json(result);
  } catch (err) {
    const code = err && err.code;
    if (code === 'INVALID') {
      res.status(502).json({ error: 'The AI service returned an unusable result. Try again.' });
      return;
    }
    const msg = String((err && err.message) || 'Unknown AI error');
    const timedOut = /abort|timeout|timed out/i.test(msg);
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'The AI service took too long to respond.' : msg.slice(0, 240) });
  }
}
