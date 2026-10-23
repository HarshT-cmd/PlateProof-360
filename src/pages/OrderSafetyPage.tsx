import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Share2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Printer,
  Flame,
  Leaf,
  ShieldCheck,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { sampleOrdersList } from '../data/mockData';
import { useSafetyContext } from '../context';
import { ReportProblemModal } from '../components/ReportProblemModal';

export const OrderSafetyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getOrder, getComplaintsForOrder } = useSafetyContext();
  const order = getOrder(token || 'order-1042');
  const complaints = getComplaintsForOrder(order.orderId);

  const [activeAllergenIndex, setActiveAllergenIndex] = useState<number>(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInspectorDetails, setShowInspectorDetails] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentAllergen = order.allergens[activeAllergenIndex] || order.allergens[0];

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1D1F1A] font-sans pb-24 selection:bg-[#B99A60]/30 selection:text-[#183C2B]">
      
      {/* Official Certificate Header */}
      <div className="bg-[#183C2B] text-white text-xs py-2.5 px-4 border-b border-[#B99A60]/30 font-sans print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[#A8B59B]">Verified Attestation:</span>
            <span className="font-semibold text-white">{order.orderId} &middot; {order.kitchenName}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#A8B59B]">
            <span>Active Shift Audit Pass</span>
            <span>&middot;</span>
            <span className="text-white font-mono">{order.fssaiNumber}</span>
          </div>
        </div>
      </div>

      {/* Main Full-Screen Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Navigation, Switcher & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#22241F]/10 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#55584F] hover:text-[#183C2B] font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>PlateProof Home</span>
            </Link>

            <span className="text-[#22241F]/20">|</span>

            {/* Quick Order Switcher */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-[#808477] font-medium hidden md:inline">Sample:</span>
              <select
                value={order.token}
                onChange={(e) => navigate(`/order/${e.target.value}`)}
                aria-label="Select order sample"
                className="bg-white border border-[#22241F]/15 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#183C2B] focus:outline-none focus:border-[#183C2B] cursor-pointer"
              >
                {sampleOrdersList.map((s) => (
                  <option key={s.token} value={s.token}>
                    {s.orderId} - {s.dishName} ({s.isVegetarian ? 'Veg' : 'Non-Veg'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#22241F]/15 text-[#55584F] hover:text-[#183C2B] hover:border-[#183C2B] transition-all cursor-pointer shadow-xs"
              title="Print official food safety certificate"
            >
              <Printer className="w-3.5 h-3.5 text-[#808477]" />
              <span className="font-medium">Print Certificate</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#22241F]/15 text-[#55584F] hover:text-[#183C2B] hover:border-[#183C2B] transition-all cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-[#B99A60]" />
              <span className="font-medium">{copiedLink ? 'Link Copied' : 'Share'}</span>
            </button>

            <span className="font-mono text-xs bg-stone-200/80 px-2.5 py-1 rounded-lg text-[#183C2B] font-bold">
              {order.orderId}
            </span>
          </div>
        </div>

        {/* Active Safety Query Status Banner if complaints filed */}
        {complaints.length > 0 && (
          <div className="bg-[#FAF8F4] border border-[#B99A60]/40 rounded-xl p-4 flex items-start gap-3 shadow-xs print:hidden">
            <AlertTriangle className="w-5 h-5 text-[#B99A60] shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#183C2B]">Active Safety Query on Record ({complaints[0].id})</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  complaints[0].status === 'resolved-closed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {complaints[0].status === 'resolved-closed' ? 'Verified & Resolved' : 'Under Active Kitchen Review'}
                </span>
              </div>
              <p className="text-[#55584F] leading-relaxed">
                Category: <strong className="text-[#22241F] capitalize">{complaints[0].category}</strong> &middot; Reported at {complaints[0].reportedAt}.
                {complaints[0].resolutionNote ? ` Resolution: ${complaints[0].resolutionNote}` : ' Assigned to Shift Supervisor Chef R. Suresh for active station triage.'}
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (5 cols): Dish Card & Audit Trail */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Dish Card */}
            <div className="bg-white border border-[#22241F]/15 rounded-2xl overflow-hidden shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
                <img
                  src={order.imageUrl}
                  alt={order.dishName}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent"></div>

                <div className="absolute top-3 left-3 bg-[#183C2B]/95 text-white px-3 py-1 rounded-md text-xs font-mono border border-[#B99A60]/40 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>CCP-1: {order.cookingRecord.recordedTemp}°C VERIFIED</span>
                </div>

                <div className="absolute top-3 right-3 bg-white/95 text-[#183C2B] px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                  {order.isVegetarian ? 'Lacto-Vegetarian' : 'Poultry / Halal'}
                </div>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[11px] font-sans uppercase tracking-widest text-[#B99A60] font-bold block">
                    {order.regionalVariant}
                  </span>
                  <h1 className="font-sans text-2xl sm:text-3xl font-extrabold leading-tight mt-1 text-white tracking-tight">
                    {order.dishName}
                  </h1>
                </div>
              </div>

              {/* Status Header */}
              <div className="p-4 bg-[#183C2B] text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-7 h-7 text-[#B99A60] shrink-0" />
                  <div>
                    <strong className="block text-sm font-bold leading-tight">
                      Compliance Standards Cleared
                    </strong>
                    <span className="text-xs text-[#A8B59B]">
                      Core heat {order.cookingRecord.recordedTemp}°C &middot; Surface sanitization verified
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-xs font-semibold uppercase tracking-wider transition-colors border border-white/20 cursor-pointer print:hidden"
                >
                  Report Issue
                </button>
              </div>
            </div>

            {/* Preparation Audit Trail */}
            <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-xs space-y-3">
              <h2 className="text-lg font-extrabold text-stone-900 font-sans tracking-tight">
                Culinary Audit Trail
              </h2>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#183C2B] text-[#B99A60] flex items-center justify-center shrink-0 font-mono font-bold text-[11px]">1</span>
                  <div>
                    <strong className="text-stone-900 block text-xs font-bold">06:15 AM &middot; Farm Intake &amp; Cold Chain</strong>
                    <span className="text-stone-600 text-xs">Fresh agricultural intake received under cold chain monitoring. Rapid adulterant assay passed.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#183C2B] text-[#B99A60] flex items-center justify-center shrink-0 font-mono font-bold text-[11px]">2</span>
                  <div>
                    <strong className="text-stone-900 block text-xs font-bold">11:15 AM &middot; Station Surface Sanitization</strong>
                    <span className="text-stone-600 text-xs">{order.station} ATP bioluminescence swab verified at &lt;30 RLU standard.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#183C2B] text-[#B99A60] flex items-center justify-center shrink-0 font-mono font-bold text-[11px]">3</span>
                  <div>
                    <strong className="text-stone-900 block text-xs font-bold">{order.cookingRecord.recordedAt} &middot; Thermal Verification</strong>
                    <span className="text-stone-600 text-xs">Thermocouple reading: {order.cookingRecord.recordedTemp}°C logged by {order.cookingRecord.operator}.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#183C2B] text-[#B99A60] flex items-center justify-center shrink-0 font-mono font-bold text-[11px]">4</span>
                  <div>
                    <strong className="text-stone-900 block text-xs font-bold">{order.prepTimestamp} &middot; Plated &amp; QR Tagged</strong>
                    <span className="text-stone-600 text-xs">Order dispatched with verified digital safety seal.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Problem Report Action Button */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full py-3.5 rounded-xl bg-red-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-900 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 print:hidden"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Quality or Temperature Issue</span>
            </button>

          </div>

          {/* Right Column (7 cols): Measurements, Allergen Filter, Sourcing */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                  <span>COOKING TEMP</span>
                  <Flame className="w-4 h-4 text-[#B99A60]" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-sans">
                  {order.cookingRecord.recordedTemp}°C
                </div>
                <span className="text-xs text-emerald-800 font-bold block">
                  Passed (&ge; {order.cookingRecord.targetTemp}°C Target)
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                  <span>ALLERGENS</span>
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-sans">
                  {order.allergens.length} Declared
                </div>
                <span className="text-xs text-stone-600 font-bold block">
                  Segregated Utensils Logged
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-stone-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                  <span>PROVENANCE</span>
                  <Leaf className="w-4 h-4 text-emerald-800" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-sans">
                  {order.ingredients[0]?.supplier || 'Verified Origin'}
                </div>
                <span className="text-xs text-emerald-800 font-bold block">
                  Adulterant Free (Assayed)
                </span>
              </div>
            </div>

            {/* Dietary & Allergen Inspection Card */}
            <div className="bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-xs space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 font-sans tracking-tight">
                  Allergen Protocols &amp; Cross-Contact Safeguards
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 font-medium">
                  Select an itemized declaration below to review handling procedures and isolation steps:
                </p>
              </div>

              {/* Dynamic Allergen Selection Pills */}
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                {order.allergens.map((alg, idx) => (
                  <button
                    key={alg.name}
                    onClick={() => setActiveAllergenIndex(idx)}
                    className={`px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAllergenIndex === idx
                        ? 'bg-[#183C2B] text-white border-[#183C2B] shadow-xs'
                        : 'bg-[#FAF7F0] text-[#55584F] border-[#22241F]/10 hover:border-[#183C2B]'
                    }`}
                  >
                    <span>{alg.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      alg.type === 'contains'
                        ? 'bg-amber-600/30 text-amber-900'
                        : 'bg-stone-300 text-stone-700'
                    }`}>
                      {alg.type}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Allergen Description */}
              {currentAllergen && (
                <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF7F0] text-xs leading-relaxed space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-semibold text-[#183C2B]">
                      {currentAllergen.name} &middot; <span className="capitalize">{currentAllergen.type.replace('-', ' ')}</span>
                    </strong>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      currentAllergen.severity === 'high'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {currentAllergen.severity} Risk
                    </span>
                  </div>

                  <p className="text-[#55584F]">
                    <strong>Source Ingredient:</strong> {currentAllergen.source}. {currentAllergen.declarationNote}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white border border-[#22241F]/10 text-[#183C2B] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span><strong>Kitchen Isolation:</strong> {currentAllergen.stationIsolation}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Farm Provenance */}
            <div className="bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-stone-900 font-sans tracking-tight">
                  Sourced Agricultural Batches
                </h2>
                <span className="text-xs font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                  {order.ingredients.length} Verified Lots
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.ingredients.map((ing) => (
                  <div key={ing.lotNumber} className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#22241F]/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase text-[#B99A60]">{ing.category}</span>
                      <span className="font-mono text-[10px] text-[#808477]">{ing.lotNumber}</span>
                    </div>
                    <strong className="text-sm font-semibold text-[#183C2B] block">{ing.name}</strong>
                    <p className="text-xs text-[#55584F]">{ing.supplier} &middot; {ing.origin}</p>
                    <div className="text-[11px] text-emerald-800 font-medium pt-1">
                      {ing.qualityNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Certification Drawer */}
            <div className="text-center pt-1 print:block">
              <button
                onClick={() => setShowInspectorDetails(!showInspectorDetails)}
                className="text-xs text-[#808477] hover:text-[#183C2B] inline-flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Statutory Food Safety License &amp; Digital Certificate</span>
                {showInspectorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showInspectorDetails && (
                <div className="mt-3 p-4 bg-white border border-[#22241F]/10 rounded-xl text-xs text-left text-[#55584F] space-y-2 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#22241F]/10">
                    <div><strong>Digital Certificate ID:</strong> <span className="font-mono text-[#183C2B]">CERT-BLR-{order.orderId}</span></div>
                    <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Validated under FSSAI Schedule 4
                    </div>
                  </div>
                  <div><strong>Statutory License:</strong> {order.fssaiNumber} &middot; {order.isoStandard}</div>
                  <div><strong>Digital Audit Hash:</strong> <span className="font-mono text-[11px] break-all">{order.verificationHash}</span></div>
                  <p className="text-[11px] text-[#808477] leading-relaxed pt-1">
                    {order.batchVerificationNote}
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      <ReportProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        orderId={order.orderId}
        dishName={order.dishName}
      />

    </div>
  );
};
