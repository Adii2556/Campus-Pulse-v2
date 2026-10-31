import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Search, List, CalendarDays, Plus, Sparkles, X, ArrowUpDown, Flame, Sunrise,
  History, LayoutGrid, Trash2, CheckCheck, Wand2, ChevronDown, BellRing,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import ItemCard from '../components/ItemCard';
import CalendarView from '../components/CalendarView';
import {
  CATEGORIES, CATEGORY_META, itemStatus, sortByDateTime, daysUntil, type Category,
} from '../lib/engine';

type View = 'list' | 'calendar';
type StatusFilter = 'all' | 'today' | 'week' | 'expired' | 'done';
type SortMode = 'date' | 'priority' | 'added';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'date', label: 'By date' },
  { id: 'priority', label: 'By priority' },
  { id: 'added', label: 'Recently added' },
];

export default function Board() {
  const { items, setAddOpen, setDigestOpen, toggleDone, clearExpired, showToast } = useCampus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<View>(() => (searchParams.get('view') === 'calendar' ? 'calendar' : 'list'));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortMode>('date');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    setSearchParams(view === 'calendar' ? { view: 'calendar' } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); document.getElementById('board-search')?.focus(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAddOpen(true); }
      else if (e.key.toLowerCase() === 'w') { e.preventDefault(); setDigestOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setAddOpen, setDigestOpen]);

  const filtered = useMemo(() => {
    let out = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(i =>
        [i.title, i.venue ?? '', i.raw, i.source, i.category].join(' ').toLowerCase().includes(q)
      );
    }
    if (category !== 'All') out = out.filter(i => i.category === category);
    switch (status) {
      case 'today': out = out.filter(i => !i.done && daysUntil(i.date) === 0); break;
      case 'week': out = out.filter(i => { const d = daysUntil(i.date); return !i.done && d !== null && d >= 0 && d <= 7; }); break;
      case 'expired': out = out.filter(i => !i.done && itemStatus(i) === 'expired'); break;
      case 'done': out = out.filter(i => i.done); break;
      default: break;
    }
    const priRank = { high: 0, medium: 1, low: 2 };
    if (sort === 'priority') out.sort((a, b) => priRank[a.priority] - priRank[b.priority] || sortByDateTime(a, b));
    else if (sort === 'added') out.sort((a, b) => b.addedAt - a.addedAt);
    else out.sort((a, b) => sortByDateTime(a, b));
    // pinned first, always
    out.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return out;
  }, [items, query, category, status, sort]);

  const urgentToday = items.filter(i => !i.done && daysUntil(i.date) === 0).sort(sortByDateTime);
  const reminderItems = items.filter(i => {
    const d = daysUntil(i.date);
    return !i.done && i.remind && itemStatus(i) !== 'expired' && d !== null && d >= 0 && d <= 3;
  });
  const expiredCount = items.filter(i => !i.done && itemStatus(i) === 'expired').length;
  const activeCount = items.filter(i => !i.done).length;
  const totalPinned = filtered.filter(i => i.pinned).length;

  const hasFilter = query || category !== 'All' || status !== 'all';

  const statusChip = (id: StatusFilter, label: string, icon: ReactNode, count?: number) => {
    const active = status === id;
    return (
      <button key={id} onClick={() => setStatus(active ? 'all' : id)}
        className={`flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full border text-[0.74rem] font-bold whitespace-nowrap transition-all
          ${active ? 'bg-ink text-paper border-ink shadow-md' : 'bg-card border-line text-muted hover:text-ink hover:border-faint'}`}>
        {icon}{label}
        {count !== undefined && count > 0 && (
          <span className={`min-w-5 h-5 px-1 rounded-full text-[0.58rem] font-black flex items-center justify-center ${active ? 'bg-gold text-ink' : 'bg-accent-soft text-accent-deep'}`}>{count}</span>
        )}
      </button>
    );
  };

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      {/* ===== page head ===== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker flex items-center gap-2"><LayoutGrid size={12} /> My Board</p>
            <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight mt-1.5">On your <span className="italic text-teal">plate</span>.</h1>
            <p className="text-[0.85rem] text-muted mt-1.5">{activeCount} active notice{activeCount === 1 ? '' : 's'}{urgentToday.length > 0 && <> · <button className="text-accent-deep font-bold hover:underline" onClick={() => setStatus('today')}>{urgentToday.length} need you today</button></>}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDigestOpen(true)}
              className="h-11 pl-3 pr-4 rounded-2xl bg-teal text-white font-bold text-[0.8rem] flex items-center gap-2 hover:bg-teal-deep transition-all shadow-[0_8px_20px_-8px_rgba(14,95,92,0.55)]">
              <Sparkles size={16} /><span className="hidden xs:inline">What do I need to know</span><span className="xs:hidden">Digest</span> this week?
            </button>
            <button onClick={() => setAddOpen(true)}
              className="h-11 w-11 sm:w-auto sm:px-4 rounded-2xl bg-accent text-white flex items-center justify-center gap-2 hover:bg-accent-deep transition-all shadow-[0_8px_20px_-8px_rgba(228,87,46,0.6)]" aria-label="Add notice">
              <Plus size={18} strokeWidth={2.8} /><span className="hidden sm:inline font-bold text-[0.8rem]">Smart Add</span>
            </button>
          </div>
        </div>

        {/* ===== NEEDS ATTENTION TODAY ===== */}
        {urgentToday.length > 0 && status !== 'done' && (
          <div className="mt-5 rounded-2xl border border-accent/35 bg-gradient-to-r from-accent-soft via-[#ffe9d9] to-gold-soft p-3 sm:p-4 flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-accent flex items-center justify-center pulse-glow">
              <Sunrise size={20} className="text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.62rem] tracking-[0.22em] text-accent-deep font-semibold uppercase">Needs you today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
              <ul className="mt-1.5 space-y-1">
                {urgentToday.slice(0, 3).map(i => (
                  <li key={i.id} className="flex items-center gap-2 text-[0.8rem] font-semibold leading-snug">
                    <Flame size={12} className="text-accent shrink-0" strokeWidth={2.6} />
                    <span className="truncate">{i.title}{i.time && <span className="text-muted font-medium"> · {i.time.replace(/^0/, '')}</span>}</span>
                    <button onClick={() => toggleDone(i.id)} title="Mark done"
                      className="ml-auto shrink-0 w-6 h-6 rounded-md border border-accent/40 flex items-center justify-center hover:bg-accent hover:text-white hover:border-accent transition-all" aria-label="Mark done">
                      <CheckCheck size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ===== watchlist reminders ===== */}
        {reminderItems.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2 text-[0.72rem] text-teal-deep font-semibold pl-1">
            <BellRing size={13} strokeWidth={2.4} />
            Watchlist: {reminderItems.length} reminder{reminderItems.length > 1 ? 's' : ''} armed for the next 3 days
            <span className="text-faint font-normal hidden sm:inline">— press <kbd className="font-mono bg-paper border border-line rounded px-1 text-[0.6rem]">W</kbd> for the digest</span>
          </div>
        )}

        {/* ===== toolbar ===== */}
        <div className="sticky top-16 sm:top-[4.5rem] z-30 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-paper/85 backdrop-blur-xl border-y border-line/60">
          <div className="flex flex-wrap items-center gap-2 max-w-7xl mx-auto">
            {/* search */}
            <div className="relative flex-1 min-w-[10.5rem]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input id="board-search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search deadlines, venues, exams… ( / )"
                className="field !h-11 !pl-9 !rounded-full !bg-card text-[0.85rem] w-full" aria-label="Search notices" />
              {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Clear search"><X size={15} /></button>}
            </div>

            {/* status chips */}
            <div className="flex gap-1.5 overflow-x-auto order-3 sm:order-2 w-full sm:w-auto pb-0.5 -mb-0.5">
              {statusChip('today', 'Today', <Flame size={13} strokeWidth={2.5} />, urgentToday.length)}
              {statusChip('week', 'This week', <Sunrise size={13} strokeWidth={2.5} />)}
              {statusChip('expired', 'Expired', <History size={13} strokeWidth={2.5} />, expiredCount)}
              {statusChip('done', 'Done', <CheckCheck size={13} strokeWidth={2.5} />, items.filter(i => i.done).length)}
            </div>

            {/* sort + view toggle */}
            <div className="flex items-center gap-1.5 order-2 sm:order-3 ml-auto">
              <div className="relative">
                <button onClick={() => setSortOpen(o => !o)} className="h-11 pl-3 pr-2 rounded-full border border-line bg-card flex items-center gap-1.5 text-[0.74rem] font-bold text-muted hover:text-ink transition-all">
                  <ArrowUpDown size={13} strokeWidth={2.5} /><span className="hidden sm:inline">{SORTS.find(s => s.id === sort)?.label}</span><ChevronDown size={13} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-20 paper-card rounded-2xl p-1.5 w-44 shadow-xl">
                      {SORTS.map(s => (
                        <button key={s.id} onClick={() => { setSort(s.id); setSortOpen(false); }}
                          className={`w-full text-left h-9 px-3 rounded-xl text-[0.8rem] font-semibold transition-colors ${sort === s.id ? 'bg-teal-soft text-teal-deep' : 'hover:bg-paper text-muted'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="h-11 rounded-full border border-line bg-card p-1 flex items-center">
                {([['list', List, 'List'], ['calendar', CalendarDays, 'Calendar']] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-label={`${label} view`}
                    className={`h-9 px-2.5 sm:px-3.5 rounded-full flex items-center gap-1.5 text-[0.74rem] font-bold transition-all ${view === v ? 'bg-ink text-paper shadow' : 'text-muted hover:text-ink'}`}>
                    <Icon size={15} strokeWidth={2.3} /><span className="hidden xs:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* category chips */}
          <div className="flex gap-1.5 overflow-x-auto pt-2 max-w-7xl mx-auto -mx-1 px-1 pb-0.5">
            <button onClick={() => setCategory('All')}
              className={`h-8 px-3.5 shrink-0 rounded-full text-[0.7rem] font-bold border transition-all ${category === 'All' ? 'bg-teal text-white border-teal' : 'bg-card border-line text-muted hover:text-ink'}`}>
              All categories
            </button>
            {CATEGORIES.map(c => {
              const meta = CATEGORY_META[c];
              const active = category === c;
              return (
                <button key={c} onClick={() => setCategory(active ? 'All' : c)}
                  className={`h-8 px-3.5 shrink-0 rounded-full text-[0.7rem] font-bold border transition-all flex items-center gap-1.5 ${active ? 'text-white border-transparent' : 'bg-card border-line text-muted hover:text-ink'}`}
                  style={active ? { background: meta.color } : {}}>
                  <span className="w-2 h-2 rounded-full" style={{ background: active ? '#fff' : meta.color }} />{c}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== results bar ===== */}
        <div className="flex items-center justify-between mt-4 px-0.5">
          <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">
            {view === 'list' ? `Showing ${filtered.length} of ${items.length}` : `Calendar · ${filtered.length} item${filtered.length === 1 ? '' : 's'}`}
            {totalPinned > 0 && <span className="text-gold"> · {totalPinned} pinned</span>}
            {hasFilter && <button onClick={() => { setQuery(''); setCategory('All'); setStatus('all'); }} className="ml-2 text-teal-deep underline underline-offset-2 normal-case tracking-normal font-sans font-bold">Clear filters</button>}
          </p>
          {expiredCount > 0 && (
            <button onClick={clearExpired} className="flex items-center gap-1.5 font-mono text-[0.6rem] tracking-wide text-faint hover:text-accent-deep transition-colors uppercase">
              <Trash2 size={11} /> Clear {expiredCount} expired
            </button>
          )}
        </div>

        {/* ===== content ===== */}
        <div className="mt-2.5">
          {view === 'calendar' ? (
            <CalendarView items={filtered} onItemClick={i => { setView('list'); setQuery(i.title.slice(0, 24)); }} />
          ) : (
            <>
              {filtered.length === 0 ? (
                <div className="paper-card rounded-3xl py-14 px-6 text-center mt-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-soft flex items-center justify-center">
                    {hasFilter ? <Search size={26} className="text-teal" /> : <Wand2 size={26} className="text-teal" />}
                  </div>
                  <h3 className="font-display font-black text-xl mt-4">{hasFilter ? 'Nothing matches that' : 'Your board is blissfully empty'}</h3>
                  <p className="text-[0.85rem] text-muted mt-1.5 max-w-sm mx-auto">{hasFilter ? 'Loosen the filters — or widen the search.' : 'Paste your first WhatsApp forward and watch it become a card.'}</p>
                  <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 mt-5 h-11 px-6 rounded-2xl bg-accent text-white font-bold text-[0.85rem] hover:bg-accent-deep transition-all">
                    <Plus size={16} strokeWidth={2.8} /> Add a notice with AI
                  </button>
                </div>
              ) : (
                <div className="grid gap-2.5 md:grid-cols-2 items-start">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        {/* keyboard hints */}
        <div className="hidden md:flex items-center justify-center gap-4 mt-8 font-mono text-[0.6rem] text-faint">
          <span><kbd className="border border-line bg-card rounded px-1.5 py-0.5">/</kbd> search</span>
          <span><kbd className="border border-line bg-card rounded px-1.5 py-0.5">A</kbd> add notice</span>
          <span><kbd className="border border-line bg-card rounded px-1.5 py-0.5">W</kbd> weekly digest</span>
          <span><kbd className="border border-line bg-card rounded px-1.5 py-0.5">Esc</kbd> close panels</span>
        </div>
      </div>

      {/* floating add button (mobile) */}
      <button onClick={() => setAddOpen(true)} aria-label="Add notice"
        className="sm:hidden fixed bottom-6 right-5 z-40 w-[3.75rem] h-[3.75rem] rounded-2xl bg-accent text-white shadow-[0_14px_30px_-8px_rgba(228,87,46,0.7)] flex items-center justify-center active:scale-95 transition-transform">
        <Plus size={26} strokeWidth={2.6} />
      </button>
    </div>
  );
}
