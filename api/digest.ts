// Vercel serverless function — POST /api/digest
// Writes the student's 7-day briefing from their live cards.
import { runDigest, isAiConfigured } from '../server/ai.ts';

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
  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || items.length === 0) {
    res.status(400).json({ error: 'Provide a non-empty items array.' });
    return;
  }
  if (items.length > 60) {
    res.status(400).json({ error: 'Too many items (max 60).' });
    return;
  }
  if (!isAiConfigured()) {
    res.status(503).json({ error: 'The AI service is not configured on this deployment.' });
    return;
  }
  try {
    const result = await runDigest(items, process.env);
    res.status(200).json(result);
  } catch (err: unknown) {
    const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null;
    const code = typeof errObj?.code === 'string' ? errObj.code : undefined;
    if (code === 'INVALID') {
      res.status(502).json({ error: 'The AI service returned an unusable digest. Try again.' });
      return;
    }
    const msg = typeof errObj?.message === 'string' ? errObj.message : 'Unknown AI error';
    const timedOut = /abort|timeout|timed out/i.test(msg);
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'The AI service took too long to respond.' : msg.slice(0, 240) });
  }
}
