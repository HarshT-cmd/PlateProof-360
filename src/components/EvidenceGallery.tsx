import React from 'react';
import {
  Camera,
  Thermometer,
  FlaskConical,
  FileText,
  MessageSquare,
  FileCheck2,
  Clock,
  User,
} from 'lucide-react';
import type { EvidenceItem } from '../types';

interface EvidenceGalleryProps {
  evidence: EvidenceItem[];
  emptyMessage?: string;
  onAttachClick?: () => void;
  canAttach?: boolean;
}

export const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  evidence,
  emptyMessage = 'No formal evidence attached yet.',
  onAttachClick,
  canAttach = false,
}) => {
  const getKindIcon = (kind: EvidenceItem['kind']) => {
    switch (kind) {
      case 'probe-reading':
        return Thermometer;
      case 'photo':
        return Camera;
      case 'lab-test':
        return FlaskConical;
      case 'document':
        return FileText;
      case 'statement':
        return MessageSquare;
      default:
        return FileCheck2;
    }
  };

  const getKindBadgeClass = (kind: EvidenceItem['kind']) => {
    switch (kind) {
      case 'probe-reading':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'photo':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'lab-test':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'document':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'statement':
        return 'bg-stone-100 text-stone-800 border-stone-300';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-500 space-y-2">
        <p className="font-medium">{emptyMessage}</p>
        {canAttach && onAttachClick && (
          <button
            type="button"
            onClick={onAttachClick}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#22241F]/20 text-[#183C2B] font-bold text-xs hover:bg-[#FAF7F0] cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <span>+ Attach First Evidence</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#55584F] flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5 text-[#B99A60]" />
          <span>Verifiable Evidence Registry ({evidence.length})</span>
        </span>
        {canAttach && onAttachClick && (
          <button
            type="button"
            onClick={onAttachClick}
            className="text-[11px] font-bold text-[#183C2B] hover:text-[#24523C] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>+ Attach Evidence</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {evidence.map((item) => {
          const Icon = getKindIcon(item.kind);
          return (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-white border border-[#22241F]/15 hover:border-[#183C2B]/40 transition-all shadow-2xs space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-[#183C2B]/10 flex items-center justify-center shrink-0 text-[#183C2B]">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <strong className="font-bold text-stone-900 truncate block">
                    {item.title}
                  </strong>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shrink-0 ${getKindBadgeClass(
                    item.kind
                  )}`}
                >
                  {item.kind.replace('-', ' ')}
                </span>
              </div>

              {item.notes && (
                <p className="text-stone-600 font-medium leading-relaxed bg-[#FAF7F0] p-2 rounded-lg border border-[#22241F]/10 text-[11px]">
                  {item.notes}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#22241F]/10 text-[10px] text-stone-500 font-medium">
                <div className="flex items-center gap-1 font-mono text-[#183C2B] font-semibold">
                  <span>Ref:</span>
                  <span className="truncate max-w-[130px]">{item.reference}</span>
                </div>

                <div className="flex items-center gap-2 text-stone-500">
                  <span className="flex items-center gap-0.5">
                    <User className="w-3 h-3 text-[#B99A60]" />
                    <span className="truncate max-w-[100px]">{item.capturedBy}</span>
                  </span>
                  <span className="flex items-center gap-0.5 font-mono">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{item.capturedAt}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
