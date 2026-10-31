import { useMemo, useState } from 'react';
import {
  Wand2, ScanText, CalendarDays, Clock, MapPin, Tag, Flame, Gauge, ArrowRight,
  Search, BellRing, Sparkles, ShieldCheck, Wifi, CheckCircle2, Terminal, Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractItem, SAMPLE_NOTICES, CATEGORY_META, formatDateFull, formatTime } from '../lib/engine';
import { useCampus } from '../context/CampusContext';

export default function HowItWorks() {
  const { openAdd } = useCampus();
  const [playground, setPlayground] = useState(SAMPLE_NOTICES[0].text);
  const result = useMemo(() => (playground.trim().length >= 8 ? extractItem(playground) : null), [playground]);

  const meta = result ? CATEGORY_META[result.category] : null;

  return (
    <div className="pt-24 sm:pt-28 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* header */}
        <div className="max-w-3xl">
          <p className="kicker flex items-center gap-2"><Terminal size={12} /> Under the hood</p>
          <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight leading-[1.02] mt-1.5">No magic.<br />Just very <span className="italic text-teal">good reading</span>.</h1>
          <p className="text-[0.92rem] sm:text-base text-muted mt-3 leading-snug">Campus Pulse runs a battle-tested on-device parser built for the way Indian colleges actually write — capslock forwards, Hinglish, “kal”, ordinals, half-past abbreviations. It never uploads your text, and it shows its working.</p>
        </div>

        {/* pipeline */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {[
            { icon: ScanText, step: '01', title: 'Clean & normalise', body: 'Strips emojis, “FORWARDED” banners, forwarded-message headers and shouty punctuation. Finds the real sentences hiding inside.' },
            { icon: CalendarDays, step: '02', title: 'Date & time detection', body: '“today / kal / parson / tomorrow”, “next Friday”, “in 3 days”, “12 Nov”, “Nov 12th”, “05/11”, “9:00 AM”, “17:30 hrs” — all resolved to real dates.' },
            { icon: Tag, step: '03', title: 'Category scoring', body: 'Weighted keyword engine across 9 categories — “end-sem” → Exams, “ppt / offer letter” → Placement, “mess / hostel” → Hostel. Best score wins.' },
            { icon: Flame, step: '04', title: 'Priority & action', body: 'Detects urgency language (“last date”, “final reminder”, “kal”), picks high/medium/low, extracts the title and pre-arms a reminder.' },
          ].map(s => (
            <div key={s.step} className="paper-card rounded-2xl p-5 card-lift relative overflow-hidden">
              <span className="absolute top-3 right-4 font-display font-black text-4xl text-line select-none">{s.step}</span>
              <div className="w-11 h-11 rounded-xl bg-teal-soft flex items-center justify-center">
                <s.icon size={20} className="text-teal" strokeWidth={2.1} />
              </div>
              <p className="font-bold text-[0.92rem] mt-3">{s.title}</p>
              <p className="text-[0.76rem] text-muted leading-snug mt-1">{s.body}</p>
            </div>
          ))}
        </div>

        {/* ===== interactive playground ===== */}
        <div className="grid lg:grid-cols-2 gap-5 mt-12 items-start">
          <div className="paper-card rounded-3xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-5 h-11 border-b border-line bg-[#2a2721]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="font-mono text-[0.62rem] text-[#a8a392] ml-2">playground — type anything messy</span>
            </div>
            <div className="p-4 sm:p-5">
              <textarea value={playground} onChange={e => setPlayground(e.target.value)} spellCheck={false}
                className="field h-44 resize-none leading-relaxed" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}
                aria-label="Try the parser" />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {SAMPLE_NOTICES.map(s => (
                  <button key={s.label} onClick={() => setPlayground(s.text)}
                    className="h-7 px-2.5 rounded-full border border-line bg-white text-[0.66rem] font-semibold text-muted hover:border-accent hover:text-accent-deep transition-all flex items-center gap-1">
                    <Play size={9} strokeWidth={3} />{s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* live parse output */}
          <div className="teal-panel rounded-3xl p-5 sm:p-6 text-[#eaf4ee] relative overflow-hidden">
            <div aria-hidden className="absolute -top-8 -right-8 w-36 h-36 rounded-full border border-white/10" />
            <p className="font-mono text-[0.58rem] tracking-[0.28em] uppercase text-gold flex items-center gap-2"><Sparkles size={12} />Live parse</p>
            {result ? (
              <>
                <h3 className="font-display font-bold text-xl leading-snug mt-3 min-h-[3.5rem]">{result.title}</h3>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    { icon: CalendarDays, label: 'Date', value: formatDateFull(result.date) },
                    { icon: Clock, label: 'Time', value: result.time ? formatTime(result.time) : '— not mentioned' },
                    { icon: MapPin, label: 'Venue', value: result.venue ?? '— not mentioned' },
                    { icon: Tag, label: 'Category', value: result.category, chip: meta?.color },
                    { icon: Flame, label: 'Priority', value: result.priority.toUpperCase() },
                    { icon: Gauge, label: 'Confidence', value: `${result.confidence}%` },
                  ].map(r => (
                    <div key={r.label} className="rounded-2xl bg-white/[0.07] border border-white/10 px-3.5 py-2.5 min-w-0">
                      <p className="font-mono text-[0.52rem] tracking-[0.2em] uppercase text-[#8fc3b8] flex items-center gap-1.5"><r.icon size={11} />{r.label}</p>
                      <p className="font-bold text-[0.82rem] mt-1 truncate" style={r.chip ? { color: '#ffd9a0' } : {}} title={r.value}>{r.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {result.signals.map(s => (
                    <span key={s} className="font-mono text-[0.55rem] text-[#9fe8d4] bg-black/25 border border-white/10 rounded-md px-2 py-1">✓ {s}</span>
                  ))}
                </div>
                <button onClick={() => openAdd(playground)}
                  className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-2xl bg-gold text-ink font-black text-[0.82rem] hover:bg-[#f2b559] transition-colors">
                  <Wand2 size={16} strokeWidth={2.4} /> Add this to my board <ArrowRight size={15} strokeWidth={2.6} />
                </button>
              </>
            ) : (
              <p className="font-mono text-[0.78rem] text-[#8fc3b8] mt-6">Start typing (min 8 characters)…</p>
            )}
          </div>
        </div>

        {/* guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 font-mono text-[0.62rem] text-muted">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-teal" />ON-DEVICE — YOUR TEXT NEVER UPLOADS</span>
          <span className="flex items-center gap-2"><Wifi size={14} className="text-teal" />WORKS ON CAMPUS Wi-Fi OR NO SIGNAL</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-teal" />HUMAN-IN-THE-LOOP — EVERY FIELD EDITABLE</span>
        </div>

        {/* faq */}
        <div className="max-w-3xl mx-auto mt-14">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-center">Fair questions</h2>
          <div className="mt-5 divide-y divide-line border border-line rounded-2xl overflow-hidden bg-card">
            {[
              ['What if the AI gets it wrong?', 'Every extracted field is editable before the card is saved — title, date, time, venue, category, priority. The parser suggests; you decide.'],
              ['Does it handle Hinglish?', '“kal”, “parson”, “aaj”, “subah” style phrasing and mixed scripts are normalised before parsing — built for how Indian campus groups actually write.'],
              ['Where does my data live?', 'In your browser’s local storage. No account, no cloud, no tracking. Clear your browser data and it’s gone — for real.'],
              ['What about the group chats I’ve already ignored?', 'Perfect — you can dump five old notices in a row via Smart Add and they’ll all land on your board with correct dates and priorities.'],
            ].map(([q, a], i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 font-bold text-[0.88rem] hover:bg-paper/70 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  {q}<ArrowRight size={15} className="shrink-0 transition-transform duration-200 group-open:rotate-90 text-teal" />
                </summary>
                <p className="px-5 pb-4 text-[0.82rem] text-muted leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/board" className="inline-flex items-center gap-2 h-12 px-7 rounded-2xl bg-ink text-paper font-bold text-[0.9rem] hover:bg-teal-deep transition-colors">
              <Search size={17} /> Enough talk — open my board
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
