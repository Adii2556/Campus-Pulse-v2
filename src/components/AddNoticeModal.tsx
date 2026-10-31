import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardPaste, Sparkles, X, Wand2, ChevronLeft, CalendarDays, Clock, MapPin,
  Flame, Check, Loader2, BadgeCheck, ChevronDown, BellRing, ScanText,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import {
  CATEGORIES, CATEGORY_META, extractItem, parseLocal, formatDateFull, formatTime,
  SAMPLE_NOTICES, type Category, type Priority, type Extraction,
} from '../lib/engine';

type Phase = 'input' | 'thinking' | 'review';

const THINK_STEPS = ['Reading the mess…', 'Finding date & time…', 'Spotting the venue…', 'Filing under the right category…', 'Setting the priority…'];

export default function AddNoticeModal() {
  const { addOpen, setAddOpen, addPrefill, addItem, showToast } = useCampus();
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [thinkIdx, setThinkIdx] = useState(0);

  // editable review fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState<Category>('General');
  const [priority, setPriority] = useState<Priority>('medium');
  const [remind, setRemind] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (addOpen) {
      setPhase('input');
      setText(addPrefill ?? '');
      setExtraction(null);
      setThinkIdx(0);
      setShowRaw(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    setThinkIdx(0);
    const stepTimer = window.setInterval(() => setThinkIdx(i => Math.min(i + 1, THINK_STEPS.length - 1)), 320);
    const doneTimer = window.setTimeout(() => {
      const result = extractItem(text);
      setExtraction(result);
      setTitle(result.title);
      setDate(result.date);
      setTime(result.time ?? '');
      setVenue(result.venue ?? '');
      setCategory(result.category);
      setPriority(result.priority);
      setRemind(result.priority === 'high' || result.priority === 'medium');
      setPhase('review');
    }, 1750);
    return () => { window.clearInterval(stepTimer); window.clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddOpen(false); };
    if (addOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addOpen, setAddOpen]);

  const canExtract = text.trim().length >= 8;

  const pasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) setText(clip.trim());
      else showToast('Clipboard was empty');
    } catch {
      showToast('Clipboard blocked by browser — paste manually');
    }
  };

  const confirm = () => {
    if (!date) { showToast('A date is required — pick one above'); return; }
    addItem({
      title: title.trim() || 'Untitled notice',
      date,
      time: time || null,
      venue: venue.trim() || null,
      category,
      source: 'Added by you · AI parsed',
      raw: text.trim(),
      priority,
      remind,
    });
    setAddOpen(false);
    showToast(`On the board — “${(title.trim() || 'notice').slice(0, 44)}${title.trim().length > 44 ? '…' : ''}”`);
  };

  const dayPreview = useMemo(() => {
    if (!date) return '';
    try { return parseLocal(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' }); } catch { return ''; }
  }, [date]);

  return (
    <AnimatePresence>
      {addOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Smart add — paste any notice">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[3px]" onClick={() => setAddOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 90, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 70, scale: 0.97 }}
            transition={{ type: 'spring', damping: 27, stiffness: 300 }}
            className="relative paper-card w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl max-h-[96vh] flex flex-col overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-line bg-card">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(228,87,46,0.6)]">
                  <Wand2 size={18} className="text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="font-display font-black text-[1.05rem] leading-none">Smart Add</h2>
                  <p className="font-mono text-[0.55rem] tracking-[0.18em] text-muted uppercase mt-1">AI reads the mess · you get the card</p>
                </div>
              </div>
              <button onClick={() => setAddOpen(false)} className="p-2 rounded-full hover:bg-paper text-muted transition-colors" aria-label="Close"><X size={19} /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* ============ PHASE: INPUT ============ */}
              {phase === 'input' && (
                <div className="p-5 sm:p-6">
                  <label htmlFor="raw-notice" className="kicker">Paste anything — WhatsApp, email, poster caption</label>
                  <textarea
                    id="raw-notice"
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    spellCheck={false}
                    placeholder={'e.g.\nFORWARDED 🙏\nReminder!! DBMS End Sem exam TOMORROW 9 AM in Hall B. Carry ID card + 2 pens, gates close 8:45 sharp. All the best!!'}
                    className="field mt-2 h-36 resize-none !bg-[#fffef8] font-[0.82rem] leading-relaxed"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}
                  />
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <button onClick={pasteClipboard} className="flex items-center gap-1.5 text-[0.72rem] font-bold text-teal hover:text-teal-deep transition-colors">
                      <ClipboardPaste size={14} strokeWidth={2.4} /> Paste from clipboard
                    </button>
                    <span className={`font-mono text-[0.62rem] ${canExtract ? 'text-teal' : 'text-faint'}`}>{text.trim().length} chars</span>
                  </div>

                  <p className="kicker mt-4 !text-[0.58rem]">Or try a real-world mess →</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {SAMPLE_NOTICES.map(s => (
                      <button key={s.label} onClick={() => setText(s.text)}
                        className="h-7 px-2.5 rounded-full border border-line bg-white text-[0.68rem] font-semibold text-muted hover:border-accent hover:text-accent-deep transition-all">
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => canExtract && setPhase('thinking')} disabled={!canExtract}
                    className={`w-full h-13 mt-5 rounded-2xl font-bold text-[0.95rem] flex items-center justify-center gap-2 transition-all py-4
                      ${canExtract ? 'bg-accent text-white hover:bg-accent-deep shadow-[0_10px_24px_-8px_rgba(228,87,46,0.65)]' : 'bg-[#e8e4d6] text-faint cursor-not-allowed'}`}>
                    <Sparkles size={18} strokeWidth={2.3} /> Extract with AI
                  </button>
                  <p className="text-center font-mono text-[0.55rem] text-faint mt-2 tracking-wide">RUNS ON-DEVICE · NOTHING LEAVES YOUR PHONE</p>
                </div>
              )}

              {/* ============ PHASE: THINKING ============ */}
              {phase === 'thinking' && (
                <div className="p-8 sm:p-10 flex flex-col items-center text-center min-h-[22rem] justify-center">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-[3px] border-line border-t-accent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ScanText size={28} className="text-teal" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="h-6 mt-6">
                    <AnimatePresence mode="wait">
                      <motion.p key={thinkIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }} className="font-mono text-[0.78rem] text-teal-deep font-medium">
                        {THINK_STEPS[thinkIdx]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {THINK_STEPS.map((_, i) => (
                      <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= thinkIdx ? 'w-5 bg-accent' : 'w-1.5 bg-line'}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* ============ PHASE: REVIEW ============ */}
              {phase === 'review' && extraction && (
                <div className="p-5 sm:p-6">
                  {/* confidence + signals */}
                  <div className="flex items-center gap-3 bg-teal-soft/70 border border-teal/20 rounded-2xl px-3.5 py-2.5">
                    <BadgeCheck size={20} className="text-teal shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[0.78rem] text-teal-deep">Extraction confidence</p>
                        <p className="font-mono text-[0.72rem] font-semibold text-teal-deep">{extraction.confidence}%</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/80 mt-1.5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${extraction.confidence}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-teal to-[#17a398]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {extraction.signals.slice(0, 4).map(s => (
                      <span key={s} className="font-mono text-[0.56rem] text-teal-deep bg-white border border-teal/25 rounded-md px-1.5 py-0.5">✓ {s}</span>
                    ))}
                  </div>

                  {/* editable form */}
                  <label className="kicker mt-4 block">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="field mt-1.5 font-semibold" placeholder="What is this about?" />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="kicker flex items-center gap-1"><CalendarDays size={11} />Date</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field mt-1.5" />
                      {dayPreview && <p className="font-mono text-[0.55rem] text-teal mt-1">→ {dayPreview}</p>}
                    </div>
                    <div>
                      <label className="kicker flex items-center gap-1"><Clock size={11} />Time <span className="text-faint normal-case tracking-normal">(optional)</span></label>
                      <input type="time" value={time} onChange={e => setTime(e.target.value)} className="field mt-1.5" />
                      {time && <p className="font-mono text-[0.55rem] text-teal mt-1">→ {formatTime(time)}</p>}
                    </div>
                  </div>

                  <label className="kicker mt-3 flex items-center gap-1"><MapPin size={11} />Venue <span className="text-faint normal-case tracking-normal">(optional)</span></label>
                  <input value={venue} onChange={e => setVenue(e.target.value)} className="field mt-1.5" placeholder="e.g. Seminar Hall 3, AB-2" />

                  <label className="kicker mt-3 block">Category</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1.5 -mx-1 px-1">
                    {CATEGORIES.map(c => {
                      const meta = CATEGORY_META[c];
                      const active = c === category;
                      return (
                        <button key={c} onClick={() => setCategory(c)}
                          className={`h-8 px-3 shrink-0 rounded-lg text-[0.7rem] font-bold border transition-all ${active ? 'border-transparent text-white shadow-md' : 'bg-white text-muted border-line hover:text-ink'}`}
                          style={active ? { background: meta.color } : {}}>
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3.5 bg-paper/70 border border-line/70 rounded-2xl px-3.5 py-2.5">
                    <div>
                      <p className="kicker !text-[0.55rem]">Priority</p>
                      <div className="flex gap-1 mt-1">
                        {(['low', 'medium', 'high'] as Priority[]).map(p => {
                          const active = p === priority;
                          const styles = p === 'high'
                            ? active ? 'bg-accent text-white border-accent' : 'text-accent-deep border-accent/40'
                            : p === 'medium'
                              ? active ? 'bg-gold text-ink border-gold' : 'text-[#8a6a12] border-gold/60'
                              : active ? 'bg-teal text-white border-teal' : 'text-teal-deep border-teal/40';
                          return (
                            <button key={p} onClick={() => setPriority(p)}
                              className={`h-7 px-3 rounded-lg border text-[0.68rem] font-bold capitalize transition-all ${styles}`}>
                              {p === 'high' && <Flame size={10} className="inline mr-0.5 -mt-0.5" strokeWidth={3} />}{p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button onClick={() => setRemind(v => !v)} aria-pressed={remind}
                      className="flex items-center gap-2 select-none">
                      <span className="text-right">
                        <span className="block text-[0.72rem] font-bold leading-tight">Remind me</span>
                        <span className="block font-mono text-[0.52rem] text-muted uppercase">{remind ? 'Watchlist on' : 'Watchlist off'}</span>
                      </span>
                      <span className={`w-11 h-[1.55rem] rounded-full p-0.5 transition-colors flex ${remind ? 'bg-teal justify-end' : 'bg-[#d8d4c4] justify-start'}`}>
                        <motion.span layout className="w-5 h-5 bg-white rounded-full shadow" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
                      </span>
                    </button>
                  </div>

                  {/* raw toggle */}
                  <button onClick={() => setShowRaw(v => !v)} className="flex items-center gap-1 mt-3 font-mono text-[0.56rem] tracking-wide text-faint hover:text-teal transition-colors">
                    <ChevronDown size={11} className={`transition-transform ${showRaw ? 'rotate-180' : ''}`} /> {showRaw ? 'HIDE' : 'SHOW'} ORIGINAL TEXT
                  </button>
                  {showRaw && <p className="mt-1.5 text-[0.7rem] leading-snug text-muted bg-paper/80 border border-line rounded-lg px-2.5 py-2 italic max-h-20 overflow-y-auto">“{text}”</p>}
                </div>
              )}
            </div>

            {/* footer bar for review */}
            {phase === 'review' && (
              <div className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 border-t border-line bg-card">
                <button onClick={() => setPhase('input')}
                  className="h-12 px-4 rounded-2xl border border-line font-bold text-[0.82rem] text-muted hover:text-ink hover:border-faint transition-all flex items-center gap-1">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={confirm}
                  className="flex-1 h-12 rounded-2xl bg-teal text-white font-bold text-[0.9rem] hover:bg-teal-deep transition-all flex items-center justify-center gap-2 shadow-[0_10px_22px_-8px_rgba(14,95,92,0.6)]">
                  <Check size={18} strokeWidth={3} /> Add to my board
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
