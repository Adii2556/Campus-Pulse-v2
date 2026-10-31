import {
  BookOpen, FilePen, PencilRuler, Sparkles, Users, Trophy, BedDouble, BriefcaseBusiness, Wallet, Megaphone,
  Check, Pin, Bell, BellRing, Trash2, CalendarDays, MapPin, Clock, ChevronDown, Flame, RotateCcw, type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  CATEGORY_META, countdownLabel, formatDateShort, itemStatus, timeToMinutes,
  weekdayShort, formatTime, type CampusItem, type Category,
} from '../lib/engine';
import { useCampus } from '../context/CampusContext';

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Academic: BookOpen, Exams: FilePen, Assignment: PencilRuler, Event: Sparkles, Clubs: Users,
  Sports: Trophy, Hostel: BedDouble, Placement: BriefcaseBusiness, Fee: Wallet, General: Megaphone,
};

const SCOOP: Record<string, string> = {
  urgent: 'bg-accent-soft text-accent-deep border-accent/30',
  upcoming: 'bg-teal-soft text-teal-deep border-teal/25',
  expired: 'bg-[#eeede6] text-muted border-line',
};

export default function ItemCard({ item, index = 0 }: { item: CampusItem; index?: number }) {
  const { toggleDone, togglePin, toggleRemind, deleteItem } = useCampus();
  const [showRaw, setShowRaw] = useState(false);
  const meta = CATEGORY_META[item.category];
  const Icon = CATEGORY_ICONS[item.category];
  const status = itemStatus(item);
  const dToday = new Date();
  const isToday = item.date === `${dToday.getFullYear()}-${String(dToday.getMonth() + 1).padStart(2, '0')}-${String(dToday.getDate()).padStart(2, '0')}`;
  const dayNum = item.date.slice(8, 10);
  const done = item.done;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className={`group relative paper-card rounded-2xl overflow-hidden card-lift ${done ? 'opacity-70' : ''} ${status === 'urgent' && !done ? 'ring-1 ring-accent/50' : ''}`}
      style={{ borderLeft: `4px solid ${done ? '#c9c5b6' : meta.color}` }}
    >
      {status === 'urgent' && !done && (
        <div className="absolute top-0 right-0 bg-accent text-white font-mono text-[0.56rem] tracking-[0.18em] font-semibold pl-2.5 pr-3 py-1 rounded-bl-xl flex items-center gap-1 z-10">
          <Flame size={10} strokeWidth={2.5} /> TODAY
        </div>
      )}

      <div className="flex">
        {/* date rail */}
        <div className={`w-[4.4rem] shrink-0 flex flex-col items-center justify-center py-3 border-r border-line/70 ${isToday && !done ? 'bg-accent-soft/60' : 'bg-paper/60'}`}>
          <span className="font-mono text-[0.56rem] tracking-[0.2em] text-muted">{weekdayShort(item.date)}</span>
          <span className={`font-display font-black text-[1.65rem] leading-none mt-0.5 ${isToday && !done ? 'text-accent-deep' : 'text-ink'}`}>{dayNum}</span>
          <span className="font-mono text-[0.55rem] text-faint uppercase mt-0.5">{formatDateShort(item.date).split(' ')[1]}</span>
          {item.pinned && <Pin size={12} className="text-gold fill-gold mt-1.5 rotate-45" />}
        </div>

        {/* body */}
        <div className="flex-1 min-w-0 p-3 sm:p-3.5">
          <div className="flex items-start gap-2">
            <button
              onClick={() => toggleDone(item.id)}
              aria-label={done ? 'Mark as not done' : 'Mark as done'}
              className={`mt-0.5 w-[1.35rem] h-[1.35rem] shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${done ? 'bg-teal border-teal' : 'border-[#cfcaba] hover:border-teal bg-white'}`}
            >
              {done && <Check size={13} strokeWidth={3.4} className="text-white" />}
            </button>
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-[0.88rem] sm:text-[0.93rem] leading-snug ${done ? 'line-through decoration-2 decoration-muted/60 text-muted' : ''}`}>
                {item.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[0.68rem] text-muted">
                {item.time && <span className="flex items-center gap-1 font-medium text-ink/80"><Clock size={11} strokeWidth={2.4} />{formatTime(item.time)}</span>}
                {item.venue && <span className="flex items-center gap-1 max-w-[12rem] truncate"><MapPin size={11} strokeWidth={2.4} className="shrink-0" />{item.venue}</span>}
                <span className="hidden sm:inline text-faint">·</span>
                <span className="hidden sm:inline max-w-[11rem] truncate text-faint">{item.source}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 h-5.5 pl-1 pr-1.5 rounded-md text-[0.6rem] font-bold tracking-wide" style={{ background: meta.soft, color: meta.text }}>
                  <Icon size={10.5} strokeWidth={2.6} />{item.category.toUpperCase()}
                </span>
                <span className={`inline-flex items-center gap-1 h-5.5 px-1.5 rounded-md border text-[0.6rem] font-bold ${SCOOP[status]}`}>
                  {status === 'urgent' ? 'URGENT' : status === 'expired' ? 'EXPIRED' : countdownLabel(item).toUpperCase().replace('IN ', 'IN ')}
                </span>
                {item.priority === 'high' && (
                  <span className="inline-flex items-center gap-0.5 h-5.5 px-1.5 rounded-md bg-[#f9e0d8] text-accent-deep text-[0.6rem] font-bold"><Flame size={10} strokeWidth={3} />HIGH</span>
                )}
              </div>

              {/* original raw text toggle */}
              <button onClick={() => setShowRaw(v => !v)}
                className="flex items-center gap-1 mt-1.5 font-mono text-[0.56rem] tracking-wide text-faint hover:text-teal transition-colors">
                <ChevronDown size={11} className={`transition-transform duration-200 ${showRaw ? 'rotate-180' : ''}`} />
                {showRaw ? 'HIDE ORIGINAL TEXT' : 'ORIGINAL TEXT (AI PARSED)'}
              </button>
              {showRaw && (
                <p className="mt-1.5 text-[0.7rem] leading-snug text-muted bg-paper/80 border border-line/80 rounded-lg px-2.5 py-2 italic clamp-3">“{item.raw}”</p>
              )}
            </div>

            {/* action column */}
            <div className="flex flex-col items-center gap-1 shrink-0 self-start">
              <button onClick={() => togglePin(item.id)} title={item.pinned ? 'Unpin' : 'Pin to top'} aria-pressed={item.pinned}
                className={`p-1.5 rounded-lg transition-all ${item.pinned ? 'text-gold bg-gold-soft' : 'text-faint hover:text-gold hover:bg-gold-soft'}`}>
                <Pin size={15} strokeWidth={2.2} className={item.pinned ? 'fill-gold' : ''} />
              </button>
              <button onClick={() => toggleRemind(item.id)} title={item.remind ? 'Reminder on' : 'Remind me'} aria-pressed={item.remind}
                className={`p-1.5 rounded-lg transition-all ${item.remind ? 'text-teal bg-teal-soft' : 'text-faint hover:text-teal hover:bg-teal-soft'}`}>
                {item.remind ? <BellRing size={15} strokeWidth={2.2} /> : <Bell size={15} strokeWidth={2.2} />}
              </button>
              <button onClick={() => deleteItem(item.id)} title="Delete card"
                className="p-1.5 rounded-lg text-faint hover:text-accent-deep hover:bg-accent-soft transition-all">
                <Trash2 size={15} strokeWidth={2.2} />
              </button>
              {done && (
                <button onClick={() => toggleDone(item.id)} title="Restore" className="p-1.5 rounded-lg text-faint hover:text-teal hover:bg-teal-soft transition-all">
                  <RotateCcw size={14} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
