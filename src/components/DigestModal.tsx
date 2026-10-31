import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Share2, ArrowRight, Flame, CalendarRange, CheckCircle2, LayoutGrid } from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { buildDigest, type DigestTone } from '../lib/engine';

const TONE_DOT: Record<DigestTone, string> = {
  critical: '#ff8a5c',
  warn: '#f2c14e',
  good: '#5eead4',
  info: '#93c5fd',
};

export default function DigestModal() {
  const { digestOpen, setDigestOpen, items, showToast } = useCampus();
  const [thinking, setThinking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (digestOpen) {
      setThinking(true);
      const t = window.setTimeout(() => setThinking(false), 1100);
      return () => window.clearTimeout(t);
    }
  }, [digestOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDigestOpen(false); };
    if (digestOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [digestOpen, setDigestOpen]);

  const digest = useMemo(() => buildDigest(items), [items, digestOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareText = () =>
    `📋 CAMPUS PULSE — This week\n${digest.meta}\n\n${digest.lines.map(l => `[${l.tag}] ${l.text}`).join('\n')}\n\n${digest.closer}`;

  const share = async () => {
    const payload = shareText();
    try {
      if (navigator.share) { await navigator.share({ title: 'Campus Pulse — my week', text: payload }); return; }
      throw new Error('no-share');
    } catch {
      try { await navigator.clipboard.writeText(payload); showToast('Digest copied — paste it in any group chat'); }
      catch { showToast('Could not copy — your browser blocked clipboard'); }
    }
  };

  return (
    <AnimatePresence>
      {digestOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="What do I need to know this week?">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/60 backdrop-blur-[3px]" onClick={() => setDigestOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: 90, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 70, scale: 0.97 }}
            transition={{ type: 'spring', damping: 27, stiffness: 300 }}
            className="relative teal-panel w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[94vh] overflow-y-auto text-[#eaf4ee] border border-white/10"
          >
            <button onClick={() => setDigestOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-[#b9d4cc] transition-colors z-10" aria-label="Close"><X size={18} /></button>

            {thinking ? (
              <div className="p-10 flex flex-col items-center text-center min-h-[19rem] justify-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-[3px] border-white/15 border-t-gold animate-spin" />
                  <Sparkles size={24} className="absolute inset-0 m-auto text-gold" />
                </div>
                <p className="font-mono text-[0.75rem] text-[#a7d3c8] mt-5">Reading your board, deadlines & calendar…</p>
              </div>
            ) : (
              <div className="p-5 sm:p-7">
                <p className="font-mono text-[0.6rem] tracking-[0.28em] uppercase text-gold flex items-center gap-2">
                  <Sparkles size={12} /> Your weekly digest
                </p>
                <h2 className="font-display font-black text-[1.65rem] sm:text-[1.8rem] leading-[1.08] mt-2">What you need to<br />know <span className="italic text-gold">this week</span>.</h2>
                <p className="font-mono text-[0.62rem] text-[#8fc3b8] mt-2 tracking-wide">{digest.meta}</p>

                {/* stats strip */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { icon: Flame, n: digest.stats.urgent, label: 'Need attention', tone: 'text-[#ffb99b]' },
                    { icon: CalendarRange, n: digest.stats.week, label: 'Next 7 days', tone: 'text-gold' },
                    { icon: CheckCircle2, n: digest.stats.done, label: 'Done so far', tone: 'text-[#5eead4]' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.07] border border-white/10 px-3 py-2.5 text-center">
                      <s.icon size={15} className={`mx-auto ${s.tone}`} strokeWidth={2.2} />
                      <p className="font-display font-black text-xl leading-none mt-1.5">{s.n}</p>
                      <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-[#9fd0c3] mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* the brief */}
                <div className="mt-5 space-y-3">
                  {digest.lines.map((line, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}
                      className="flex gap-3">
                      <span className="mt-[0.35rem] w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TONE_DOT[line.tone], boxShadow: `0 0 10px ${TONE_DOT[line.tone]}66` }} />
                      <div>
                        <span className="font-mono text-[0.55rem] tracking-[0.22em] text-[#8fc3b8]">{line.tag}</span>
                        <p className="text-[0.83rem] leading-snug text-[#e6f2ec]">{line.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <p className="mt-5 pt-4 border-t border-white/12 font-display italic text-[0.92rem] text-[#cfe8dd]">“{digest.closer}”</p>

                <div className="flex gap-2 mt-4">
                  <button onClick={share}
                    className="h-11 px-4 rounded-2xl border border-white/20 bg-white/5 text-[0.8rem] font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                    <Share2 size={15} /> Share
                  </button>
                  <button onClick={() => { setDigestOpen(false); navigate('/board'); }}
                    className="flex-1 h-11 rounded-2xl bg-gold text-ink text-[0.85rem] font-black flex items-center justify-center gap-2 hover:bg-[#f2b559] transition-all">
                    <LayoutGrid size={16} strokeWidth={2.5} /> Open my board <ArrowRight size={15} strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
