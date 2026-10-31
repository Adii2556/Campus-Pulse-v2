import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardPaste, LayoutList, Sparkles, ArrowRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { useCampus } from '../context/CampusContext';

const STEPS = [
  {
    icon: ClipboardPaste,
    color: '#E4572E',
    soft: '#FDE7DC',
    title: 'Paste the mess',
    body: 'Got a chaotic WhatsApp forward or a cryptic email? Paste it as-is — no formatting needed.',
  },
  {
    icon: LayoutList,
    color: '#0E5F5C',
    soft: '#E3EFEC',
    title: 'Watch it become a card',
    body: 'Campus Pulse reads the date, time, venue & category — and pins it to your board automatically.',
  },
  {
    icon: Sparkles,
    color: '#B45309',
    soft: '#FAEDCF',
    title: 'Never miss a thing',
    body: 'Urgent stuff glows. Deadlines count down. And one tap gives you the week’s whole story.',
  },
];

export default function Onboarding() {
  const { onboarded, markOnboarded, setAddOpen } = useCampus();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') markOnboarded(); };
    if (!onboarded) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onboarded, markOnboarded]);

  return (
    <AnimatePresence>
      {!onboarded && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Welcome to Campus Pulse">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[3px]" onClick={markOnboarded} />
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative paper-card w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 max-h-[94vh] overflow-y-auto"
          >
            <button onClick={markOnboarded} className="absolute top-4 right-4 p-2 rounded-full hover:bg-paper text-muted transition-colors" aria-label="Close intro">
              <X size={18} />
            </button>
            <p className="kicker">Welcome to Campus Pulse</p>
            <h2 className="font-display font-black text-[1.7rem] leading-tight mt-1.5">Three steps.<br />Zero missed deadlines.</h2>
            <div className="mt-5 space-y-3">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <div className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: s.soft }}>
                    <s.icon size={21} strokeWidth={2.1} style={{ color: s.color }} />
                  </div>
                  <div className="pt-0.5">
                    <p className="font-bold text-[0.92rem] leading-snug"><span className="font-mono text-[0.65rem] text-faint align-top mr-1">0{i + 1}</span>{s.title}</p>
                    <p className="text-[0.8rem] text-muted leading-snug mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 mt-6">
              <button onClick={markOnboarded}
                className="flex-1 h-12 rounded-2xl border border-line bg-card font-bold text-[0.88rem] hover:border-teal hover:text-teal transition-all">
                Explore the demo board
              </button>
              <button onClick={() => { markOnboarded(); setAddOpen(true); }}
                className="flex-1 h-12 rounded-2xl bg-accent text-white font-bold text-[0.88rem] hover:bg-accent-deep transition-all flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-8px_rgba(228,87,46,0.7)]">
                Add my first notice <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
