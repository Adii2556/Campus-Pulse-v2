/* ============================================================
   CAMPUS PULSE — shared AI core (server-side only).
   Used by the Vercel serverless functions in /api and by the
   Vite dev-server plugin. Talks to an OpenAI-compatible chat
   completions endpoint when OPENAI_API_KEY is present
   (optionally OPENAI_BASE_URL / OPENAI_MODEL). Never shipped
   to the browser bundle.
   ============================================================ */

const VALID_CATEGORIES = new Set([
  'Academic', 'Exams', 'Assignment', 'Event', 'Clubs', 'Sports', 'Hostel', 'Placement', 'Fee', 'General',
]);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_TONES = new Set(['critical', 'warn', 'good', 'info']);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function validDate(v) {
  if (typeof v !== 'string') return null;
  const m = ISO_DATE.exec(v.trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
  return v.trim();
}
export function validTime(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return TIME_RE.test(t) ? t : null;
}
export function cleanString(v, max) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}
export function oneOf(v, set, fallback) {
  return typeof v === 'string' && set.has(v) ? v : fallback;
}

export function isAiConfigured(env = process.env) {
  return !!(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim());
}

async function chat(env, messages, { maxTokens = 700, temperature = 0.2, timeoutMs = 20000, signal } = {}) {
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort());
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, response_format: { type: 'json_object' } }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`AI provider HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('AI provider returned an empty completion');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

function todayContext() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' });
  return { iso, weekday };
}

/* ---------------- extraction ---------------- */

export function validateExtractionPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const title = cleanString(parsed.title, 240);
  if (!title) return null;
  let time = validTime(parsed.time);
  let endTime = validTime(parsed.endTime);
  // keep window sane
  if (time && endTime) {
    const [sh, sm] = time.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em < sh * 60 + sm) endTime = null;
  }
  return {
    title,
    date: validDate(parsed.date),
    time,
    endTime,
    venue: cleanString(parsed.venue, 120),
    category: oneOf(parsed.category, VALID_CATEGORIES, 'General'),
    priority: oneOf(parsed.priority, VALID_PRIORITIES, 'medium'),
    cancelled: parsed.cancelled === true,
    signals: Array.isArray(parsed.signals) ? parsed.signals.filter((s) => typeof s === 'string').slice(0, 6) : [],
  };
}

export async function runExtraction(text, env = process.env) {
  if (!isAiConfigured(env)) {
    const err = new Error('The AI service is not configured on this deployment.');
    err.code = 'UNCONFIGURED';
    throw err;
  }
  const clipped = String(text).slice(0, 4000);
  const { iso, weekday } = todayContext();
  const system =
    'You extract structured data from Indian college notices (WhatsApp forwards, emails, poster captions — often Hinglish, chaotic, emoji-heavy). ' +
    'Respond ONLY with a JSON object, no prose. Schema: {"title": string (short, faithful to the notice, ≤90 chars), ' +
    '"date": "YYYY-MM-DD" | null (resolve relative dates against TODAY; null if the notice mentions no date), ' +
    '"time": "HH:MM" | null (24-hour, local; null if none), ' +
    '"endTime": "HH:MM" | null (only when the notice describes a window like "7 to 9 AM"; else null), ' +
    '"venue": string | null, "category": one of [Academic, Exams, Assignment, Event, Clubs, Sports, Hostel, Placement, Fee, General], ' +
    '"priority": one of [low, medium, high], "cancelled": boolean, "signals": string[] (2-4 short phrases naming what you detected)}.';
  const user = `TODAY is ${weekday}, ${iso}.\n\nNOTICE:\n"""\n${clipped}\n"""\n\nExtract the card as JSON.`;
  const content = await chat(env, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { maxTokens: 500, temperature: 0.1, timeoutMs: 15000 });
  const parsed = extractJson(content);
  const clean = validateExtractionPayload(parsed);
  if (!clean) {
    const err = new Error('The AI service returned an unusable result.');
    err.code = 'INVALID';
    throw err;
  }
  return clean;
}

/* ---------------- weekly digest ---------------- */

export function validateDigestPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const linesRaw = Array.isArray(parsed.lines) ? parsed.lines : null;
  if (!linesRaw || linesRaw.length === 0) return null;
  const lines = [];
  for (const entry of linesRaw.slice(0, 6)) {
    if (!entry || typeof entry !== 'object') continue;
    const text = cleanString(entry.text, 400);
    if (!text) continue;
    lines.push({
      tone: oneOf(entry.tone, VALID_TONES, 'info'),
      tag: (cleanString(entry.tag, 24) ?? 'NOTE').toUpperCase(),
      text,
    });
  }
  if (!lines.length) return null;
  return { lines, closer: cleanString(parsed.closer, 280) ?? '' };
}

export async function runDigest(items, env = process.env) {
  if (!isAiConfigured(env)) {
    const err = new Error('The AI service is not configured on this deployment.');
    err.code = 'UNCONFIGURED';
    throw err;
  }
  if (!Array.isArray(items)) {
    const err = new Error('items must be an array.');
    err.code = 'BAD_REQUEST';
    throw err;
  }
  const compact = items.slice(0, 60).map((i = {}) => ({
    title: cleanString(i.title, 240) ?? '',
    date: validDate(i.date),
    time: validTime(i.time),
    endTime: validTime(i.endTime),
    category: oneOf(i.category, VALID_CATEGORIES, 'General'),
    priority: oneOf(i.priority, VALID_PRIORITIES, 'medium'),
    venue: cleanString(i.venue, 120),
    daysUntil: typeof i.daysUntil === 'number' && Number.isFinite(i.daysUntil) ? i.daysUntil : null,
    status: cleanString(i.status, 16),
  })).filter(i => i.title);
  const { iso, weekday } = todayContext();
  const system =
    'You are a terse, warm campus-life editor writing a student\'s 7-day briefing. ' +
    'Use ONLY the facts in the JSON the user sends — never invent dates, venues, or events. ' +
    'Respond ONLY with JSON: {"lines": [{"tone": one of critical|warn|good|info, "tag": short UPPERCASE label (≤14 chars), "text": one crisp factual sentence}], "closer": one short sentence}. ' +
    'At most 5 lines. Lead with what needs action soonest; mention the quietest news briefly if the week is empty.';
  const user = `TODAY is ${weekday}, ${iso}. Here are the student's live cards for the coming week:\n${JSON.stringify(compact, null, 1)}\n\nWrite the digest as JSON.`;
  const content = await chat(env, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { maxTokens: 600, temperature: 0.4, timeoutMs: 18000 });
  const parsed = extractJson(content);
  const clean = validateDigestPayload(parsed);
  if (!clean) {
    const err = new Error('The AI service returned an unusable digest.');
    err.code = 'INVALID';
    throw err;
  }
  return clean;
}
