import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Send, Clock, ShieldAlert } from 'lucide-react';
import { useSafetyContext } from '../context';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  dishName: string;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  orderId,
  dishName,
}) => {
  const { fileComplaint } = useSafetyContext();
  const [category, setCategory] = useState<'allergen' | 'temperature' | 'packaging' | 'quality'>('allergen');
  const [description, setDescription] = useState('');
  const [dinerContact, setDinerContact] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    time: string;
    incidentCreated: boolean;
    duplicate: boolean;
    incidentId?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleQuickFillUndercooked = () => {
    setCategory('temperature');
    setDescription('Paneer Tikka Masala appears undercooked, soft and cool in the center core.');
    setSeatNumber('Table 4');
    setDinerContact('+91 98765 43210');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const filing = fileComplaint({
      orderId,
      token: orderId.toLowerCase(),
      dishName,
      category,
      description,
      dinerContact: dinerContact || 'Walk-in Diner',
      seatNumber: seatNumber || 'Unspecified Station',
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedTicket({
        id: filing.complaint.id,
        time: filing.complaint.reportedAt,
        incidentCreated: filing.incident !== null,
        duplicate: filing.duplicate,
        incidentId: filing.incident?.id,
      });
    }, 400);
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setDescription('');
    setDinerContact('');
    setSeatNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#22241F]/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF8F4] border border-[#22241F]/20 rounded-lg shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="bg-[#183C2B] text-[#FAF8F4] px-6 py-4 flex items-center justify-between border-b border-[#B99A60]/40">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#B99A60]" />
            <div>
              <h3 className="font-serif text-lg text-white font-medium">Report Food Safety Concern</h3>
              <p className="text-xs text-[#A8B59B]">Direct escalation to Central Kitchen Lead Auditor</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-[#A8B59B] hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedTicket ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-[#183C2B]/10 text-[#183C2B] rounded-full mx-auto flex items-center justify-center border border-[#183C2B]/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="font-serif text-2xl text-[#183C2B]">
              {submittedTicket.duplicate ? 'Inquiry Already Active' : 'Incident Logged Immediately'}
            </h4>
            <p className="text-sm text-[#55584F] leading-relaxed max-w-md mx-auto">
              {submittedTicket.duplicate ? (
                <span>
                  An active inquiry for <span className="font-medium text-[#22241F]">{dishName}</span> is already under supervisor investigation. Your note was attached to Ticket #{submittedTicket.id} without creating duplicate incidents.
                </span>
              ) : (
                <span>
                  Your concern for <span className="font-medium text-[#22241F]">{dishName}</span> (Order {orderId}) has been dispatched to Shift Supervisor <strong className="text-[#183C2B]">Chef R. Suresh</strong>.
                </span>
              )}
            </p>

            <div className="bg-[#F5F1E8] p-4 rounded border border-[#22241F]/15 text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-[#55584F]">Ticket Reference:</span>
                <span className="font-mono font-semibold text-[#183C2B]">{submittedTicket.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#55584F]">Dispatched At:</span>
                <span className="font-mono text-[#22241F]">{submittedTicket.time} IST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#55584F]">Supervisor SLA:</span>
                <span className="text-emerald-700 font-medium">Under 3 minutes (Table visit / QA hold)</span>
              </div>
              {submittedTicket.incidentId && (
                <div className="flex justify-between text-amber-800 border-t border-[#22241F]/10 pt-1.5">
                  <span className="text-[#55584F]">Operational Triage:</span>
                  <span className="font-semibold text-[#183C2B]">Incident {submittedTicket.incidentId} (Medium Severity)</span>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2.5 rounded bg-[#183C2B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#24523C] transition-all cursor-pointer"
            >
              Return to Safety Record
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
            {/* Quick Demo Pre-fill Button */}
            <div className="bg-[#FAF0E6] border border-[#B99A60]/50 p-2.5 rounded-lg flex items-center justify-between gap-2">
              <div className="text-xs text-[#183C2B]">
                <strong className="block text-[11px] uppercase tracking-wider text-[#B99A60] font-bold">Demo Scenario #1042</strong>
                <span className="text-[11px] text-[#55584F]">Paneer Tikka Masala appears undercooked</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillUndercooked}
                className="px-2.5 py-1 rounded bg-[#183C2B] text-white text-[11px] font-bold hover:bg-[#24523C] cursor-pointer shadow-xs"
              >
                Auto-Fill
              </button>
            </div>
            <div className="bg-[#B99A60]/10 border border-[#B99A60]/30 p-3 rounded text-xs text-[#22241F] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#B99A60] shrink-0 mt-0.5" />
              <div>
                <strong>Urgent Priority Channel:</strong> If you suspect an undeclared allergen reaction, please alert canteen medical / on-floor staff immediately.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#55584F] mb-1.5">
                Issue Classification
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCategory('allergen')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    category === 'allergen'
                      ? 'bg-[#183C2B] text-white border-[#183C2B]'
                      : 'bg-[#F5F1E8] text-[#22241F] border-[#22241F]/15 hover:border-[#22241F]/40'
                  }`}
                >
                  <span className="font-medium block">Allergen Inquiry</span>
                  <span className="text-[11px] opacity-80">Cross-contact or reaction risk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('temperature')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    category === 'temperature'
                      ? 'bg-[#183C2B] text-white border-[#183C2B]'
                      : 'bg-[#F5F1E8] text-[#22241F] border-[#22241F]/15 hover:border-[#22241F]/40'
                  }`}
                >
                  <span className="font-medium block">Thermal / Temperature</span>
                  <span className="text-[11px] opacity-80">Dish served lukewarm / cold</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('packaging')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    category === 'packaging'
                      ? 'bg-[#183C2B] text-white border-[#183C2B]'
                      : 'bg-[#F5F1E8] text-[#22241F] border-[#22241F]/15 hover:border-[#22241F]/40'
                  }`}
                >
                  <span className="font-medium block">Seal / Foreign Matter</span>
                  <span className="text-[11px] opacity-80">Broken tamper seal or defect</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('quality')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    category === 'quality'
                      ? 'bg-[#183C2B] text-white border-[#183C2B]'
                      : 'bg-[#F5F1E8] text-[#22241F] border-[#22241F]/15 hover:border-[#22241F]/40'
                  }`}
                >
                  <span className="font-medium block">Sensory / Freshness</span>
                  <span className="text-[11px] opacity-80">Aroma, taste, or texture</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#55584F] mb-1">
                  Table / Seat / Bay
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table 14 or Bay 3"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  className="w-full bg-[#F5F1E8] border border-[#22241F]/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#183C2B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#55584F] mb-1">
                  Phone / Employee ID
                </label>
                <input
                  type="text"
                  placeholder="For supervisor follow-up"
                  value={dinerContact}
                  onChange={(e) => setDinerContact(e.target.value)}
                  className="w-full bg-[#F5F1E8] border border-[#22241F]/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#183C2B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#55584F] mb-1">
                Observation Details
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe what you observed regarding temperature, aroma, allergen label, or packaging..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#F5F1E8] border border-[#22241F]/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#183C2B]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#22241F]/10">
              <span className="text-[11px] text-[#55584F] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#B99A60]" />
                Direct supervisor notification
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded text-xs font-medium text-[#55584F] hover:bg-[#E8E1D2]/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#991B1B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#7F1D1D] disabled:opacity-50 transition-all shadow-sm"
                >
                  {isSubmitting ? (
                    'Transmitting...'
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Issue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
