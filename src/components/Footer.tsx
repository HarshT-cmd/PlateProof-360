import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, FileText, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#183C2B] text-[#FAF8F4] border-t border-[#B99A60]/30 font-sans mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded border border-[#B99A60] bg-[#10291D] flex items-center justify-center text-[#B99A60]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl tracking-tight text-[#FAF8F4] font-semibold">
                PlateProof<span className="text-[#B99A60] font-normal italic ml-1">360</span>
              </span>
            </div>
            
            <p className="text-sm text-[#A8B59B] leading-relaxed max-w-sm">
              Trust beyond the plate. The continuous food safety telemetry layer bridging commercial kitchens, institutional canteens, and health-conscious diners.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs text-[#FAF8F4]/80">
              <span className="inline-flex items-center gap-1 bg-[#10291D] px-2.5 py-1 rounded border border-[#A8B59B]/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B99A60]" />
                ISO 22000 Ready
              </span>
              <span className="inline-flex items-center gap-1 bg-[#10291D] px-2.5 py-1 rounded border border-[#A8B59B]/20">
                <Award className="w-3.5 h-3.5 text-[#B99A60]" />
                FSSAI Schedule 4 Aligned
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#B99A60]">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-[#A8B59B]">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <a href="/#dish-inspection" className="hover:text-white transition-colors">
                  Dish Telemetry
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#standards" className="hover:text-white transition-colors">
                  Safety Standards
                </a>
              </li>
              <li>
                <a href="/#institutional" className="hover:text-white transition-colors">
                  Institutional Scale
                </a>
              </li>
              <li>
                <Link to="/order/order-1042" className="hover:text-white transition-colors">
                  Order Verification (#1042)
                </Link>
              </li>
            </ul>
          </div>

          {/* Operations Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#B99A60]">
              Operations
            </h4>
            <ul className="space-y-2 text-sm text-[#A8B59B]">
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Canteen Control Deck
                </Link>
              </li>
              <li>
                <span className="text-[#A8B59B]/70">Digital Thermocouple BLE</span>
              </li>
              <li>
                <span className="text-[#A8B59B]/70">CAPA Corrective Ledger</span>
              </li>
              <li>
                <span className="text-[#A8B59B]/70">Allergen Matrix Sync</span>
              </li>
            </ul>
          </div>

          {/* Institutional Compliance Notice */}
          <div className="md:col-span-3 space-y-3 bg-[#10291D]/80 p-5 rounded border border-[#A8B59B]/15">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B99A60]">
              <FileText className="w-3.5 h-3.5" />
              Audit Integrity Notice
            </div>
            <p className="text-xs text-[#A8B59B] leading-normal">
              PlateProof 360 acts as an open, verifiable transparency layer. Live cooking telemetry reflects calibrated sensor data at the moment of transfer and is preserved with cryptographic audit hashes.
            </p>
            <div className="text-[11px] text-[#B99A60] font-mono">
              Hub Node: BLR-COMMISSARY-01
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#A8B59B]/15 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#A8B59B]">
          <p>© 2026 PlateProof 360 Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer">Security Protocol</span>
            <span className="hover:text-white cursor-pointer">HACCP Telemetry Standard</span>
            <span className="hover:text-white cursor-pointer">Privacy & Traceability</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
