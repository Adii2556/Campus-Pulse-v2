/* ============================================================
   CAMPUS PULSE — client for the secure AI endpoints.
   Both endpoints live under /api/* (serverless functions in
   /api on Vercel; mirrored by the Vite dev plugin locally).
   The client:  · races the request against a timeout
                 · validates whatever comes back (never trusts it)
                 · reports failures with plain-language reasons
                 · distinguishes 'ai-endpoint' from 'local-fallback'
   ============================================================ */

import {
  sanitizeExtraction,
  type CampusItem,
  type Category,
  type Extraction,
  type Priority,
  CATEGORIES,
  formatDateFull,
  formatTime,
  daysUntil,
  itemStatus,
} from './engine';

export const EXTRACT_TIMEOUT_MS = 12_000;
export const DIGEST_TIMEOUT_MS = 15_000;

export type AiErrorKind = 'timeout' | 'offline' | 'server' | 'invalid-response' | 'unconfigured';

export class AiError extends Error {
  kind: AiErrorKind;
  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'AiError';
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AiError('offline', 'You appear to be offline — check your connection and try again.');
  }
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) throw new AiError('timeout', 'The request was cancelled.');
    signal.addEventListener('abort', onOuterAbort);
  }
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new AiError('timeout', `The AI service took longer than ${Math.round(timeoutMs / 1000)}s — try again.`);
      }
      throw new AiError('offline', 'Could not reach the AI service. Check your connection.');
    }

    let payload: unknown = null;
    try { payload = await res.json(); } catch { payload = null; }

    if (!res.ok) {
      const serverMsg = (payload as { error?: string } | null)?.error;
      if (res.status === 503 && (serverMsg ?? '').toLowerCase().includes('not configured')) {
        throw new AiError('unconfigured', 'The AI service is not configured on this deployment.');
      }
      throw new AiError('server', serverMsg ? `The AI service said: ${serverMsg}` : `The AI service returned HTTP ${res.status}.`);
    }
    if (payload === null || typeof payload !== 'object') {
      throw new AiError('invalid-response', 'The AI service returned something unreadable.');
    }
    return payload as T;
  } finally {
    window.clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
  }
}

/* ------------------------------------------------------------
   Extraction endpoint
   ------------------------------------------------------------ */

export async function extractWithAi(text: string, signal?: AbortSignal): Promise<Extraction> {
  const payload = await postJson<unknown>('/api/extract', { text }, EXTRACT_TIMEOUT_MS, signal);
  const clean = sanitizeExtraction(payload, 'ai-endpoint');
  if (!clean) throw new AiError('invalid-response', 'The AI service returned an unusable card. Nothing was saved.');
  return clean;
}

/* ------------------------------------------------------------
   Digest endpoint
   ------------------------------------------------------------ */

export interface AiDigestLine { tone: 'critical' | 'warn' | 'good' | 'info'; tag: string; text: string }
export interface AiDigestPayload {
  lines: AiDigestLine[];
  closer: string;
}

export async function summariseWeek(items: CampusItem[], signal?: AbortSignal): Promise<AiDigestPayload> {
  // send only fields the model needs — never raw personal data beyond the card contents
  const compact = items
    .filter(i => !i.done && !i.cancelled)
    .slice(0, 60)
    .map(i => ({
      title: i.title,
      date: i.date,
      time: i.time,
      endTime: i.endTime,
      category: i.category,
      priority: i.priority,
      venue: i.venue,
      daysUntil: daysUntil(i.date),
      status: itemStatus(i),
    }));
  const payload = await postJson<unknown>('/api/digest', { items: compact }, DIGEST_TIMEOUT_MS, signal);

  const r = payload as Record<string, unknown>;
  const linesRaw = Array.isArray(r.lines) ? r.lines : null;
  const closer = typeof r.closer === 'string' && r.closer.trim() ? r.closer.trim().slice(0, 280) : '';
  if (!linesRaw || linesRaw.length === 0) {
    throw new AiError('invalid-response', 'The AI service returned an empty digest.');
  }
  const tones = new Set(['critical', 'warn', 'good', 'info']);
  const lines: AiDigestLine[] = [];
  for (const entry of linesRaw.slice(0, 6)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const tone = typeof e.tone === 'string' && tones.has(e.tone) ? (e.tone as AiDigestLine['tone']) : 'info';
    const tag = typeof e.tag === 'string' && e.tag.trim() ? e.tag.trim().slice(0, 24).toUpperCase() : 'NOTE';
    const text = typeof e.text === 'string' ? e.text.trim().slice(0, 400) : '';
    if (text) lines.push({ tone, tag, text });
  }
  if (!lines.length) throw new AiError('invalid-response', 'The AI service returned an empty digest.');
  return { lines, closer };
}

export { CATEGORIES, formatDateFull, formatTime };
