/* ============================================================
   CAMPUS PULSE — data & intelligence engine
   Types, seed generation, persistence, local AI parser,
   priority logic and weekly digest builder.
   ============================================================ */

export type Category =
  | 'Academic'
  | 'Exams'
  | 'Assignment'
  | 'Event'
  | 'Clubs'
  | 'Sports'
  | 'Hostel'
  | 'Placement'
  | 'Fee'
  | 'General';

export type Priority = 'high' | 'medium' | 'low';
export type ItemStatus = 'urgent' | 'upcoming' | 'expired';

export interface CampusItem {
  id: string;
  title: string;
  date: string | null; // YYYY-MM-DD — null when the notice mentions no date (kept "undated", not fake "today")
  time: string | null; // "17:30" — local time
  endTime: string | null; // "19:00" — local time, when the notice describes a window ("7 to 9 AM")
  venue: string | null;
  category: Category;
  source: string;
  raw: string;
  addedAt: number;
  updatedAt: number;
  priority: Priority;
  done: boolean;
  cancelled: boolean;
  remind: boolean;
  pinned: boolean;
  /** how this card was produced — drives the honesty badge in the UI */
  provenance: 'ai-endpoint' | 'local-fallback' | 'manual' | 'seed';
}

/* ---------------- date helpers (local time) ---------------- */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Strict: returns a Date only for real calendar dates, otherwise null. */
export function parseLocal(dateStr: string | null | undefined, timeStr?: string | null): Date | null {
  if (!dateStr) return null;
  const dm = ISO_DATE_RE.exec(dateStr);
  if (!dm) return null;
  const [, ys, ms, ds] = dm;
  const y = +ys, m = +ms, d = +ds;
  const base = new Date(y, m - 1, d);
  // reject overflows like Feb 31 (rolls into March) and year bounds
  if (base.getFullYear() !== y || base.getMonth() !== m - 1 || base.getDate() !== d) return null;
  if (timeStr) {
    const tm = TIME_RE.exec(timeStr);
    if (!tm) return base; // unparseable time → treat as date-only, never fabricate
    return new Date(y, m - 1, d, +tm[1], +tm[2], 0, 0);
  }
  return base;
}

export function isValidDateStr(dateStr: string | null | undefined): boolean {
  return !!parseLocal(dateStr);
}

/** Minutes since local midnight for a validated HH:MM, else null. */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const tm = TIME_RE.exec(t);
  if (!tm) return null;
  return +tm[1] * 60 + +tm[2];
}

export function isValidTimeStr(t: string | null | undefined): boolean {
  return timeToMinutes(t) !== null;
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from today to dateStr. null when dateStr is missing/invalid. */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = parseLocal(dateStr);
  if (!target) return null;
  const today = startOfDay(new Date());
  return Math.round((startOfDay(target).getTime() - today.getTime()) / 86400000);
}

export function minutesFromNow(dateStr: string | null | undefined, timeStr?: string | null): number | null {
  if (!dateStr) return null;
  const when = parseLocal(dateStr, timeStr);
  if (!when) return null;
  return Math.round((when.getTime() - Date.now()) / 60000);
}

/** Local timestamp (ms since epoch) for a card's end — the authoritative expiry instant.
 *  Untimed all-day item → end of that local day. Timed → the event's own end time. */
export function itemEndsAt(item: CampusItem): number | null {
  if (!item.date) return null; // undated: never auto-expires
  if (item.endTime) {
    const end = parseLocal(item.date, item.endTime);
    if (end) return end.getTime();
  }
  if (item.time) {
    const start = parseLocal(item.date, item.time);
    if (start) return start.getTime();
  }
  const d = parseLocal(item.date);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

/** Local timestamp of the moment the card becomes actionable-urgent (today by local clock). */
export function itemStartsAt(item: CampusItem): number | null {
  if (!item.date) return null;
  const d = parseLocal(item.date);
  if (!d) return null;
  const t = timeToMinutes(item.time);
  if (t !== null) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() + 0; // start of day: urgency window is day-scoped
  return d.getTime();
}

export function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`;
}

export function formatTime(t: string | null): string {
  const mins = timeToMinutes(t);
  if (mins === null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatTimeRange(item: { time: string | null; endTime: string | null }): string {
  if (item.time && item.endTime) return `${formatTime(item.time)} – ${formatTime(item.endTime)}`;
  if (item.time) return formatTime(item.time);
  return '';
}

export function formatDateShort(dateStr: string | null): string {
  return (parseLocal(dateStr) ?? new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDateFull(dateStr: string | null): string {
  return (parseLocal(dateStr) ?? new Date()).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function weekdayShort(dateStr: string | null): string {
  return (parseLocal(dateStr) ?? new Date()).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
}

/**
 * Status vs the local clock, unified for timed and all-day items.
 *  - cancelled  → 'expired' bucket is wrong; handled separately via isItemLive()
 *  - expired    → the card's local end instant has passed
 *  - ongoing    → now is inside a timed window (counts as live & urgent)
 *  - urgent     → starts today (local day) and not yet expired
 *  - upcoming   → everything else (incl. dated-future, and undated → 'upcoming' to avoid fake urgency)
 */
export function itemStatus(item: CampusItem, now: Date = new Date()): ItemStatus {
  if (item.cancelled) return 'expired';
  const nowMs = now.getTime();
  const end = itemEndsAt(item);
  if (end !== null && end < nowMs) return 'expired';
  // ongoing timed window?
  if (item.date && item.time) {
    const start = parseLocal(item.date, item.time);
    if (start && start.getTime() <= nowMs && (end === null || end >= nowMs)) return 'urgent';
  }
  const d = daysUntil(item.date);
  if (d === null) return 'upcoming'; // undated cards are never fabricated-urgent
  if (d === 0) return 'urgent';
  if (d === 1 && item.priority === 'high') return 'urgent';
  return 'upcoming';
}

export type LivePhase = 'ongoing' | 'expired' | 'today' | 'upcoming' | 'undated';

/** Fine-grained phase for labels and countdowns. */
export function itemPhase(item: CampusItem, now: Date = new Date()): LivePhase {
  if (!item.date) return 'undated';
  const nowMs = now.getTime();
  const end = itemEndsAt(item);
  if (end !== null && end < nowMs) return 'expired';
  if (item.time) {
    const start = parseLocal(item.date, item.time);
    if (start && start.getTime() <= nowMs && (end === null || end >= nowMs)) return 'ongoing';
  }
  const d = daysUntil(item.date);
  if (d === null) return 'undated';
  if (d === 0) return 'today';
  return 'upcoming';
}

/** Live means: not done, not cancelled, not expired. */
export function isItemLive(item: CampusItem, now: Date = new Date()): boolean {
  return !item.done && !item.cancelled && itemStatus(item, now) !== 'expired';
}

/** One local end-instant drives expiry, urgent and clearing — single source of truth. */
export function isItemExpired(item: CampusItem, now: Date = new Date()): boolean {
  const end = itemEndsAt(item);
  return end !== null && end < now.getTime();
}

export function countdownLabel(item: CampusItem, now: Date = new Date()): string {
  if (item.cancelled) return 'Cancelled';
  if (!item.date) return 'No date set';
  const phase = itemPhase(item, now);
  if (phase === 'ongoing') {
    const end = itemEndsAt(item);
    if (end !== null) {
      const mins = Math.round((end - now.getTime()) / 60000);
      if (mins <= 0) return 'Ending now';
      if (mins >= 60) return `Ongoing · ends in ${Math.floor(mins / 60)}h ${mins % 60}m`;
      return `Ongoing · ends in ${mins}m`;
    }
    return 'Ongoing';
  }
  if (phase === 'expired') {
    const d = daysUntil(item.date) ?? 0;
    return d === 0 ? 'Ended today' : d === -1 ? 'Yesterday' : `${-d}d ago`;
  }
  if (phase === 'today') {
    if (item.time) {
      const t = timeToMinutes(item.time);
      const d = parseLocal(item.date);
      if (t !== null && d) {
        const diff = Math.floor((d.getTime() + t * 60000 - now.getTime()) / 60000);
        if (diff <= 0) return 'Today · ending soon';
        if (diff >= 120) return `Today · in ${Math.floor(diff / 60)}h ${diff % 60}m`;
        if (diff >= 60) return `Today · in 1h ${diff % 60}m`;
        return `Today · in ${diff}m`;
      }
    }
    return 'Today';
  }
  const d = daysUntil(item.date);
  if (d === null) return 'No date set';
  if (d === 1) return 'Tomorrow';
  return `In ${d} days`;
}

/* ---------------- categories ---------------- */

export const CATEGORIES: Category[] = [
  'Academic', 'Exams', 'Assignment', 'Event', 'Clubs', 'Sports', 'Hostel', 'Placement', 'Fee', 'General',
];

export const CATEGORY_META: Record<Category, { color: string; soft: string; text: string; icon: string }> = {
  Academic:   { color: '#2563EB', soft: '#E3EBFD', text: '#1D4ED8', icon: 'book-open' },
  Exams:      { color: '#DC2626', soft: '#FBE3E1', text: '#B91C1C', icon: 'file-pen' },
  Assignment: { color: '#7C3AED', soft: '#EEE7FD', text: '#6D28D9', icon: 'pencil-ruler' },
  Event:      { color: '#E4572E', soft: '#FDE7DC', text: '#C2410C', icon: 'sparkles' },
  Clubs:      { color: '#DB2777', soft: '#FCE0EE', text: '#BE185D', icon: 'users' },
  Sports:     { color: '#059669', soft: '#DFF4EA', text: '#047857', icon: 'trophy' },
  Hostel:     { color: '#0D9488', soft: '#DDF1EE', text: '#0F766E', icon: 'bed-double' },
  Placement:  { color: '#B45309', soft: '#FAEDCF', text: '#92400E', icon: 'briefcase-business' },
  Fee:        { color: '#C2410C', soft: '#FDEBDA', text: '#9A3412', icon: 'wallet' },
  General:    { color: '#57534E', soft: '#ECEAE4', text: '#44403C', icon: 'megaphone' },
};

/* ============================================================
   SEED DATA — generated relative to "today" so the demo always
   feels alive: two items land today, one yesterday, the rest
   spread across the coming weeks.
   ============================================================ */

function dOff(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toISO(d);
}
function ago(days: number, h = 10, m = 0): number {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function buildSeed(): CampusItem[] {
  const mk = (
    id: string, title: string, off: number, time: string | null, venue: string | null,
    category: Category, source: string, daysAgoAdded: number, priority: Priority,
    remind = false, pinned = false, raw = '', endTime: string | null = null
  ): CampusItem => ({
    id, title, date: dOff(off), time, endTime, venue, category, source,
    raw: raw || title, addedAt: ago(daysAgoAdded), updatedAt: ago(daysAgoAdded),
    priority, done: false, cancelled: false, remind, pinned, provenance: 'seed',
  });

  return [
    mk('seed-1', 'DBMS End-Semester Exam — Hall B (09:00)', 0, '09:00', 'Exam Hall B, Admin Block', 'Exams',
      'WhatsApp · CSE 4th Year', 2, 'high', true, true,
      'Reminder!! DBMS End Sem Exam for 4th sem CSE is on TODAY at 9:00 AM in Hall B. Carry ID card + 2 pens. Gates close at 8:45, no entry after. All the best!!'),
    mk('seed-2', 'Photosynthesis Quiz submission closes 5 PM', 0, '17:00', 'Brightspace → Bio-101', 'Assignment',
      'Email · Dr. Mehta', 1, 'high', true, false,
      'Dear students, this is a reminder that your Photosynthesis quiz on Brightspace closes today at 5:00 PM sharp. No extensions will be granted. — Dr. Mehta', null, '17:00'),
    mk('seed-3', 'Inter-Hostel Cricket Final — Boys vs Girls batch', -1, '16:30', 'Sports Ground', 'Sports',
      'WhatsApp · Sports Council', 3, 'medium', false, false,
      'FINALS! Boys vs Girls cricket final yesterday at 4:30 PM, Sports Ground. Congrats to our champions!!'),
    mk('seed-4', 'Assignment 3: OS Deadlocks Report', 1, '23:59', null, 'Assignment',
      'Email · Prof. Rao', 1, 'high', true, true,
      'Reminder: Assignment 3 on Deadlocks & Banker\'s Algorithm is due tomorrow (11:59 PM). Submit on the course portal. Late submissions: -20% per day. — Prof. Rao'),
    mk('seed-5', 'Cultural Fest "Tarang 2026" — Pro-Night passes', 1, '18:00', 'Open Air Theatre (OAT)', 'Event',
      'Notice Board · Student Council', 2, 'medium', false, false,
      'TARANG 2026!! Pro-Night this Saturday at OAT, 6 PM onwards. Passes at the SAC counter ₹150. Bring college ID. Limited passes!!'),
    mk('seed-6', 'TCS NQT — last date to register', 2, '23:59', 'Placement Portal', 'Placement',
      'Email · Placement Cell', 1, 'high', true, true,
      'Dear final-year students, TCS National Qualifier Test registrations close on the placement portal in 2 days. Eligibility: 60%+ throughout, no active backlogs. Register NOW to avoid last-day rush. — Training & Placement Cell'),
    mk('seed-7', 'Library fine amnesty week kicks off', 2, null, 'Central Library', 'General',
      'Notice Board · Library', 4, 'low', false, false),
    mk('seed-8', 'Guest Lecture: "AI in Indian Healthcare"', 3, '11:00', 'Seminar Hall 3, AB-2', 'Academic',
      'Email · Dept. of CSE', 2, 'medium', true, false,
      'The Department of CSE cordially invites you to a guest lecture by Dr. Anjali Deshmukh (IIT Delhi) on "AI in Indian Healthcare". Wednesday, 11 AM, Seminar Hall 3, AB-2. Attendance counts toward your seminar credits.'),
    mk('seed-9', 'Rotaract Club Elections — nominations', 3, '14:00', 'SAC Auditorium', 'Clubs',
      'WhatsApp · Rotaract Club', 1, 'medium', false, false),
    mk('seed-10', 'Hostel Mess: special Shahi Biryani night', 4, '19:30', 'Hostel H2 Mess', 'Hostel',
      'WhatsApp · Hostel H2', 0, 'low', false, false),
    mk('seed-11', 'Mid-Sem Results: Data Structures & Algorithms', 5, null, 'Exam Cell Portal', 'Exams',
      'Notice Board · Exam Cell', 3, 'medium', true, false,
      'MIDSEM RESULTS OUT. DSA (CS301) mid-semester marks have been uploaded to the Exam Cell portal. Re-evaluation window: 3 days from publication.'),
    mk('seed-12', 'Placement Drive: Infosys — PPT + Registration', 6, '10:00', 'Main Auditorium', 'Placement',
      'Email · Placement Cell', 1, 'high', true, true,
      'Infosys campus drive next week. Pre-placement talk + registration: 10 AM, Main Auditorium. Eligibility: 2027 batch, 65%+, no backlogs at the time of joining. Dress formals. Bring 3 copies of your resume.'),
    mk('seed-13', 'Photography Club: "Chai & Shoot" walk at Hauz Khas', 7, '06:00', 'Meet at Gate 2', 'Clubs',
      'WhatsApp · Photography Club', 2, 'low', false, false),
    mk('seed-14', 'Supplemental Instruction: Organic Chemistry', 9, '16:00', 'Room 204, Chemistry Block', 'Academic',
      'Notice Board · Chemistry Dept.', 4, 'low', false, false),
    mk('seed-15', 'Fee Deadline: Odd-semester tuition instalment', 11, '23:59', 'Accounts Office / Online', 'Fee',
      'Email · Accounts Office', 3, 'high', true, true,
      'IMPORTANT: Last date to pay the odd-semester tuition fee instalment is in 11 days. Pay online via SBI Collect or at the Accounts Office (9 AM – 4 PM). Late fee ₹500 + portal lock after due date.'),
    mk('seed-16', 'Basketball Tryouts for Inter-College Team', 13, '17:00', 'Indoor Sports Complex', 'Sports',
      'WhatsApp · Basketball Team', 5, 'low', false, false),
    mk('seed-17', 'NPTEL certification exam — last registration day', 15, '23:59', 'NPTEL Portal', 'Academic',
      'Email · MOOC Cell', 6, 'medium', false, false),
    mk('seed-18', 'Tech Fest "Tekkriti" — Volunteer briefing', 17, '18:30', 'SAC Auditorium', 'Event',
      'Notice Board · Tech Committee', 2, 'medium', false, false),
    mk('seed-19', 'Hostel maintenance: water supply shutdown (Block C)', 8, null, 'Hostel Block C', 'Hostel',
      'Notice Board · Maintenance', 0, 'medium', false, false,
      'NOTICE: Water supply to Hostel Block C will remain suspended from 8 AM to 2 PM next week for overhead tank cleaning. Store water in advance. Inconvenience is regretted.'),
    mk('seed-20', 'Inter-department photography walk: "Kadamba campus in monsoon"', 0, '06:00', 'Meet at Gate 2', 'Clubs',
      'WhatsApp · Photography Club', 1, 'low', false, false,
      'Photowalk this morning! Meet at Gate 2 at 6 AM sharp with your cameras or phones. Bring water — it is humid out there.'),
    mk('seed-21', 'Club fair returns: all societies recruiting in SAC lawn', 0, null, 'SAC Lawn', 'Clubs',
      'Notice Board · Student Council', 0, 'medium', true, false,
      'CLUB FAIR TODAY!! Every student society has a booth on the SAC lawn from morning till evening. Drop by, try demos, sign up. Bring your ID.'),
  ];
}

/* ============================================================
   PERSISTENCE
   ============================================================ */

const KEY = 'campus-pulse-v1';
const KEY_BACKUP = 'campus-pulse-v1.bak';

export interface StoreState { items: CampusItem[]; onboarded: boolean }

/** Canonical shape for duplicate detection — same notice text + same scheduled slot. */
export function canonicalSignature(item: Pick<CampusItem, 'title' | 'date' | 'time' | 'endTime' | 'category'>): string {
  const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return [norm(item.title), item.date ?? 'undated', item.time ?? 'allday', item.endTime ?? 'noend', item.category].join('|');
}

const VALID_CATEGORIES = new Set(CATEGORIES);
const VALID_PRIORITIES = new Set<Priority>(['low', 'medium', 'high']);
const VALID_PROVENANCE = new Set(['ai-endpoint', 'local-fallback', 'manual', 'seed']);

/**
 * Validates and repairs one stored record. Returns null for unrecoverable junk
 * (falls back to a sane item where possible rather than crashing).
 */
export function sanitizeStoredItem(raw: unknown, now = Date.now()): CampusItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.title !== 'string' || !r.title.trim()) return null;

  const cleanStr = (v: unknown, max = 200): string | null =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

  let date = cleanStr(r.date, 10);
  if (date && !isValidDateStr(date)) date = null; // invalid stored date → "undated", never crash
  let time = cleanStr(r.time, 5);
  if (time && !isValidTimeStr(time)) time = null;
  let endTime = cleanStr(r.endTime, 5);
  if (endTime && !isValidTimeStr(endTime)) endTime = null;

  const id = cleanStr(r.id, 80) ?? `migrated-${Math.abs(hashStr((r.title as string) + (date ?? ''))).toString(36)}`;
  const addedAt = typeof r.addedAt === 'number' && Number.isFinite(r.addedAt) ? r.addedAt : now;
  const updatedAt = typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : addedAt;
  const category = VALID_CATEGORIES.has(r.category as Category) ? (r.category as Category) : 'General';
  const priority = VALID_PRIORITIES.has(r.priority as Priority) ? (r.priority as Priority) : 'medium';
  const provenance = VALID_PROVENANCE.has(r.provenance as string) ? (r.provenance as CampusItem['provenance']) : 'local-fallback';

  return {
    id,
    title: (r.title as string).trim().slice(0, 240),
    date, time, endTime,
    venue: cleanStr(r.venue, 120),
    category,
    source: cleanStr(r.source, 120) ?? 'Saved',
    raw: typeof r.raw === 'string' ? r.raw.slice(0, 4000) : (r.title as string),
    addedAt, updatedAt,
    priority,
    done: r.done === true,
    cancelled: r.cancelled === true,
    remind: r.remind === true,
    pinned: r.pinned === true,
    provenance,
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

/** Loads + migrates. Keeps a .bak of the raw payload; dedupes; never throws. */
export function sanitizeStoredItems(rawItems: unknown): CampusItem[] {
  if (!Array.isArray(rawItems)) return [];
  const seen = new Set<string>();
  const out: CampusItem[] = [];
  const now = Date.now();
  for (const entry of rawItems) {
    const item = sanitizeStoredItem(entry, now);
    if (!item) continue;
    const sig = canonicalSignature(item);
    if (seen.has(sig)) continue; // drop stored duplicates
    seen.add(sig);
    out.push(item);
  }
  return out;
}

export function loadState(): StoreState {
  try {
    const rawText = localStorage.getItem(KEY);
    if (rawText) {
      try { localStorage.setItem(KEY_BACKUP, rawText); } catch { /* backup best-effort */ }
      const parsed = JSON.parse(rawText) as Partial<StoreState>;
      const items = sanitizeStoredItems(parsed.items);
      return { items, onboarded: parsed.onboarded === true };
    }
  } catch {
    /* corrupted store — fall through to seed below */
  }
  return { items: buildSeed(), onboarded: false };
}

export function saveState(state: StoreState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full — non-fatal */
  }
}

export function resetAll(): StoreState {
  localStorage.removeItem(KEY);
  return { items: buildSeed(), onboarded: true };
}

/* ============================================================
   SMART INPUT — structured extraction from messy notices.
   The PRIMARY path is the secure server endpoint /api/extract
   (see src/lib/aiClient.ts → server/ai.ts), which calls a real
   LLM and validates its response. This on-device parser is the
   FALLBACK used when the endpoint is unconfigured, times out,
   or errors — and it always honestly reports missing dates
   (date: null) instead of fabricating "today".
   ============================================================ */

export type ExtractionSource = 'ai-endpoint' | 'local-fallback';

export interface Extraction {
  title: string;
  date: string | null;
  time: string | null;
  endTime: string | null;
  venue: string | null;
  category: Category;
  priority: Priority;
  cancelled: boolean;
  source: ExtractionSource;
  signals: string[];
  notice?: string; // short human-readable note, e.g. why a field is missing
}

/** Validate an externally-produced extraction (endpoint payload). Returns null when unsalvageable. */
export function sanitizeExtraction(raw: unknown, source: ExtractionSource): Extraction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 240) : '';
  if (!title) return null;

  let date = typeof r.date === 'string' ? r.date.trim() : null;
  if (date && !isValidDateStr(date)) date = null;
  let time = typeof r.time === 'string' ? r.time.trim() : null;
  if (time && !isValidTimeStr(time)) time = null;
  let endTime = typeof r.endTime === 'string' ? r.endTime.trim() : null;
  if (endTime && !isValidTimeStr(endTime)) endTime = null;
  // keep window sane: end before start → drop end rather than invent a new time
  if (time && endTime && (timeToMinutes(endTime) ?? 0) < (timeToMinutes(time) ?? 0)) endTime = null;

  const category = CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'General';
  const priority: Priority = ['low', 'medium', 'high'].includes(r.priority as string) ? (r.priority as Priority) : 'medium';

  return {
    title,
    date,
    time,
    endTime,
    venue: typeof r.venue === 'string' && r.venue.trim() ? r.venue.trim().slice(0, 120) : null,
    category,
    priority,
    cancelled: r.cancelled === true,
    source,
    signals: Array.isArray(r.signals) ? r.signals.filter((s): s is string => typeof s === 'string').slice(0, 6) : [],
  };
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};
const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const FILLER_START = /^(hi+|hello+|hey+(\s*guys?)?|dear(\s+(students?|all|everyone|sir\/?madam))?|attention(\s+please)?|notice|fyi(:|,|\s)?|fwd[:\s]|forwarded(\s+message)?[:\s]?|reminder(!!?)?[:\s]?|urgent(!!?)?[:\s]?|alert|important|good\s+(morning|afternoon|evening)|namaste|note|update|breaking|mom\s*:|subah|shaam|raat|aaj|kal|parson|tonight|today|tomorrow)[\s:,.!-]*/i;
const GLUE_WORDS = new Set(['by', 'on', 'at', 'in', 'from', 'to', 'until', 'till', 'before', 'after', 'is', 'are', 'was', 'the', 'a', 'an', 'for', 'and', 'with', 'of']);
const STOP_WORDS = new Set(['in', 'on', 'at', 'by', 'from', 'to', 'of', 'with', 'for', 'is', 'are', 'was', 'and', 'the', 'a', 'an', 'this', 'that', 'it', 'please', 'kindly', 'all']);
const SIGN_OFF = /\b(warm regards|thanks and regards|best wishes|thank you|thank you so much|with regards|cheers|sincerely|yours truly|yours faithfully|student council|office of the|academic office|—\s*[A-Z][a-z]|~\s*[A-Z])\b[\s\S]*$/i;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]/gu;

function capitalizeTitle(s: string): string {
  const t = s.trim().replace(/[:：\-–—\s]+$/, '');
  if (!t) return 'Untitled notice';
  // Keep ALLCAPS acronyms (DBMS, SAC, OAT) intact; fix lowercase starts
  const fixed = t.charAt(0) === t.charAt(0).toLowerCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  return fixed.length > 110 ? fixed.slice(0, 107).trimEnd() + '…' : fixed;
}

const CANCEL_RE = /\b(cancell?ed|cancellation|postponed|postpone|reschedul?ed|reschedul|abandoned|withdrawn|call\s?off|called\s+off|no\s+longer\s+(valid|applicable|on?)|scrapped|dropped)\b/i;

export function detectCancellation(text: string): boolean {
  return CANCEL_RE.test(text);
}

export function extractItem(rawInput: string): Extraction {
  const raw = rawInput.trim();
  const now = new Date();
  const today = startOfDay(now);
  const signals: string[] = [];

  let text = raw.replace(EMOJI, ' ').replace(/\s+/g, ' ').trim();
  // strip forwarded header block lines like "---------- Forwarded message ---------"
  text = text.replace(/-{2,}\s*forwarded\s+message\s*-{2,}/gi, ' ').replace(/-{2,}\s*original\s+message\s*-{2,}/gi, ' ');

  /* ---------- DATE ---------- */
  let dateISO: string | null = null;
  const dateCand: { idx: number; len: number; date: Date; tier: 0 | 1 }[] = [];
  const lower = text.toLowerCase();

  const pushDate = (idx: number, len: number, d: Date | null, tier: 0 | 1 = 0) => {
    if (d && idx >= 0 && !Number.isNaN(d.getTime())) dateCand.push({ idx, len, date: d, tier });
  };
  const mkLocal = (y: number, mIdx: number, d: number): Date | null => {
    if (mIdx < 0 || mIdx > 11 || d < 1 || d > 31) return null;
    const dt = new Date(y, mIdx, d); // local noon avoids any DST-midnight edge
    if (dt.getFullYear() !== y || dt.getMonth() !== mIdx || dt.getDate() !== d) return null;
    return dt;
  };

  // relative keywords
  let m: RegExpExecArray | null;
  const relRe = /\b(today|tonight|kal|tomorrow|parson|day after tomorrow|aaj)\b/gi;
  while ((m = relRe.exec(lower))) {
    const w = m[1].toLowerCase();
    const d = new Date(today);
    if (w === 'tomorrow' || w === 'kal') d.setDate(d.getDate() + 1);
    else if (w === 'parson' || w === 'day after tomorrow') d.setDate(d.getDate() + 2);
    pushDate(m.index, m[0].length, d, 1);
  }
  // "next week" → +7
  const nw = /\bnext\s+week\b/gi.exec(lower);
  if (nw) { const d = new Date(today); d.setDate(d.getDate() + 7); pushDate(nw.index, nw[0].length, d, 1); }

  // "in N days"
  const inDays = /\bin\s+(\d{1,2})\s+days?\b/gi.exec(lower);
  if (inDays) { const d = new Date(today); d.setDate(d.getDate() + parseInt(inDays[1], 10)); pushDate(inDays.index, inDays[0].length, d, 1); }

  // weekday names, optional "next"/"this"
  const wdRe = /\b(next|this|coming)?\s*(sun(day)?|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(r|rs|rsday|thursday)?|fri(day)?|sat(urday)?)\b/gi;
  while ((m = wdRe.exec(lower))) {
    const tok = (m[2] || '').toLowerCase();
    const target = WEEKDAYS[tok] ?? WEEKDAYS[tok.slice(0, 3)];
    if (target === undefined) continue;
    const isNext = !!(m[1] && m[1].toLowerCase() === 'next');
    const d = new Date(today);
    let delta = (target - d.getDay() + 7) % 7;
    if (delta === 0) delta = 7; // "friday" said on friday → next friday
    if (isNext) delta += 7;
    d.setDate(d.getDate() + delta);
    pushDate(m.index, m[0].length, d, 1);
  }

  // numeric d/m/y (Indian order) & ISO — strict calendar validation
  const numRe = /\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/g;
  while ((m = numRe.exec(text))) {
    const a = +m[1], b = +m[2];
    let y = m[3] ? +m[3] : today.getFullYear();
    if (y < 100) y += 2000;
    let day = a, month = b - 1;
    if (b > 12 && a <= 12 && b <= 31) { day = b; month = a - 1; } // US-style flip
    if (day > 31 || month < 0 || month > 11) continue;
    let d = mkLocal(y, month, day);
    if (!d) continue; // e.g. 31/02 — rejected outright
    if (!m[3] && d < today) d = mkLocal(y + 1, month, day); // no year → next occurrence
    if (!d) continue;
    pushDate(m.index, m[0].length, d);
  }
  const isoRe = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  while ((m = isoRe.exec(text))) {
    pushDate(m.index, m[0].length, mkLocal(+m[1], +m[2] - 1, +m[3]));
  }

  // "12 November" / "November 12" / "12th Nov 2026" / "Nov 12th"
  const monNames = Object.keys(MONTHS).join('|');
  const dmyRe = new RegExp(`\b(\d{1,2})(st|nd|rd|th)?\s+(?:of\s+)?(${monNames})\.?(?:,?\s*(20\d{2}))?\b`, 'gi');
  while ((m = dmyRe.exec(lower))) {
    const day = +m[1];
    const month = MONTHS[m[3].toLowerCase()];
    const y = m[4] ? +m[4] : today.getFullYear();
    let d = mkLocal(y, month, day);
    if (d && !m[4] && d < today) d = mkLocal(y + 1, month, day);
    pushDate(m.index, m[0].length, d);
  }
  const mdyRe = new RegExp(`\b(${monNames})\.?\s+(\d{1,2})(st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b`, 'gi');
  while ((m = mdyRe.exec(lower))) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = +m[2];
    const y = m[4] ? +m[4] : today.getFullYear();
    let d = mkLocal(y, month, day);
    if (d && !m[4] && d < today) d = mkLocal(y + 1, month, day);
    pushDate(m.index, m[0].length, d);
  }

  if (dateCand.length) {
    // explicit calendar dates (tier 0) beat weekday/relative hints (tier 1); soonest upcoming date wins
    dateCand.sort((a, b) => a.idx - b.idx);
    const future = dateCand.filter(x => startOfDay(x.date) >= today);
    const pool = future.length ? future : dateCand;
    const tier0 = pool.filter(x => x.tier === 0);
    const usable = tier0.length ? tier0 : pool;
    const chosen = usable.reduce((best, x) => {
      if (x.date.getTime() !== best.date.getTime()) return x.date < best.date ? x : best;
      return x.idx < best.idx ? x : best;
    });
    dateISO = toISO(chosen.date);
    signals.push(`date “${formatDateFull(dateISO)}”`);
  } else {
    // honestly report the unknown — never fabricate "today"
    dateISO = null;
    signals.push('no date found — left unset');
  }

  /* ---------- TIME ---------- */
  // Parse time expressions into absolute minutes. Supports:
  //   "9 AM" · "9:30 pm" · "09:30" · "17:30 hrs" · "half past 7" · "7 baje" · ranges "9 to 11 AM" / "7-8 pm" / "6:30 to 8:30"
  let timeISO: string | null = null;
  let endTimeISO: string | null = null;
  const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const parse12 = (hr: number, min: number, suffix: string): number | null => {
    if (min > 59) return null;
    const suf = suffix.toLowerCase().replace(/[.\s]/g, '');
    const explicit = suf.startsWith('a') || suf.startsWith('p');
    let h24 = hr;
    if (explicit) {
      const isPM = suf.startsWith('p');
      if (h24 === 12) h24 = isPM ? 12 : 0;
      else if (isPM) h24 += 12;
    } else if (h24 === 24) { h24 = 0; } else if (h24 > 24) return null;
    if (h24 > 23 || h24 < 0) return null;
    return h24 * 60 + min;
  };
  const timeCand: { idx: number; len: number; mins: number; confident: boolean }[] = [];
  let m2: RegExpExecArray | null;
  const timeRe = /\b(\d{1,2})(?::(\d{1,2})|\.(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm|hrs?|hours)\b/gi;
  while ((m2 = timeRe.exec(lower))) {
    const hr = +m2[1];
    const min = m2[2] ? +m2[2] : m2[3] ? +m2[3] : 0;
    const mins = parse12(hr, min, m2[4]);
    if (mins === null) continue;
    timeCand.push({ idx: m2.index, len: m2[0].length, mins, confident: true });
  }
  // plain 24h clock "17:30" with no suffix
  const plain24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
  while ((m2 = plain24.exec(lower))) {
    const mins = +m2[1] * 60 + +m2[2];
    if (!timeCand.some(x => x.mins === mins && Math.abs(x.idx - m2!.index) <= 3)) {
      timeCand.push({ idx: m2.index, len: m2[0].length, mins, confident: true });
    }
  }
  // "half past 7" (morning/evening disambiguated like baje)
  const halfPast = /\bhalf\s+past\s+(\d{1,2})\b/gi;
  while ((m2 = halfPast.exec(lower))) {
    const hr = +m2[1];
    if (hr < 1 || hr > 12) continue;
    const morning = /\b(subah|morning|dawn|am)\b/.test(lower);
    const evening = /\b(shaam|evening|raat|night|nite|pro[- ]?night|dinner|dj|concert|party)\b/.test(lower);
    let h24 = hr;
    if (evening && !morning) h24 += 12;
    timeCand.push({ idx: m2.index, len: m2[0].length, mins: (h24 % 24) * 60 + 30, confident: true });
  }
  // Hinglish: "7 baje" → 07:00 unless evening context
  const baje = /\b(\d{1,2})\s*baje\b/gi;
  while ((m2 = baje.exec(lower))) {
    const hr = +m2[1];
    if (hr < 1 || hr > 23) continue;
    const morning = /\b(subah|morning|dawn)\b/.test(lower);
    const evening = /\b(shaam|evening|raat|night|nite|pro[- ]?night|dinner|dj|concert|party|screening|match|final)\b/.test(lower);
    let h24 = hr;
    if (evening && !morning && h24 < 12) h24 += 12;
    timeCand.push({ idx: m2.index, len: m2[0].length, mins: h24 * 60, confident: true });
  }

  // explicit range detection — “9 to 11 AM”, “7-9 pm”, “6:30 to 8”, “from 8 AM till 2 PM”
  const rangeRe = /\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\s*(?:to|-|–|until|till|se)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm|hrs?)?\b/gi;
  let rangeMatch: RegExpExecArray | null;
  let range: { startIdx: number; endIdx: number; startLen: number; endLen: number; start: number; end: number } | null = null;
  while ((rangeMatch = rangeRe.exec(lower))) {
    const sHr = +rangeMatch[1], sMin = rangeMatch[2] ? +rangeMatch[2] : 0;
    const eHr = +rangeMatch[4], eMin = rangeMatch[5] ? +rangeMatch[5] : 0;
    const sSuf = (rangeMatch[3] || '').toLowerCase().replace(/[.\s]/g, '');
    const eSuf = (rangeMatch[6] || '').toLowerCase().replace(/[.\s]/g, '');
    // inherit the end's am/pm to the start when start lacks one (“9 to 11 AM” → 09:00–11:00)
    const effStartSuf = sSuf || eSuf;
    const start = parse12(sHr, sMin, effStartSuf);
    let end = parse12(eHr, eMin, eSuf || effStartSuf);
    if (start === null || end === null) continue;
    if (end < start && (eSuf.startsWith('a') || !eSuf)) {
      // “10 to 2” crossing noon: 10:00 → 14:00
      if ((eHr % 12) + 12 <= 23 && (eHr % 12) + 12 > (sHr % 12)) end = ((eHr % 12) + 12) * 60 + eMin;
    }
    const fullLen = rangeMatch[0].length;
    range = {
      startIdx: rangeMatch.index,
      endIdx: rangeMatch.index + fullLen - `${rangeMatch[4]}${rangeMatch[5] ? ':' + rangeMatch[5] : ''}${rangeMatch[6] ? ' ' + rangeMatch[6] : ''}`.length,
      startLen: fullLen,
      endLen: 0,
      start,
      end,
    };
    break; // first explicit range wins
  }

  if (range) {
    timeISO = fmt(range.start);
    endTimeISO = range.end >= range.start ? fmt(range.end) : null;
    timeCand.length = 0; // a declared window replaces stray guesses
    signals.push(`time window ${formatTime(timeISO)} – ${endTimeISO ? formatTime(endTimeISO) : ''}`.trim());
  } else if (timeCand.length) {
    const kept = [...timeCand].sort((a, b) => a.idx - b.idx);
    const first = kept[0];
    timeISO = fmt(first.mins);
    signals.push(`time ${formatTime(timeISO)}`);
  }

  /* ---------- VENUE ---------- */
  let venue: string | null = null;
  const venuePatterns: RegExp[] = [
    // Hinglish postposition first — “sports ground pe” etc. (leading words start with a letter)
    /\b((?:[A-Za-z][A-Za-z&'-]*\s+){0,4}[A-Za-z0-9][A-Za-z0-9&'-]*)\s+(?:pe|par|mein|me)\b/i,
    /\b(?:venue|location|at|@)\b(?:\s+the)?\s*[:\-–—]?\s*([A-Za-z0-9][A-Za-z0-9 ,&'\/()-]{2,58})/i,
    /\b(?:meet(?:ing)?\s+(?:at|point)|reporting|assemble)\b\s*(?:at|:)?\s*(?:the\s+)?([A-Za-z0-9][A-Za-z0-9 ,&'\/()-]{2,58})/i,
    /\b(?:on|in)\s+(?:the\s+)?((?:[A-Za-z0-9]+\s+){0,4}(?:portal|website|app|google classroom|microsoft teams|online|lms|brightspace))(?=[\s.,;!]|$)/i,
  ];
  const venueBoundaryWords = (v: string) => v.split(/\s+/).filter(Boolean);
  const leadNoise = new Set(['kal', 'aaj', 'parson', 'subah', 'shaam', 'raat', 'morning', 'evening', 'night', 'am', 'pm', 'hrs', 'baje', 'the', 'a', 'an', 'is', 'are', 'be', 'on', 'at', 'in', 'by', 'from', 'to', 'for', 'with', 'of', 'and', 'urgent', 'reminder', 'dear', 'students', 'guys', 'heyy', 'hey', 'h']);
  const cleanVenue = (v: string) => {
    let out = v.trim().replace(/[.,;:!\-–—]+$/, '').trim();
    // cut at commas — but keep place continuations like "Hall B, Admin Block":
    // only if every comma-following fragment still looks like a place (no verbs/fillers)
    const notPlace = new Set(['attendance','counts','count','is','are','was','were','please','bring','carry','contact','register','submit','kindly','note','passes','pass','all','best','guys','for','and','with','by','on','at','from','to','the','a','an','in','of','sharp','gates','gate']);
    const commaParts = out.split(/[,;]/);
    if (commaParts.length > 1) {
      const keep: string[] = [commaParts[0]];
      for (let i = 1; i < commaParts.length; i++) {
        const frag = commaParts[i].trim();
        if (!frag) break;
        const words = frag.toLowerCase().split(/\s+/);
        if (words.length <= 4 && words.every(w => !notPlace.has(w.replace(/[^a-z]/g, '')))) keep.push(frag);
        else break;
      }
      out = keep.join(', ').trim();
    }
    out = out.split(/\s+(?:by|on|at|in|for|from|with|please|kindly|contact|bring|carry|register|submit|last|note|batch|timings?|pe|par|mein|me|baje|regarding|about|counts|accounts|es)\b/i)[0].trim();
    out = out.split(/\s+\d{1,2}\s*(?:baje|am|pm|hrs?|:\d{2})/i)[0].trim();
    // drop dangling tail glue words repeatedly
    let prev = '';
    while (out !== prev) {
      prev = out;
      out = out.replace(/\s+(on|at|by|from|to|the|a|an|in|for|and|of|with|is|are)$/i, '').replace(/[.,;:!\-–—]+$/, '').trim();
    }
    // drop dangling LEADING noise (time/filler/digit words absorbed from loose captures)
    prev = '';
    while (out !== prev) {
      prev = out;
      const parts = out.split(/\s+/);
      if (parts.length > 1 && (leadNoise.has(parts[0].toLowerCase().replace(/[^a-z]/g, '')) || /^\d{1,2}$/.test(parts[0]))) {
        out = parts.slice(1).join(' ').trim();
      }
    }
    return out;
  };
  const isValidVenue = (v: string) => {
    const words = venueBoundaryWords(v);
    if (words.length === 0 || words.length > 6) return false;
    if (!/^[A-Za-z0-9]/.test(v)) return false;
    if (/^(the|a|an|your|you|this|that|it)\b/i.test(v)) return false;
    const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    if (lowerWords.every(w => !w)) return false;
    // reject if >45% of words are stop/function words (i.e. it's a sentence, not a place)
    const stop = lowerWords.filter(w => STOP_WORDS.has(w) || GLUE_WORDS.has(w)).length;
    if (stop / words.length > 0.45) return false;
    // reject date-like captures ("Monday", "5 pm", "Nov")
    const dateLike = new Set(['monday','tuesday','wednesday','thursday','friday','saturday','sunday','today','tomorrow','kal','parson','aaj','tonight','morning','evening','night','am','pm','hrs', ...Object.keys(MONTHS)]);
    if (lowerWords.every(w => dateLike.has(w) || /^\d+$/.test(w))) return false;
    // capture must not START with a number+unit pattern like "2 days", "11:59 pm"
    if (/^\d/.test(v)) return false;
    return true;
  };
  for (const re of venuePatterns) {
    const vm = re.exec(text);
    if (vm) {
      const v = cleanVenue(vm[1]);
      if (v.length >= 2 && isValidVenue(v)) { venue = v; break; }
    }
  }
  if (!venue) {
    const knownVenues = ['Placement Portal', 'Hall B', 'OAT', 'SAC', 'LHC', 'Central Library', 'Main Auditorium', 'Open Air Theatre', 'Seminar Hall', 'Sports Ground', 'Indoor Sports Complex', 'Admin Block', 'Exam Hall', 'Chemistry Block', 'Hostel', 'Auditorium', 'Amphitheatre', 'Community Hall', 'Room No', 'Exam Cell Portal', 'Portal', 'Block'];
    for (const kv of knownVenues) {
      const re = new RegExp(`(?:at|in|@|pe|mein|me|par)\\s+(${kv}[A-Za-z0-9 ,'&()-]{0,40})`, 'i');
      const vm = re.exec(text);
      if (vm) {
        const v = cleanVenue(vm[1]);
        if (v.length >= 2) { venue = v; break; }
      }
    }
  }
  if (venue) signals.push(`venue “${venue}”`);

  /* ---------- CATEGORY (weighted keyword scoring) ---------- */
  const t = lower;
  const catScores: [Category, RegExp, number][] = [
    ['Exams', /\b(exam|examination|mid[- ]?sem|end[- ]?sem|midterm|endterm|quiz|viva|test|paper|hall ticket|result)\b/g, 3],
    ['Assignment', /\b(assignment|submission|submit|homework|project report|deadline|problem set|lab record|draft|essay|worksheet)\b/g, 3],
    ['Placement', /\b(placement|internship|ppt|pre-?placement|company|recruit|hiring|interview|resume|portfolio|tcs|infosys|wipro|cts|accenture|cognizant|lpa|offer letter|aptitude)\b/g, 3],
    ['Fee', /\b(fee|fees|tuition|challan|fine|dues|payment|scholarship|instal?ment|accounts office|demand draft)\b/g, 3],
    ['Hostel', /\b(hostel|mess|canteen|dorm|warden|curfew|room allot|block [a-h]|accommodation|laundry)\b/g, 2.5],
    ['Sports', /\b(match|tournament|cricket|football|basketball|badminton|volleyball|athletics|tryout|fixture|league|championship|ipl|ground)\b/g, 2.5],
    ['Clubs', /\b(club|society|rotaract|nss|ncc|gdg|e-?cell|cultural council|photography|drama|dance|music|elections?|recruitment drive)\b/g, 2],
    ['Event', /\b(fest|festival|tarang|tekkriti|pro-?night|concert|bollywood|dj|carnival|mela|exhibition|showcase|inauguration|celebration|screening|workshop|hackathon|bootcamp|meetup|open mic|standup)\b/g, 2],
    ['General', /\b(library|amnesty|brochure|id card|uniform|agm|meeting notice|lost|found)\b/g, 2],
    ['Academic', /\b(lecture|seminar|webinar|guest|class|course|nptel|mooc|workshop on|orientation|convocation|academic|syllabus|timetable|certificate|brightspace|lms)\b/g, 1.5],
  ];
  let bestCat: Category = 'General';
  let bestScore = 0;
  for (const [cat, re, weight] of catScores) {
    const hits = t.match(re);
    const score = hits ? hits.length * weight : 0;
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }
  if (bestScore > 0) signals.push(`category ${bestCat} (${bestScore.toFixed(1)} pts)`);

  /* ---------- PRIORITY ---------- */
  const highNow = /\b(urgent|asap|immediately|today|tonight|now|closing|expires|hurry)\b/i;
  const highDeadline = /\b(last date|last day|deadline|final reminder|tomorrow|kal|mandatory|compulsory|don'?t miss|register now|end date|due)\b/i;
  const lowRe = /\b(optional|fyi|info|informational|no action|casual|fun|just for|heads[- ]?up)\b/i;
  const demanding = bestCat === 'Exams' || bestCat === 'Fee' || bestCat === 'Assignment' || bestCat === 'Placement';
  let priority: Priority = 'medium';
  if (highNow.test(t) || bestCat === 'Exams' || bestCat === 'Fee') priority = 'high';
  else if (highDeadline.test(t) && demanding) priority = 'high';
  else if (lowRe.test(t) || bestCat === 'Sports' || bestCat === 'Clubs') priority = 'low';

  /* ---------- TITLE ---------- */
  // remove matched date/time spans & filler
  let body = text;
  const removals = [...dateCand];
  if (range) removals.push({ idx: range.startIdx, len: range.startLen });
  else for (const tc of timeCand) removals.push({ idx: tc.idx, len: tc.len });
  removals.sort((a, b) => b.idx - a.idx);
  for (const r of removals) {
    body = body.slice(0, r.idx) + ' ' + body.slice(r.idx + r.len);
  }
  body = body.replace(SIGN_OFF, ' ');
  // strip venue clauses from the body for a cleaner title
  if (venue) {
    const esc = venue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    body = body.replace(new RegExp(`(?:\\b(?:meet(?:ing)?|at|in|on|@|venue|location|place|assemble|reporting|pe|par|mein|me)\\b)?(?:\\s+the)?\\s*[:\\-–—]?\\s*${esc}`, 'i'), ' ');
  }
  body = body.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/([,.;:!?])(?:\s*[,.;:!?])+/g, '$1').replace(/\s+/g, ' ').trim();
  // take the first strong clause
  const TRAILING_GLUE = /\s+(?:by|on|at|in|from|before|until|till|to|for|of|with|and|the|a|an|is|are|was|were|be|pe|par|mein|me|regarding|about|timings?)$/i;
  const stripFiller = (s: string) => {
    let out = s, prev = '';
    while (out !== prev) {
      prev = out;
      out = out.replace(FILLER_START, '').replace(/^[^A-Za-z0-9]+/, '').replace(/^(pe|par|mein|me)\b[\s,]*/i, '').replace(/^(meet|gather|assemble|report|join|come|visit|submit|register|show)\b[\s,]*/i, '').replace(/^(that|this is to inform( you)?( that)?|please note that|to all|for all|dear students)\b[\s,]*/i, '').replace(/^(at|in|on|to|from|by|with|of|regarding|about|the|a|an|is|are)\b[\s,]*/i, '').trim();
    }
    return out;
  };
  const stripTrailingGlue = (s: string) => {
    let out = s, prev = '';
    while (out !== prev) {
      prev = out;
      out = out.replace(TRAILING_GLUE, '').replace(/[\s.,;:!–—-]+$/, '').trim();
    }
    return out;
  };
  const clauses = body.split(/(?<=[.!?])\s+|\n|!!+|(?:\s-{2,}\s)/).map(s => s.trim()).filter(Boolean);
  let title = '';
  for (const cl of clauses) {
    const cleaned = stripTrailingGlue(stripFiller(cl));
    if (cleaned.length >= 12) { title = cleaned; break; }
    if (!title && cleaned.length > 0) title = cleaned;
  }
  if (!title) title = stripFiller(body).slice(0, 90).trim();
  title = stripTrailingGlue(title);
  title = capitalizeTitle(title);

  /* ---------- CANCELLATION ---------- */
  const cancelled = detectCancellation(text);
  if (cancelled) signals.push('notice describes a cancellation/postponement');

  const note = !dateISO ? 'No date mentioned — left unset on purpose (a guess would be worse than a blank).' : undefined;

  return {
    title, date: dateISO, time: timeISO, endTime: endTimeISO, venue,
    category: bestCat, priority, cancelled, source: 'local-fallback', signals, notice: note,
  };
}

/* ============================================================
   WEEKLY DIGEST — "What do I need to know this week?"
   ============================================================ */

export type DigestTone = 'critical' | 'warn' | 'good' | 'info';
export interface DigestLine { tone: DigestTone; tag: string; text: string }
export interface DigestResult {
  meta: string;
  weekStart: string; // ISO date of the Monday that opens the window
  stats: { urgent: number; week: number; done: number; total: number };
  lines: DigestLine[];
  closer: string;
  /** how this digest was produced — rendered as an honesty badge in the UI */
  source: 'ai-endpoint' | 'local-fallback';
  notice?: string;
}

export function buildDigest(items: CampusItem[], now: Date = new Date(), source: 'ai-endpoint' | 'local-fallback' = 'local-fallback', aiLines?: DigestLine[]): DigestResult {
  const today = startOfDay(now);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // The active, live pool — undone, uncancelled, and not past their local end instant.
  const live = items.filter(i => isItemLive(i, now));

  const inWindow = (i: CampusItem): boolean => {
    const d = daysUntil(i.date);
    return d !== null && d >= 0 && d <= 6; // today … six days ahead = the next 7 local days
  };
  const todayItems = live.filter(i => daysUntil(i.date) === 0).sort(sortByDateTime);
  const weekItems = live.filter(inWindow).sort(sortByDateTime);
  const highWeek = weekItems.filter(i => i.priority === 'high' || (daysUntil(i.date) === 1 && itemStatus(i, now) === 'urgent'));
  const done = items.filter(i => i.done).length;
  const undated = live.filter(i => !i.date);

  const lines: DigestResult['lines'] = [];

  if (todayItems.length) {
    lines.push({
      tone: 'critical',
      tag: 'TODAY',
      text: `${todayItems.length} thing${todayItems.length > 1 ? 's' : ''} need you today: ${todayItems.map(i => i.title).slice(0, 2).join(' · ')}${todayItems.length > 2 ? ` · +${todayItems.length - 2} more` : ''}. Clear these before anything else.`,
    });
  } else {
    lines.push({ tone: 'good', tag: 'TODAY', text: 'Nothing pressing today — a rare clean slate. Perfect day to get ahead on pending readings.' });
  }

  if (highWeek.length) {
    const u = highWeek[0];
    const du = daysUntil(u.date);
    const when = du === 0 ? 'today' : du === 1 ? 'tomorrow' : `in ${du} days`;
    lines.push({ tone: 'warn', tag: 'DON’T MISS', text: `“${u.title}” — ${when}${u.time ? ` at ${formatTime(u.time)}` : ''}${u.venue ? `, ${u.venue}` : ''}. It’s marked high priority.` });
  }

  if (weekItems.length) {
    const byCat = new Map<Category, number>();
    for (const i of weekItems) byCat.set(i.category, (byCat.get(i.category) || 0) + 1);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, n]) => `${n} ${cat.toLowerCase()}`).join(', ');
    lines.push({ tone: 'info', tag: 'THIS WEEK', text: `${weekItems.length} item${weekItems.length > 1 ? 's' : ''} across the next 7 days — ${top}.` });
  } else {
    lines.push({ tone: 'info', tag: 'THIS WEEK', text: 'The next 7 days are quiet. Might be time to finally start that side project you keep talking about.' });
  }

  const placements = weekItems.filter(i => i.category === 'Placement');
  if (placements.length) {
    lines.push({ tone: 'warn', tag: 'CAREER', text: `${placements.length} placement action${placements.length > 1 ? 's' : ''} this week. Keep your resume updated — drives don’t wait.` });
  }
  const fees = weekItems.filter(i => i.category === 'Fee');
  if (fees.length) {
    lines.push({ tone: 'critical', tag: 'MONEY', text: `Fee deadline on the horizon: “${fees[0].title}”. Check the exact date on the card — pay before it slips your mind.` });
  }
  if (undated.length) {
    lines.push({ tone: 'info', tag: 'UNDATED', text: `${undated.length} notice${undated.length > 1 ? 's have' : ' has'} no date attached — worth a look so they don’t vanish.` });
  }

  // urgency stat: union of today + high-priority-this-week, counted once
  const urgentSet = new Set<string>([...todayItems.map(i => i.id), ...highWeek.map(i => i.id)]);

  const sourceNotice = source === 'local-fallback' ? 'Generated on-device from your board — the AI endpoint was unavailable.' : undefined;
  const closer = aiLines && aiLines.length
    ? '' // an endpoint-authored digest speaks for itself; keep footer factual
    : weekItems.length
      ? `${weekItems.length} item${weekItems.length > 1 ? 's' : ''} on deck between now and ${weekEnd.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}. You’ve got this.`
      : 'A genuinely open week — enjoy it.';

  const finalLines = (aiLines && aiLines.length ? aiLines : lines).slice(0, 5);

  const weekStartISO = toISO(today);
  const rangeFmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const meta = `Week of ${rangeFmt(today)} – ${rangeFmt(weekEnd)} · ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`;

  return {
    meta,
    weekStart: weekStartISO,
    stats: { urgent: urgentSet.size, week: weekItems.length, done, total: items.length },
    lines: finalLines,
    closer,
    source,
    notice: sourceNotice,
  };
}



export function sortByDateTime(a: CampusItem, b: CampusItem): number {
  // empty (undated) dates sort AFTER all dated items
  if (!a.date && !b.date) return a.addedAt - b.addedAt;
  if (!a.date) return 1;
  if (!b.date) return -1;
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;
  const am = timeToMinutes(a.time) ?? 24 * 60 - 1;
  const bm = timeToMinutes(b.time) ?? 24 * 60 - 1;
  if (am !== bm) return am - bm;
  return a.addedAt - b.addedAt;
}

/* ---------------- quick-add sample notices ---------------- */

export const SAMPLE_NOTICES: { label: string; text: string }[] = [
  { label: 'WhatsApp forward', text: 'FORWARDED 🙏\nReminder: CSE 4th year DBMS End Sem exam is TOMORROW 9 AM in Hall B, Admin Block. Carry ID card + 2 pens. Gates close 8:45 sharp!!' },
  { label: 'Email deadline', text: 'Dear students, this is to inform you that your OS Deadlocks assignment (Assignment 3) must be submitted by 11:59 PM on Sunday. Submit on the course portal only. Late submissions lose 20% per day. — Prof. Rao' },
  { label: 'Event poster caption', text: '🎉 TARANG 2026 — Pro Night this Saturday at OAT!! DJ + live band, 6 PM onwards. Passes ₹150 at SAC counter. Bring your college ID. Limited passes available!!' },
  { label: 'Placement alert', text: 'URGENT: TCS National Qualifier Test last date to register is in 2 days on the placement portal. Eligibility: 60%+ all semesters, no active backlogs. Final year students must register now. — Placement Cell' },
];
