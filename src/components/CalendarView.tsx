import { useMemo, useState } from 'react';
import {
  addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday,
  startOfMonth, startOfWeek, startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, Sparkles } from 'lucide-react';
import {
  CATEGORY_META, formatTime, itemStatus, sortByDateTime, toISO, timeToMinutes, type CampusItem,
} from '../lib/engine';

export default function CalendarView({
  items,
  onItemClick,
}: {
  items: CampusItem[];
  onItemClick?: (item: CampusItem) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));

  const byDate = useMemo(() => {
    const map = new Map<string, CampusItem[]>();
    for (const item of items) {
      if (!item.date) continue;
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    }
    for (const list of map.values()) list.sort(sortByDateTime);
    return map;
  }, [items]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [cursor]);

  const selectedKey = toISO(selected);
  const selectedItems = byDate.get(selectedKey) || [];

  return (
    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4">
      {/* month grid */}
      <div className="paper-card rounded-2xl p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-lg sm:text-xl">{format(cursor, 'MMMM yyyy')}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor(c => addMonths(c, -1))} className="p-2 rounded-lg hover:bg-paper text-muted transition-colors" aria-label="Previous month"><ChevronLeft size={18} /></button>
            <button onClick={() => { const n = new Date(); setCursor(startOfMonth(n)); setSelected(startOfDay(n)); }}
              className="h-8 px-3 rounded-lg border border-line text-[0.72rem] font-bold hover:border-teal hover:text-teal transition-all">Today</button>
            <button onClick={() => setCursor(c => addMonths(c, 1))} className="p-2 rounded-lg hover:bg-paper text-muted transition-colors" aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center font-mono text-[0.6rem] tracking-[0.18em] text-faint uppercase py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const key = toISO(day);
            const dayItems = byDate.get(key) || [];
            const inMonth = isSameMonth(day, cursor);
            const active = isSameDay(day, selected);
            const today = isToday(day);
            const urgent = dayItems.some(i => itemStatus(i) === 'urgent' && !i.done);
            return (
              <button
                key={key}
                onClick={() => setSelected(startOfDay(day))}
                className={`relative h-16 sm:h-20 lg:h-[4.7rem] xl:h-20 rounded-xl border p-1 sm:p-1.5 flex flex-col items-start text-left transition-all overflow-hidden
                  ${active ? 'border-teal ring-2 ring-teal/30 bg-teal-soft/50' : today ? 'border-accent/50 bg-accent-soft/40' : 'border-line/70 bg-white/60 hover:border-teal/50'}
                  ${inMonth ? '' : 'opacity-35'}`}
                aria-label={`${format(day, 'd MMMM')} — ${dayItems.length} items`}
              >
                <span className={`font-mono text-[0.68rem] leading-none ${today ? 'text-accent-deep font-bold' : active ? 'text-teal-deep font-bold' : 'text-muted'}`}>
                  {format(day, 'd')}
                </span>
                <span className="flex flex-wrap gap-0.5 mt-auto w-full pb-0.5">
                  {dayItems.slice(0, 4).map((item, i) => (
                    <span key={item.id + i} className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_META[item.category].color, opacity: item.done ? 0.3 : 1 }} />
                  ))}
                  {dayItems.length > 4 && <span className="font-mono text-[0.5rem] text-faint leading-none">+{dayItems.length - 4}</span>}
                </span>
                {urgent && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent pulse-glow" />}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-line/70">
          {Object.entries(CATEGORY_META).slice(0, 6).map(([cat, meta]) => (
            <span key={cat} className="flex items-center gap-1.5 text-[0.6rem] text-muted">
              <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />{cat}
            </span>
          ))}
        </div>
      </div>

      {/* selected day agenda */}
      <div className="paper-card rounded-2xl p-4 sm:p-5 flex flex-col max-h-[34rem]">
        <div className="flex items-baseline justify-between border-b border-line pb-3">
          <div>
            <p className="kicker">{format(selected, 'EEEE')}</p>
            <h3 className="font-display font-black text-xl leading-tight mt-0.5">{format(selected, 'd MMMM yyyy')}</h3>
          </div>
          <span className="font-mono text-[0.68rem] text-muted bg-paper border border-line rounded-full px-2.5 py-1">{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-y-auto -mr-1 pr-1 pt-3 space-y-2 flex-1">
          {selectedItems.length === 0 ? (
            <div className="text-center py-10">
              <Sparkles size={26} className="mx-auto text-gold mb-2" />
              <p className="font-semibold text-sm">A totally free day</p>
              <p className="text-[0.75rem] text-muted mt-1 max-w-[16rem] mx-auto">Nothing on the books. Maybe finally finish that NPTEL course.</p>
            </div>
          ) : (
            selectedItems.map(item => {
              const meta = CATEGORY_META[item.category];
              return (
                <button key={item.id} onClick={() => onItemClick?.(item)}
                  className="w-full text-left flex gap-2.5 items-start rounded-xl border border-line/80 bg-white/70 hover:border-teal/50 hover:bg-teal-soft/30 transition-all p-2.5 group">
                  <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: meta.color }} />
                  <span className="min-w-0">
                    <span className={`block text-[0.8rem] font-semibold leading-snug ${item.done ? 'line-through text-muted' : ''}`}>{item.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[0.65rem] text-muted">
                      {item.time && <span className="flex items-center gap-1"><Clock size={10} />{formatTime(item.time)}</span>}
                      {item.venue && <span className="flex items-center gap-1 truncate max-w-[9.5rem]"><MapPin size={10} />{item.venue}</span>}
                      <span className="font-mono text-[0.55rem] px-1.5 py-0.5 rounded" style={{ background: meta.soft, color: meta.text }}>{item.category.toUpperCase()}</span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
