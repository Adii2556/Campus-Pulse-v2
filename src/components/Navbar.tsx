import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Sparkles, Plus, Bell } from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { daysUntil, itemStatus } from '../lib/engine';

function PulseMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#E4572E" />
      <path className="ecg-line" d="M10 36h10l5-14 6 22 6-28 5 20h12" fill="none" stroke="#FFF7EA" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar() {
  const { items, setAddOpen, setDigestOpen } = useCampus();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const tickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const urgentToday = items.filter(i => !i.done && daysUntil(i.date) === 0).length;
  const active = items.filter(i => !i.done && itemStatus(i) !== 'expired');
  const ticker = active.slice(0, 8);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `relative px-3 py-2 text-[0.85rem] font-medium transition-colors ${isActive ? 'text-teal' : 'text-muted hover:text-ink'}`;

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* notice ticker */}
      {ticker.length > 0 && (
        <div className="h-8 bg-ink text-[#f5f2e9] flex items-center overflow-hidden">
          <div className="flex items-center gap-2 pl-3 sm:pl-5 shrink-0 border-r border-white/15 pr-3 h-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-gold whitespace-nowrap">Live notices</span>
          </div>
          <div ref={tickRef} className="overflow-hidden flex-1">
            <div className="marquee-track flex whitespace-nowrap">
              {[...ticker, ...ticker].map((i, idx) => (
                <button
                  key={`${i.id}-${idx}`}
                  onClick={() => navigate('/board')}
                  className="mx-6 font-mono text-[0.66rem] text-[#d8d4c7] hover:text-white transition-colors"
                >
                  <span className="text-gold">{daysUntil(i.date) === 0 ? 'TODAY' : `IN ${daysUntil(i.date)}D`}</span>
                  {' · '}{i.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* main bar */}
      <div className={`transition-all duration-300 border-b ${scrolled ? 'bg-paper/85 backdrop-blur-xl border-line shadow-[0_8px_30px_-18px_rgba(32,29,23,0.4)]' : 'bg-transparent border-transparent'}`}>
        <div className="mx-auto max-w-7xl px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <PulseMark size={38} />
            <span className="leading-none">
              <span className="block font-display font-black text-[1.18rem] tracking-tight group-hover:text-teal transition-colors">Campus Pulse</span>
              <span className="hidden sm:block font-mono text-[0.55rem] tracking-[0.22em] uppercase text-muted mt-0.5">Vit Chennai · Knowledge Park</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLink}>Home</NavLink>
            <NavLink to="/board" className={navLink}>
              Board
              {urgentToday > 0 && <span className="absolute -top-0.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[0.55rem] font-bold flex items-center justify-center">{urgentToday}</span>}
            </NavLink>
            <NavLink to="/how-it-works" className={navLink}>How it works</NavLink>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setDigestOpen(true)}
              title="What do I need to know this week?"
              className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-full border border-line bg-card text-teal font-semibold text-[0.78rem] hover:border-teal hover:bg-teal-soft transition-all"
            >
              <Sparkles size={15} strokeWidth={2.4} />
              <span className="hidden sm:inline">This Week</span>
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-full bg-accent text-white font-semibold text-[0.78rem] hover:bg-accent-deep transition-all shadow-[0_6px_16px_-6px_rgba(228,87,46,0.6)]"
            >
              <Plus size={15} strokeWidth={2.8} />
              <span className="hidden sm:inline">Add notice</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button onClick={() => setOpen(o => !o)} className="md:hidden w-9 h-9 rounded-full border border-line bg-card flex items-center justify-center" aria-label="Menu">
              {open ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {/* mobile menu */}
        {open && (
          <div className="md:hidden absolute top-full inset-x-0 bg-paper/97 backdrop-blur-xl border-b border-line px-4 pb-4 pt-1 shadow-xl">
            {[
              { to: '/', label: 'Home', icon: <Bell size={16} /> },
              { to: '/board', label: `Board ${urgentToday ? `· ${urgentToday} today` : ''}`, icon: <PulseMark size={16} /> },
              { to: '/how-it-works', label: 'How it works', icon: <Sparkles size={16} /> },
            ].map(l => (
              <button key={l.to} onClick={() => { setOpen(false); navigate(l.to); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-[0.95rem] hover:bg-gold-soft transition-colors text-left">
                <span className="text-teal">{l.icon}</span>{l.label}
              </button>
            ))}
            <button onClick={() => { setOpen(false); setAddOpen(true); }}
              className="w-full flex items-center justify-center gap-2 mt-2 h-11 rounded-xl bg-accent text-white font-bold">
              <Plus size={17} strokeWidth={2.8} /> Add a notice with AI
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
