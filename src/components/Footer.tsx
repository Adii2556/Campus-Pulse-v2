import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-ink text-[#c9c5b6] mt-4">
      <div className="h-1 w-full bg-gradient-to-r from-accent via-gold to-teal" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 sm:py-12 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <svg width="30" height="30" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#E4572E" /><path d="M10 36h10l5-14 6 22 6-28 5 20h12" fill="none" stroke="#FFF7EA" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-display font-black text-xl text-[#f5f2e9]">Campus Pulse</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed max-w-xs">One calm place for every WhatsApp forward, notice-board poster and email — parsed, organised and never missed.</p>
        </div>
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-gold mb-2.5">Navigate</p>
          <ul className="space-y-1.5 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link to="/board" className="hover:text-white transition-colors">My Board</Link></li>
            <li><Link to="/how-it-works" className="hover:text-white transition-colors">How the AI works</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-gold mb-2.5">The stack</p>
          <ul className="space-y-1.5 text-sm">
            <li>On-device NLP parser</li>
            <li>React + TypeScript + Tailwind</li>
            <li>Works fully offline · your data stays yours</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-11 flex items-center justify-between font-mono text-[0.62rem] text-[#8f8b7d]">
          <span>CAMPUS PULSE © 2026</span>
          <span className="flex items-center gap-1.5">Built with <Heart size={11} className="text-accent fill-accent" /> for every student on campus</span>
        </div>
      </div>
    </footer>
  );
}
