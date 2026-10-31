import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, ClipboardPaste, LayoutList, BellRing, Search, Wand2,
  CalendarDays, ListChecks, Flame, CheckCircle2, ShieldCheck, Wifi, ChevronRight,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { itemStatus, sortByDateTime, formatDateShort, CATEGORY_META, formatTime } from '../lib/engine';

const TICKER_ITEMS = ['18 → 2 NOTICES TO TRACK', 'WHATSAPP → CLEAN CARD IN 2 SEC', 'DEADLINES THAT COUNT DOWN', 'ONE TAP WEEKLY DIGEST', 'WORKS OFFLINE · ON-DEVICE AI'];

export default function Home() {
  const { items, openAdd, setDigestOpen } = useCampus();
  const navigate = useNavigate();

  const attention = items.filter(i => !i.done && itemStatus(i) === 'urgent').sort(sortByDateTime);
  const weekCount = items.filter(i => !i.done).length;
  const preview = [...items].filter(i => !i.done).sort(sortByDateTime).slice(0, 3);

  return (
    <div className="relative">
      {/* ================= HERO ================= */}
      <section className="relative pt-24 sm:pt-28 overflow-hidden">
        {/* background ornaments */}
        <div aria-hidden className="absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full border border-line/70" />
        <div aria-hidden className="absolute -top-10 right-24 w-40 h-40 rounded-full border border-dashed border-accent/30" />
        <div aria-hidden className="absolute top-40 -left-24 w-56 h-56 rounded-full bg-gold-soft/60 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-teal-soft/70 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center pt-6 pb-14 sm:pb-20">
          {/* left copy */}
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal-soft px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              <span className="font-mono text-[0.6rem] sm:text-[0.62rem] tracking-[0.14em] text-teal-deep font-semibold uppercase">Built for VIT students · works on any campus</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
              className="font-display font-black tracking-tight text-[2.55rem] sm:text-6xl xl:text-[4.2rem] leading-[0.98] mt-4">
              Every campus<br />notice.<br />
              <span className="italic text-teal relative inline-block">One calm pulse.
                <svg aria-hidden viewBox="0 0 320 14" className="absolute -bottom-2 left-0 w-full" fill="none"><path d="M3 10c60-6 130-8 314-3" stroke="#E8A33D" strokeWidth="5" strokeLinecap="round" opacity="0.9" /></svg>
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.22 }}
              className="text-[1.02rem] sm:text-lg text-muted leading-snug mt-5 max-w-lg">
              Paste any messy forward — WhatsApp, email, a poster caption. Campus Pulse turns it into a clean card with the <span className="font-semibold text-ink">date, time, venue & category</span> — then makes sure you never miss it.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
              className="flex flex-wrap items-center gap-3 mt-6">
              <button onClick={() => openAdd()}
                className="h-13 sm:h-14 px-6 sm:px-7 py-4 rounded-2xl bg-accent text-white font-black text-[0.95rem] sm:text-base hover:bg-accent-deep transition-all flex items-center gap-2 shadow-[0_14px_30px_-10px_rgba(228,87,46,0.65)]">
                <Wand2 size={19} strokeWidth={2.3} /> Paste a notice — try it
                <ArrowRight size={18} strokeWidth={2.6} />
              </button>
              <button onClick={() => setDigestOpen(true)}
                className="h-13 sm:h-14 px-5 sm:px-6 py-4 rounded-2xl border-2 border-teal/25 bg-card text-teal-deep font-bold text-[0.9rem] sm:text-[0.95rem] hover:border-teal hover:bg-teal-soft transition-all flex items-center gap-2">
                <Sparkles size={18} strokeWidth={2.2} /> This week, in 20 seconds
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.6 }}
              className="flex items-center gap-4 mt-6 font-mono text-[0.6rem] sm:text-[0.63rem] text-muted">
              <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-teal" />100% on-device AI</span>
              <span className="flex items-center gap-1.5"><Wifi size={13} className="text-teal" />Works offline</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-teal" />Free · no login</span>
            </motion.div>
          </div>

          {/* right: live product preview card */}
          <motion.div initial={{ opacity: 0, y: 30, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[26rem] lg:max-w-[29rem]">
            <div aria-hidden className="absolute -top-5 -right-3 sm:-right-6 rotate-3 bg-ink text-gold font-mono text-[0.55rem] tracking-[0.15em] px-3 py-1.5 rounded-lg shadow-lg z-10">LIVE PREVIEW — YOUR BOARD</div>
            <div className="paper-card rounded-3xl p-4 sm:p-5 hatch">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kicker">Today’s pulse</p>
                  <p className="font-display font-black text-lg leading-tight mt-0.5">{attention.length ? `${attention.length} urgent ${attention.length > 1 ? 'things' : 'thing'} today` : 'All clear today'}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-accent-soft flex items-center justify-center">
                  <Flame size={22} className="text-accent" strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {preview.map(item => {
                  const meta = CATEGORY_META[item.category];
                  const urgent = itemStatus(item) === 'urgent';
                  return (
                    <button key={item.id} onClick={() => navigate('/board')}
                      className="w-full flex items-center gap-2.5 bg-white border border-line/80 rounded-2xl px-3 py-2.5 text-left hover:border-teal/50 hover:-translate-y-0.5 transition-all shadow-sm">
                      <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.78rem] font-semibold leading-snug clamp-2">{item.title}</span>
                        <span className="block font-mono text-[0.55rem] text-muted mt-1">{formatDateShort(item.date).toUpperCase()}{item.time ? ` · ${formatTime(item.time)}` : ''} · {item.venue ? item.venue.split(',')[0].toUpperCase() : 'ONLINE'}</span>
                      </span>
                      {urgent && <Flame size={15} className="text-accent shrink-0" strokeWidth={2.4} />}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => navigate('/board')}
                className="w-full mt-3 h-10 rounded-xl border border-dashed border-teal/40 text-teal-deep font-bold text-[0.76rem] flex items-center justify-center gap-1.5 hover:bg-teal-soft/60 transition-all">
                Open my board — {weekCount} active notices <ChevronRight size={14} />
              </button>
            </div>
            {/* floating badges */}
            <div className="absolute -left-2 sm:-left-6 bottom-24 float-slow bg-card paper-card rounded-2xl px-3 py-2 hidden sm:flex items-center gap-2" style={{ '--float-rot': '-3deg', animationDelay: '0.8s' } as React.CSSProperties}>
              <ClipboardPaste size={15} className="text-accent" />
              <span className="font-mono text-[0.58rem] text-muted">fwdmsg.txt? <span className="text-teal-deep font-semibold">parsed ✓</span></span>
            </div>
            <div className="absolute -right-1 sm:-right-5 top-24 float-slow bg-ink rounded-2xl px-3 py-2 hidden sm:flex items-center gap-2" style={{ '--float-rot': '2.5deg' } as React.CSSProperties}>
              <BellRing size={14} className="text-gold" />
              <span className="font-mono text-[0.58rem] text-gold-soft">deadline tomorrow!</span>
            </div>
          </motion.div>
        </div>

        {/* ticker strip */}
        <div className="relative border-y border-ink/10 bg-ink text-paper py-2 overflow-hidden">
          <div className="marquee-track font-mono text-[0.62rem] tracking-[0.18em] text-[#d8d4c7]">
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <span key={i} className="mx-7"><span className="text-gold">◆</span> {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= THREE STEPS ================= */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <div className="relative order-2 lg:order-1">
          <div aria-hidden className="absolute inset-0 bg-gold-soft rounded-[2rem] rotate-[-1.5deg] scale-[0.98]" />
          <img src="/images/smart-add.png" alt="AI turning a messy phone notice into a tidy card" className="relative rounded-[2rem] border border-line object-cover w-full aspect-[4/3] lg:aspect-[5/4.6] shadow-xl" />
          <div aria-hidden className="stamp absolute -bottom-4 right-6 px-3 py-1.5 font-mono text-[0.62rem] font-bold tracking-[0.2em] bg-paper/95">PARSED → ORGANISED</div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="kicker">How it feels</p>
          <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.02] mt-2">From chaos to<br /><span className="italic text-accent">card</span> in seconds.</h2>
          <div className="mt-7 space-y-5">
            {[
              { n: '01', t: 'Paste the mess', d: 'A WhatsApp forward in capslock, an email with no subject, a poster caption with 9 emojis — all of it works.', icon: ClipboardPaste },
              { n: '02', t: 'AI does the detective work', d: 'Dates like “kal 9 AM”, times like “6:30 pm”, venues like “OAT”, even Hinglish. Title, priority, category — extracted and editable before you save.', icon: Wand2 },
              { n: '03', t: 'Live on your board', d: 'It lands in your list and calendar, starts counting down, and glows when it’s urgent. You just show up.', icon: LayoutList },
            ].map(s => (
              <div key={s.n} className="flex gap-4 items-start">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-card border border-line flex items-center justify-center relative">
                  <s.icon size={21} className="text-teal" strokeWidth={2} />
                  <span className="absolute -top-2 -left-2 font-mono text-[0.52rem] font-bold bg-ink text-gold-soft rounded-md px-1 py-0.5">{s.n}</span>
                </div>
                <div>
                  <p className="font-bold text-[0.98rem]">{s.t}</p>
                  <p className="text-[0.84rem] text-muted leading-snug mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/how-it-works" className="inline-flex items-center gap-1.5 mt-7 font-bold text-teal-deep text-[0.9rem] hover:gap-3 transition-all">
            See exactly how the AI parses <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      {/* ================= FEATURE DUO ================= */}
      <section className="relative border-t border-line/70">
        <img src="/images/campus-life.png" alt="Illustrated collage of campus life — fest, library, cricket, amphitheatre" className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.16]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-paper via-transparent to-paper" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <p className="kicker">One place. Full picture.</p>
          <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.02] mt-2">Stop archaeology-ing<br />your <span className="italic text-teal">group chats</span>.</h2>
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mt-10 max-w-4xl mx-auto text-left">
            {[
              { icon: Search, t: 'Searchable everything', d: 'Type “deadline”, “OAT” or “TCS” — instantly. Filter by 9 categories, or flip to calendar view.', tone: 'text-accent-deep bg-accent-soft' },
              { icon: Flame, t: 'Urgent / upcoming / expired', d: 'No colour-blind squinting. What needs you today literally glows. Yesterday’s noise gets swept away.', tone: 'text-[#8a6a12] bg-gold-soft' },
              { icon: Sparkles, t: 'The Sunday-night digest', d: 'One tap, and the whole week — exams, drives, dues, melas — is summarised like a friend who read everything.', tone: 'text-teal-deep bg-teal-soft' },
            ].map((f, i) => (
              <div key={i} className="paper-card rounded-2xl p-5 card-lift border-line">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.tone}`}><f.icon size={21} strokeWidth={2.1} /></div>
                <p className="font-bold text-[0.95rem] mt-3">{f.t}</p>
                <p className="text-[0.8rem] text-muted leading-snug mt-1">{f.d}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/board')}
            className="inline-flex items-center gap-2 mt-10 h-12 px-7 rounded-2xl bg-ink text-paper font-bold text-[0.92rem] hover:bg-teal-deep transition-colors">
            <ListChecks size={18} /> Take me to my board <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* ================= CTA BAND ================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="teal-panel rounded-3xl px-6 sm:px-12 py-10 sm:py-14 text-center text-[#eaf4ee] relative overflow-hidden">
          <div aria-hidden className="absolute -top-10 -left-10 w-48 h-48 rounded-full border border-white/10" />
          <div aria-hidden className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full border border-dashed border-gold/30" />
          <CalendarDays size={30} className="mx-auto text-gold" strokeWidth={1.8} />
          <h2 className="relative font-display font-black text-3xl sm:text-5xl leading-[1.02] mt-4">Your next deadline<br />is <span className="italic text-gold">somewhere</span> in that chat.</h2>
          <p className="relative text-[#b9d4cc] text-sm sm:text-base mt-3 max-w-md mx-auto">Paste it here instead. We’ll hold the date — you hold the calm.</p>
          <button onClick={() => openAdd()}
            className="relative inline-flex items-center gap-2 mt-6 h-13 px-8 py-4 rounded-2xl bg-gold text-ink font-black text-[0.95rem] hover:bg-[#f2b559] transition-colors shadow-[0_12px_28px_-10px_rgba(232,163,61,0.5)]">
            <Wand2 size={18} strokeWidth={2.4} /> Add my first notice
          </button>
        </div>
      </section>
    </div>
  );
}
