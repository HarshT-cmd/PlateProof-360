import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, ChefHat, Search } from 'lucide-react';
import { OrderLookupModal } from './OrderLookupModal';
import { useSafetyContext } from '../context';

export const Navbar: React.FC = () => {
  const { backendStatus, refreshBackendStatus } = useSafetyContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'inspection' | 'how-it-works' | 'standards' | 'institutional'>('hero');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      const institutionalEl = document.getElementById('institutional');
      const standardsEl = document.getElementById('standards');
      const howItWorksEl = document.getElementById('how-it-works');
      const inspectionEl = document.getElementById('dish-inspection');

      if (institutionalEl && scrollPos >= institutionalEl.offsetTop) {
        setActiveSection('institutional');
      } else if (standardsEl && scrollPos >= standardsEl.offsetTop) {
        setActiveSection('standards');
      } else if (howItWorksEl && scrollPos >= howItWorksEl.offsetTop) {
        setActiveSection('how-it-works');
      } else if (inspectionEl && scrollPos >= inspectionEl.offsetTop) {
        setActiveSection('inspection');
      } else {
        setActiveSection('hero');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#22241F]/10 transition-all font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Brand Identity */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl border border-[#B99A60]/40 bg-[#183C2B] flex items-center justify-center text-[#B99A60] shadow-xs group-hover:bg-[#24523C] transition-colors">
                <ShieldCheck className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl tracking-tight text-[#183C2B] font-semibold leading-none">
                  PlateProof<span className="text-[#B99A60] font-normal italic ml-1">360</span>
                </span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#55584F] mt-1 font-medium">
                  Trust beyond the plate
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 text-sm">
              <Link
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`transition-all py-1 border-b-2 text-xs font-semibold uppercase tracking-wider ${
                  isHome && activeSection === 'hero'
                    ? 'text-[#183C2B] border-[#183C2B]'
                    : 'text-[#55584F] hover:text-[#183C2B] border-transparent'
                }`}
              >
                Overview
              </Link>

              <a
                href="/#dish-inspection"
                className={`transition-all py-1 border-b-2 text-xs font-semibold uppercase tracking-wider ${
                  isHome && activeSection === 'inspection'
                    ? 'text-[#183C2B] border-[#183C2B]'
                    : 'text-[#55584F] hover:text-[#183C2B] border-transparent'
                }`}
              >
                Dish Telemetry
              </a>

              <a
                href="/#how-it-works"
                className={`transition-all py-1 border-b-2 text-xs font-semibold uppercase tracking-wider ${
                  isHome && activeSection === 'how-it-works'
                    ? 'text-[#183C2B] border-[#183C2B]'
                    : 'text-[#55584F] hover:text-[#183C2B] border-transparent'
                }`}
              >
                How It Works
              </a>

              <a
                href="/#standards"
                className={`transition-all py-1 border-b-2 text-xs font-semibold uppercase tracking-wider ${
                  isHome && activeSection === 'standards'
                    ? 'text-[#183C2B] border-[#183C2B]'
                    : 'text-[#55584F] hover:text-[#183C2B] border-transparent'
                }`}
              >
                Safety Standards
              </a>

              <a
                href="/#institutional"
                className={`transition-all py-1 border-b-2 text-xs font-semibold uppercase tracking-wider ${
                  isHome && activeSection === 'institutional'
                    ? 'text-[#183C2B] border-[#183C2B]'
                    : 'text-[#55584F] hover:text-[#183C2B] border-transparent'
                }`}
              >
                Institutional Scale
              </a>
            </nav>

            {/* Action Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Backend & Database Status Badge */}
              <div
                title={`Express API Server on port 3001. Database: ${backendStatus.postgresConnected ? 'PostgreSQL 18 Connected' : 'Resilient In-Memory Fallback'}. Click to refresh.`}
                onClick={() => refreshBackendStatus()}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all cursor-pointer ${
                  backendStatus.isOnline
                    ? 'border-emerald-700/20 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/70'
                    : 'border-amber-700/20 bg-amber-50 text-amber-950 hover:bg-amber-100/70'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold tracking-tight">API :3001</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/80 border border-black/5 text-[#183C2B]">
                  {backendStatus.postgresConnected ? 'PostgreSQL' : 'Store Sync'}
                </span>
              </div>

              <button
                onClick={() => setIsLookupOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border border-[#22241F]/15 bg-[#FAF7F0] text-[#183C2B] hover:bg-stone-200/60 transition-all cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-[#808477]" />
                <span>Verify Order</span>
              </button>

              <Link
                to="/dashboard"
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all shadow-xs ${
                  isDashboard
                    ? 'bg-[#343B27] text-white'
                    : 'bg-[#183C2B] text-white hover:bg-[#24523C]'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5 text-[#B99A60]" />
                <span>Operations Portal</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsLookupOpen(true)}
                className="p-2 rounded-lg border border-[#22241F]/15 text-[#183C2B] hover:bg-stone-100"
                aria-label="Search order"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg border border-[#22241F]/15 text-[#183C2B] hover:bg-stone-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#22241F]/15 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2 text-sm">
              <Link
                to="/"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-lg text-[#183C2B] font-medium hover:bg-stone-100"
              >
                Overview
              </Link>
              <a
                href="/#dish-inspection"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#55584F] hover:bg-stone-100"
              >
                Dish Telemetry
              </a>
              <a
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#55584F] hover:bg-stone-100"
              >
                How It Works
              </a>
              <a
                href="/#standards"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#55584F] hover:bg-stone-100"
              >
                Safety Standards
              </a>
              <a
                href="/#institutional"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#55584F] hover:bg-stone-100"
              >
                Institutional Scale
              </a>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsLookupOpen(true);
                  }}
                  className="px-3 py-2.5 rounded-lg bg-[#FAF7F0] border border-[#22241F]/15 text-[#183C2B] font-semibold text-xs uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Verify Order Record</span>
                  <Search className="w-4 h-4 text-[#808477]" />
                </button>

                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg bg-[#183C2B] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Kitchen Operations Portal</span>
                  <ChefHat className="w-4 h-4 text-[#B99A60]" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <OrderLookupModal isOpen={isLookupOpen} onClose={() => setIsLookupOpen(false)} />
    </>
  );
};
