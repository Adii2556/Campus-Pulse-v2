import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

export default function Toasts() {
  const { toasts, dismissToast } = useCampus();
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-[min(92vw,420px)]">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className="flex items-center gap-2.5 bg-ink text-[#f5f2e9] rounded-xl pl-3 pr-1.5 py-2 shadow-2xl w-full"
          >
            <CheckCircle2 size={17} className="text-gold shrink-0" />
            <p className="text-[0.8rem] font-medium flex-1 leading-snug">{t.message}</p>
            {t.actionLabel && (
              <button onClick={() => { t.onAction?.(); dismissToast(t.id); }}
                className="text-gold font-bold text-[0.78rem] px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                {t.actionLabel}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-[#a8a392] transition-colors" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
