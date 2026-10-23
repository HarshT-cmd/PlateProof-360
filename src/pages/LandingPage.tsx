import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Thermometer,
  ArrowRight,
  ShieldCheck,
  ChefHat,
  AlertCircle,
  Building2,
  FileCheck2,
  Search,
  Award,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { InteractiveDishExplorer } from '../components/InteractiveDishExplorer';

export const LandingPage: React.FC = () => {
  const [orderQuery, setOrderQuery] = useState('');
  const navigate = useNavigate();

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderQuery.trim().toLowerCase().replace(/^(order-|ord-)/, '');
    if (!clean) return;
    navigate(`/order/order-${clean}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1D1F1A] font-sans selection:bg-[#B99A60]/30 selection:text-[#183C2B]">
      
      {/* Hero Section */}
      <section className="pt-14 pb-16 md:pt-20 md:pb-24 border-b border-[#22241F]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#22241F]/15 text-[#183C2B] text-xs font-semibold uppercase tracking-wider shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Enterprise Culinary Safety &amp; Traceability Platform</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-[#123524] tracking-tight font-semibold leading-[1.08]">
              Verified food safety, <br />
              <span className="italic font-normal text-[#B99A60]">proven on every plate.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#55584F] max-w-2xl mx-auto leading-relaxed">
              PlateProof 360 streams calibrated core cooking temperatures, declared allergen protocols, and verified agricultural origin data directly to diner smartphones upon scanning an order QR code.
            </p>

            {/* Quick Order Lookup Bar */}
            <div className="pt-2 max-w-lg mx-auto">
              <form onSubmit={handleHeroSearch} className="flex gap-2 p-1.5 bg-white border border-[#22241F]/20 rounded-2xl shadow-sm focus-within:border-[#183C2B]">
                <div className="relative flex-1 flex items-center pl-3">
                  <Search className="w-4 h-4 text-[#808477] shrink-0" />
                  <input
                    type="text"
                    placeholder="Enter Order # (e.g. 1042, 1043, 1044)..."
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    className="w-full pl-2.5 pr-2 py-2 text-xs sm:text-sm bg-transparent border-0 focus:outline-none text-[#183C2B] placeholder:text-[#808477]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!orderQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#183C2B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#24523C] disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B99A60]" />
                </button>
              </form>

              {/* Sample Quick-Picks */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-[#55584F]">
                <span className="text-[11px] font-medium text-[#808477]">Or explore live sample:</span>
                <Link
                  to="/order/order-1042"
                  className="px-2.5 py-1 rounded-md bg-stone-200/70 hover:bg-[#183C2B] hover:text-white transition-colors text-[11px] font-semibold text-[#183C2B]"
                >
                  Paneer Tikka (#1042)
                </Link>
                <Link
                  to="/order/order-1043"
                  className="px-2.5 py-1 rounded-md bg-stone-200/70 hover:bg-[#183C2B] hover:text-white transition-colors text-[11px] font-semibold text-[#183C2B]"
                >
                  Dal Bukhara (#1043)
                </Link>
                <Link
                  to="/order/order-1044"
                  className="px-2.5 py-1 rounded-md bg-stone-200/70 hover:bg-[#183C2B] hover:text-white transition-colors text-[11px] font-semibold text-[#183C2B]"
                >
                  Tandoori Murgh (#1044)
                </Link>
              </div>
            </div>

            {/* 3 Core Verification Pillars */}
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="bg-white p-5 rounded-2xl border border-[#22241F]/10 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-stone-100 text-[#183C2B] flex items-center justify-center shrink-0 border border-[#22241F]/10">
                  <Thermometer className="w-5 h-5 text-[#B99A60]" />
                </div>
                <div>
                  <strong className="block text-sm text-[#183C2B] font-semibold">82.4°C Core Heat</strong>
                  <span className="text-xs text-[#55584F]">Microbial safety threshold passed</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#22241F]/10 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-stone-100 text-[#183C2B] flex items-center justify-center shrink-0 border border-[#22241F]/10">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <strong className="block text-sm text-[#183C2B] font-semibold">Segregated Allergens</strong>
                  <span className="text-xs text-[#55584F]">Dedicated cookware &amp; utensils</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#22241F]/10 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-stone-100 text-[#183C2B] flex items-center justify-center shrink-0 border border-[#22241F]/10">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                </div>
                <div>
                  <strong className="block text-sm text-[#183C2B] font-semibold">100% Farm Origin</strong>
                  <span className="text-xs text-[#55584F]">Single-lot pure dairy &amp; produce</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Interactive Dish Explorer */}
      <InteractiveDishExplorer />

      {/* Operational Pillars */}
      <section id="how-it-works" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-12 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B99A60]">
            Operational Workflow
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#183C2B] font-semibold">
            How PlateProof 360 Establishes Trust
          </h2>
          <p className="text-sm text-[#55584F]">
            Automated sensor verification engineered to meet FSSAI Schedule 4 and Codex HACCP requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#22241F]/10 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#183C2B] flex items-center justify-center text-[#B99A60]">
              <Thermometer className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#183C2B]">
              1. Calibrated Thermal Probing
            </h3>
            <p className="text-xs text-[#55584F] leading-relaxed">
              BLE digital thermocouples capture core cooking temperatures at the moment of completion. Dishes must satisfy pathogen inactivation thresholds before dispatch.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#22241F]/10 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#183C2B] flex items-center justify-center text-[#B99A60]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#183C2B]">
              2. Allergen Isolation Tracking
            </h3>
            <p className="text-xs text-[#55584F] leading-relaxed">
              Clear itemization of primary ingredients and potential cross-contact risks. Dedicated color-coded cookware and hermetically sealed storage tubs prevent cross-contamination.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#22241F]/10 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#183C2B] flex items-center justify-center text-[#B99A60]">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#183C2B]">
              3. Lot Traceability &amp; Assays
            </h3>
            <p className="text-xs text-[#55584F] leading-relaxed">
              Shipments of dairy, meat, and fresh produce are logged with dock intake temperatures, supplier lot certificates, and rapid adulterant testing records.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Standards & Statutory Compliance */}
      <section id="standards" className="py-16 bg-white border-y border-[#22241F]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B99A60]">
              Statutory Compliance
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#183C2B] font-semibold">
              Certified Against Global Food Standards
            </h2>
            <p className="text-sm text-[#55584F]">
              Designed for institutional food services, corporate cafeterias, and hospital canteens requiring strict regulatory readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#22241F]/10 space-y-2">
              <Award className="w-6 h-6 text-[#183C2B]" />
              <h4 className="font-serif text-base font-semibold text-[#183C2B]">FSSAI Schedule 4</h4>
              <p className="text-xs text-[#55584F] leading-relaxed">
                Full compliance with mandatory general sanitary and hygiene guidelines for high-throughput food businesses in India.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#22241F]/10 space-y-2">
              <CheckCircle2 className="w-6 h-6 text-[#183C2B]" />
              <h4 className="font-serif text-base font-semibold text-[#183C2B]">Codex HACCP</h4>
              <p className="text-xs text-[#55584F] leading-relaxed">
                Automated continuous tracking of Critical Control Points (CCP-1 thermal, CCP-2 cold storage, and holding wells).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#22241F]/10 space-y-2">
              <Lock className="w-6 h-6 text-[#183C2B]" />
              <h4 className="font-serif text-base font-semibold text-[#183C2B]">ISO 22000:2018</h4>
              <p className="text-xs text-[#55584F] leading-relaxed">
                Enterprise Food Safety Management System (FSMS) alignment with verifiable digital audit trails.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#22241F]/10 space-y-2">
              <Building2 className="w-6 h-6 text-[#183C2B]" />
              <h4 className="font-serif text-base font-semibold text-[#183C2B]">Institutional Scale</h4>
              <p className="text-xs text-[#55584F] leading-relaxed">
                Multi-bay telemetry supporting hundreds of concurrent orders per lunch shift with sub-second digital validation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Canteens */}
      <section id="institutional" className="py-16 bg-[#183C2B] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs uppercase font-semibold text-[#B99A60]">
                <Building2 className="w-4 h-4" />
                <span>Commercial Commissaries &amp; Institutional Scale</span>
              </div>
              <h2 className="font-serif text-3xl font-semibold">
                Audit readiness for high-throughput food service.
              </h2>
              <p className="text-xs text-[#A8B59B] leading-relaxed">
                Automated temperature compliance, digital supervisor sign-offs, and instant PDF audit dossiers for healthcare, campus canteens, and enterprise dining facilities.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="px-6 py-3.5 rounded-xl bg-[#B99A60] text-[#183C2B] text-xs font-semibold uppercase tracking-wider hover:bg-[#DFC694] shadow-xs transition-all shrink-0 flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              <span>Launch Kitchen Operations Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 text-center max-w-xl mx-auto px-4">
        <h2 className="font-serif text-3xl font-semibold text-[#183C2B]">
          Explore a Verified Dish Record
        </h2>
        <p className="text-xs text-[#55584F] mt-2 mb-6">
          Inspect core cooking temperatures, allergen isolations, and farm lot certifications on an active order.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/order/order-1042"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#183C2B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#24523C] shadow-xs transition-all"
          >
            <span>Paneer Tikka Attestation (#1042)</span>
            <ArrowRight className="w-4 h-4 text-[#B99A60]" />
          </Link>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#183C2B] border border-[#22241F]/20 hover:border-[#183C2B] text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
          >
            <span>Operations Portal</span>
          </Link>
        </div>
      </section>

    </div>
  );
};
