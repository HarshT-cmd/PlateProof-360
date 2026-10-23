import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, ShieldCheck, FileCheck2 } from 'lucide-react';
import { sampleOrdersList } from '../data/mockData';

interface OrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderLookupModal: React.FC<OrderLookupModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toLowerCase().replace(/^(order-|ord-)/, '');
    if (!clean) return;
    onClose();
    navigate(`/order/order-${clean}`);
  };

  const handleSelectSample = (token: string) => {
    onClose();
    navigate(`/order/${token}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#183C2B]/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white border border-[#22241F]/15 rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="bg-[#FAF7F0] px-6 py-4 flex items-center justify-between border-b border-[#22241F]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#183C2B] text-[#B99A60] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#183C2B] leading-tight">
                Verify Food Safety Record
              </h3>
              <p className="text-xs text-[#55584F]">
                Enter diner QR token or ticket order reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#55584F] hover:text-[#183C2B] p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-6 space-y-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#55584F]">
              Order Identification
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#808477]" />
                <input
                  type="text"
                  placeholder="e.g. 1042, 1043, 1044"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F0] border border-[#22241F]/20 rounded-xl text-sm focus:outline-none focus:border-[#183C2B] focus:ring-1 focus:ring-[#183C2B]"
                />
              </div>
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-5 py-2.5 bg-[#183C2B] text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-[#24523C] disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <span>Verify</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#B99A60]" />
              </button>
            </div>
          </form>

          {/* Quick Verified Samples */}
          <div className="space-y-2 pt-2 border-t border-[#22241F]/10">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#808477] block">
              Active Shift Samples &middot; Bangalore Commissary
            </span>
            <div className="space-y-2">
              {sampleOrdersList.map((sample) => (
                <button
                  key={sample.orderId}
                  onClick={() => handleSelectSample(sample.token)}
                  className="w-full text-left p-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F2ECE1] border border-[#22241F]/10 hover:border-[#183C2B]/30 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#22241F]/10 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-4 h-4 text-[#183C2B]" />
                    </div>
                    <div>
                      <strong className="block text-xs font-semibold text-[#183C2B] group-hover:text-[#24523C]">
                        {sample.dishName}
                      </strong>
                      <span className="text-[11px] text-[#55584F]">
                        {sample.orderId} &middot; {sample.cookingRecord.recordedTemp}°C Verified &middot; {sample.isVegetarian ? 'Veg' : 'Non-Veg'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#808477] group-hover:text-[#183C2B] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[#FAF7F0] px-6 py-3 border-t border-[#22241F]/10 text-center">
          <p className="text-[11px] text-[#55584F]">
            Every dish verification is certified against FSSAI Schedule 4 and Codex HACCP parameters.
          </p>
        </div>

      </div>
    </div>
  );
};
