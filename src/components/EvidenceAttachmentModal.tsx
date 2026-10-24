import React, { useState } from 'react';
import {
  X,
  Camera,
  Thermometer,
  FlaskConical,
  FileText,
  MessageSquare,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useSafetyContext } from '../context';
import type { EvidenceItem } from '../types';

interface EvidenceAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'incident' | 'complaint' | 'capa';
  targetId: string;
  targetTitle: string;
  onSuccess?: (itemTitle: string) => void;
}

export const EvidenceAttachmentModal: React.FC<EvidenceAttachmentModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSuccess,
}) => {
  const { attachEvidence } = useSafetyContext();

  const [kind, setKind] = useState<EvidenceItem['kind']>('probe-reading');
  const [title, setTitle] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [capturedBy, setCapturedBy] = useState('Chef R. Suresh (FSS-KA-8819)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    attachEvidence(
      targetType,
      targetId,
      {
        kind,
        title: title.trim(),
        reference: reference.trim() || `${kind.toUpperCase()}-VERIFIED-DOC`,
        notes: notes.trim(),
        capturedBy: capturedBy.trim() || 'QA Supervisor',
      },
      capturedBy
    );

    setTimeout(() => {
      setIsSubmitting(false);
      if (onSuccess) onSuccess(title.trim());
      handleReset();
    }, 250);
  };

  const handleReset = () => {
    setTitle('');
    setReference('');
    setNotes('');
    onClose();
  };

  const kindOptions: {
    kind: EvidenceItem['kind'];
    label: string;
    icon: React.ElementType;
    placeholderRef: string;
    placeholderTitle: string;
  }[] = [
    {
      kind: 'probe-reading',
      label: 'Probe Telemetry',
      icon: Thermometer,
      placeholderRef: 'PROBE-BLE-04-LOG.JSON',
      placeholderTitle: 'Calibrated Thermocouple Pull Reading',
    },
    {
      kind: 'photo',
      label: 'Photo Evidence',
      icon: Camera,
      placeholderRef: 'IMG-TABLE-STATION-02.JPG',
      placeholderTitle: 'Allergen Mise-en-Place Station Separation',
    },
    {
      kind: 'lab-test',
      label: 'Lab Assay / Swab',
      icon: FlaskConical,
      placeholderRef: 'ASSAY-ATP-SWAB-8819.PDF',
      placeholderTitle: 'ATP Surface Bioluminescence Swab (<30 RLU)',
    },
    {
      kind: 'document',
      label: 'Certificate / Log',
      icon: FileText,
      placeholderRef: 'CERT-LOT-FSSAI-2026.PDF',
      placeholderTitle: 'NPOP Organic India Dairy Lot Certificate',
    },
    {
      kind: 'statement',
      label: 'Staff Statement',
      icon: MessageSquare,
      placeholderRef: 'STMT-CHEF-LINE-B.TXT',
      placeholderTitle: 'Hearth 02 Line Cook Verification Statement',
    },
  ];

  const currentOption = kindOptions.find((o) => o.kind === kind) || kindOptions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#183C2B]/60 backdrop-blur-xs animate-in fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#FAF8F4] border border-[#22241F]/20 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#183C2B] text-white px-6 py-4 flex items-center justify-between border-b border-[#B99A60]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B99A60]/20 border border-[#B99A60]/40 flex items-center justify-center text-[#B99A60]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-white font-semibold leading-tight">
                Attach Verifiable Evidence
              </h3>
              <p className="text-xs text-[#A8B59B]">
                {targetType.toUpperCase()}: <span className="text-white font-mono">{targetId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-[#A8B59B] hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target summary pill */}
        <div className="bg-[#F5F1E8] px-6 py-2.5 border-b border-[#22241F]/10 text-xs text-[#55584F] flex items-center justify-between">
          <span className="font-medium truncate max-w-[320px]">{targetTitle}</span>
          <span className="text-[10px] font-mono uppercase bg-white border border-[#22241F]/10 px-2 py-0.5 rounded text-[#183C2B] font-bold">
            Immutable Audit
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Evidence Category Pills */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#55584F] mb-1.5">
              Evidence Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {kindOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = kind === opt.kind;
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => {
                      setKind(opt.kind);
                      if (!title) setTitle(opt.placeholderTitle);
                      if (!reference) setReference(opt.placeholderRef);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-[#183C2B] text-white border-[#183C2B] shadow-xs'
                        : 'bg-white text-[#22241F] border-[#22241F]/15 hover:border-[#183C2B]/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#B99A60]' : 'text-[#808477]'}`} />
                      <span className="font-semibold text-xs leading-none">{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#55584F] mb-1">
              Evidence Title
            </label>
            <input
              type="text"
              required
              placeholder={currentOption.placeholderTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-[#22241F]/20 rounded-xl px-3 py-2 text-xs text-[#22241F] font-semibold focus:outline-none focus:border-[#183C2B]"
            />
          </div>

          {/* Reference Document / Hash */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#55584F] mb-1">
              File Reference / Probe Hash / Instrument Serial
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={currentOption.placeholderRef}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-white border border-[#22241F]/20 rounded-xl pl-3 pr-8 py-2 text-xs font-mono text-[#22241F] focus:outline-none focus:border-[#183C2B]"
              />
              <Upload className="w-3.5 h-3.5 text-[#808477] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Inspector / Captured By */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#55584F] mb-1">
              Captured By / Verifier
            </label>
            <input
              type="text"
              value={capturedBy}
              onChange={(e) => setCapturedBy(e.target.value)}
              className="w-full bg-white border border-[#22241F]/20 rounded-xl px-3 py-2 text-xs text-[#22241F] font-medium focus:outline-none focus:border-[#183C2B]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#55584F] mb-1">
              Auditor Findings / Laboratory Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Swab plated on selective agar; 0 CFU colonies detected after 24hr incubation."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#22241F]/20 rounded-xl px-3 py-2 text-xs text-[#22241F] focus:outline-none focus:border-[#183C2B]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#22241F]/10">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#55584F] hover:bg-stone-200/60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#183C2B] hover:bg-[#24523C] text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Attaching...' : 'Attach to Audit Trail'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
