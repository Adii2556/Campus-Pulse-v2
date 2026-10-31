import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CampusProvider } from './context/CampusContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toasts from './components/Toasts';
import Onboarding from './components/Onboarding';
import AddNoticeModal from './components/AddNoticeModal';
import DigestModal from './components/DigestModal';
import Home from './pages/Home';
import Board from './pages/Board';
import HowItWorks from './pages/HowItWorks';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <CampusProvider>
      <HashRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-paper text-ink font-sans antialiased">
          <div className="noise-overlay" aria-hidden />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/board" element={<Board />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
          {/* global overlays */}
          <AddNoticeModal />
          <DigestModal />
          <Onboarding />
          <Toasts />
        </div>
      </HashRouter>
    </CampusProvider>
  );
}
