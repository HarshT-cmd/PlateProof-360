import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Check,
  Building,
  FileCheck2,
  PlusCircle,
  Download,
  X,
  Clock,
  RotateCcw,
  ShieldAlert,
  History,
} from 'lucide-react';
import { useSafetyContext } from '../context';
import type { AuditEntry, IncidentSeverity } from '../types';

export const OperationsDashboard: React.FC = () => {
  const {
    incidents,
    correctiveActions,
    inventoryRisks,
    temperatureTrends,
    complaints,
    inspectionAudits,
    stats,
    signOffCorrectiveAction,
    resolveInventoryRisk,
    logManualTemperature,
    resetDemoData,
  } = useSafetyContext();

  const [selectedSensor, setSelectedSensor] = useState<'all' | 'chiller' | 'grill' | 'steam'>('all');
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'open' | 'critical' | 'closed'>('all');
  const [selectedAuditTrail, setSelectedAuditTrail] = useState<{ title: string; entries: AuditEntry[] } | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Manual Reading Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualProbe, setManualProbe] = useState('Tandoor Grill B');
  const [manualTemp, setManualTemp] = useState('83.5');
  const [manualNotes, setManualNotes] = useState('Spot check with calibrated handheld thermocouple.');

  // Find the primary pending CAPA requiring supervisor sign-off
  const pendingCapa = correctiveActions.find((c) => c.verificationStatus === 'pending-supervisor');
  const pendingLinkedIncident = pendingCapa ? incidents.find((i) => i.id === pendingCapa.incidentRef) : null;

  const handleSupervisorSignOff = (capaId: string, incidentRef: string) => {
    signOffCorrectiveAction(
      capaId,
      'Chef R. Suresh (FSS-KA-8819)',
      `Remedial log verified by Chef R. Suresh for incident ${incidentRef}.`
    );
    setFeedbackNotice(`Signed, sealed and approved: ${capaId}`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleResolveInventoryRisk = (id: string, actionName: string) => {
    resolveInventoryRisk(id, actionName);
    setFeedbackNotice(`Inventory intervention logged: ${actionName}`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleLogManualReading = (e: React.FormEvent) => {
    e.preventDefault();
    setIsManualModalOpen(false);
    const parsedTemp = parseFloat(manualTemp);
    const { alertIncident } = logManualTemperature(
      manualProbe,
      isNaN(parsedTemp) ? 75 : parsedTemp,
      manualNotes,
      'Chef R. Suresh'
    );

    if (alertIncident) {
      setFeedbackNotice(`CRITICAL ALERT: ${alertIncident.title}`);
    } else {
      setFeedbackNotice(`Logged: ${manualProbe} at ${manualTemp}°C`);
    }
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Filtered incidents list
  const filteredIncidents = incidents.filter((inc) => {
    if (incidentFilter === 'open') return inc.status !== 'verified-closed' && inc.status !== 'closed';
    if (incidentFilter === 'critical') return inc.severity === 'critical';
    if (incidentFilter === 'closed') return inc.status === 'verified-closed' || inc.status === 'closed';
    return true;
  });

  const getSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900/80 text-red-200 border-red-500/50';
      case 'high':
        return 'bg-amber-900/80 text-amber-200 border-amber-500/50';
      case 'warning':
      case 'moderate':
        return 'bg-yellow-900/80 text-yellow-200 border-yellow-500/50';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-600/50';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-stone-900 font-sans pb-24 selection:bg-[#B99A60]/30 selection:text-[#183C2B]">
      
      {/* Toast Feedback */}
      {feedbackNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#183C2B] text-white px-5 py-3.5 rounded-xl shadow-xl border-2 border-emerald-400 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* High-Contrast Production Header */}
      <div className="bg-[#123524] text-white border-b border-[#B99A60]/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/25 shrink-0 shadow-xs">
                <ChefHat className="w-7 h-7 text-[#B99A60]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans leading-none">
                  Kitchen Operations Dashboard
                </h1>
                <div className="text-xs sm:text-sm text-stone-200 mt-2 flex flex-wrap items-center gap-2.5 font-medium">
                  <span className="flex items-center gap-1.5 text-white">
                    <Building className="w-4 h-4 text-emerald-300" />
                    <span>Bangalore Central Kitchen &bull; Bay 3</span>
                  </span>
                  <span className="text-stone-400 hidden sm:inline">&bull;</span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-900/80 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Lunch Service (11:00 - 15:30)</span>
                  </span>
                  <span className="text-stone-400 hidden sm:inline">&bull;</span>
                  <span className="text-stone-200">
                    Supervisor: <strong className="text-white font-bold">Chef R. Suresh</strong> (ID: FSS-KA-8819)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={() => {
                  resetDemoData();
                  setFeedbackNotice('All operational data reset to pristine culinary seed state.');
                  setTimeout(() => setFeedbackNotice(null), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white text-xs font-bold tracking-wide transition-all border border-white/20 cursor-pointer shadow-xs"
                title="Reset local state back to initial culinary seed"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#B99A60]" />
                <span className="hidden md:inline">Reset Seed</span>
              </button>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 text-white hover:bg-white/25 text-xs sm:text-sm font-bold tracking-wide transition-all border border-white/25 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-[#B99A60]" />
                <span>Log Temp Check</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B99A60] hover:bg-[#DFC694] text-[#183C2B] text-xs sm:text-sm font-bold tracking-wide transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-[#183C2B]" />
                <span>Export Report (PDF)</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Top 4 Key Operational Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Orders Checked */}
          <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Orders Checked
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="my-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-sans">
                {stats.ordersCheckedCount.toLocaleString()}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg w-fit">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> All Safe (&ge;74°C)
            </span>
          </div>

          {/* Card 2: Active Alerts */}
          <div className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col justify-between ${
            stats.openIncidentsCount > 0 ? 'bg-amber-50/80 border-amber-400' : 'bg-white border-stone-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Active Alerts
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="my-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-900 tracking-tight font-sans">
                {stats.openIncidentsCount}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg w-fit">
              {stats.pendingApprovalsCount} Awaiting Supervisor Sign-off
            </span>
          </div>

          {/* Card 3: Expiring Ingredients */}
          <div className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col justify-between ${
            stats.criticalRisksCount > 0 ? 'bg-red-50/80 border-red-400' : 'bg-white border-stone-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                Expiring Ingredients
              </span>
              <Clock className="w-5 h-5 text-red-700" />
            </div>
            <div className="my-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-red-700 tracking-tight font-sans">
                {stats.criticalRisksCount}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-900 bg-red-100 border border-red-300 px-2.5 py-1 rounded-lg w-fit">
              {stats.criticalRisksCount > 0 ? 'Raw Chicken (3.5h left)' : 'All Lots Safe'}
            </span>
          </div>

          {/* Card 4: Daily Checklist */}
          <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Daily Safety Checks
              </span>
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="my-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-sans">
                {inspectionAudits.length} / {inspectionAudits.length}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg w-fit">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> All Checkpoints Cleared
            </span>
          </div>

        </section>

        {/* Priority Action Banner — Clear, High-Contrast, Action-Oriented */}
        {stats.pendingApprovalsCount > 0 && pendingCapa && (
          <div className="bg-stone-950 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border-2 border-amber-400">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-stone-950 text-[11px] font-black uppercase px-2.5 py-0.5 rounded tracking-wide">
                    Action Required
                  </span>
                  <strong className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {pendingCapa.id}: {pendingLinkedIncident ? pendingLinkedIncident.title : 'Corrective Action Pending Approval'}
                  </strong>
                </div>
                <p className="text-xs sm:text-sm text-stone-300 mt-1 font-medium">
                  {pendingCapa.actionTaken}. Log: <strong className="text-emerald-400 font-bold">{pendingCapa.remedialVerificationLog}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSupervisorSignOff(pendingCapa.id, pendingCapa.incidentRef)}
              className="shrink-0 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Approve &amp; Sign Off</span>
            </button>
          </div>
        )}

        {/* 2-Column Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (7 cols): Live Kitchen Temperatures */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-sm space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                  <Thermometer className="w-6 h-6 text-[#183C2B]" />
                  <span>Live Kitchen Temperatures</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 font-medium">
                  Continuous sensor readings across cold storage, hot hearths, and food warmers.
                </p>
              </div>

              {/* Tap-Friendly Station Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs bg-stone-100 p-1.5 rounded-xl border border-stone-300">
                <button
                  onClick={() => setSelectedSensor('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    selectedSensor === 'all'
                      ? 'bg-[#183C2B] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedSensor('chiller')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    selectedSensor === 'chiller'
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Chiller (&le;4°C)
                </button>
                <button
                  onClick={() => setSelectedSensor('grill')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    selectedSensor === 'grill'
                      ? 'bg-[#16A34A] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Grill (&ge;74°C)
                </button>
                <button
                  onClick={() => setSelectedSensor('steam')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    selectedSensor === 'steam'
                      ? 'bg-[#D97706] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Warmer (&ge;63°C)
                </button>
              </div>
            </div>

            {/* High-Legibility Telemetry Line Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temperatureTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={12} fontWeight={600} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={12} fontWeight={600} tickLine={false} domain={[0, 95]} unit="°C" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#183C2B',
                      borderWidth: '2px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
                    }}
                  />
                  <ReferenceLine y={4.0} stroke="#DC2626" strokeDasharray="4 4" strokeWidth={1.5} />
                  <ReferenceLine y={74.0} stroke="#16A34A" strokeDasharray="4 4" strokeWidth={1.5} />
                  <ReferenceLine y={63.0} stroke="#D97706" strokeDasharray="4 4" strokeWidth={1.5} />

                  {(selectedSensor === 'all' || selectedSensor === 'chiller') && (
                    <Line type="monotone" dataKey="chillerTemp" name="Chiller Room 2 (Target ≤4°C)" stroke="#0284C7" strokeWidth={3} dot={{ r: 3.5 }} />
                  )}
                  {(selectedSensor === 'all' || selectedSensor === 'grill') && (
                    <Line type="monotone" dataKey="grillTemp" name="Tandoor Grill B (Target ≥74°C)" stroke="#16A34A" strokeWidth={3} dot={{ r: 3.5 }} />
                  )}
                  {(selectedSensor === 'all' || selectedSensor === 'steam') && (
                    <Line type="monotone" dataKey="steamTableTemp" name="Steam Table Well (Target ≥63°C)" stroke="#D97706" strokeWidth={3} dot={{ r: 3.5 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Live Sensor Status Cards with Big Glanceable Readings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-200">
              
              <div className="p-3.5 rounded-xl bg-sky-50 border-2 border-sky-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-950 uppercase block tracking-wider">
                    Chiller Bay 2
                  </span>
                  <strong className="text-2xl font-black text-sky-900 font-sans">
                    3.6°C
                  </strong>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                  Safe (&le;4°C)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-950 uppercase block tracking-wider">
                    Tandoor Grill B
                  </span>
                  <strong className="text-2xl font-black text-emerald-900 font-sans">
                    82.4°C
                  </strong>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                  Safe (&ge;74°C)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-950 uppercase block tracking-wider">
                    Food Warmer
                  </span>
                  <strong className="text-2xl font-black text-amber-900 font-sans">
                    68.1°C
                  </strong>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                  Safe (&ge;63°C)
                </span>
              </div>

            </div>

          </div>

          {/* Right Column (5 cols): Expiring Ingredients & Compliance */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Expiring Ingredients (FIFO Rule) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Expiring Ingredients</span>
                </h2>
                <span className="text-xs font-bold text-stone-600 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-md">
                  FIFO: Use First
                </span>
              </div>

              <div className="space-y-3">
                {inventoryRisks.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border-2 text-xs flex items-center justify-between gap-3 ${
                      item.riskTier === 'critical'
                        ? 'bg-red-50 border-red-300'
                        : item.riskTier === 'warning'
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div>
                      <strong className="text-sm font-bold text-stone-900 block">
                        {item.ingredient}
                      </strong>
                      <span className="text-xs text-stone-600 font-medium">
                        {item.currentQuantityKg} kg in stock &bull; {item.storageLocation}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-base font-black block font-sans ${
                        item.riskTier === 'critical' ? 'text-red-700' : 'text-amber-800'
                      }`}>
                        {item.hoursUntilExpiry}h left
                      </span>
                      {item.riskTier !== 'normal' && (
                        <button
                          onClick={() => handleResolveInventoryRisk(item.id, 'Prioritized for lunch service')}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-[#183C2B] text-white text-xs font-bold hover:bg-[#24523C] cursor-pointer shadow-xs"
                        >
                          Prioritize
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Food Safety Compliance Box */}
            <div className="bg-[#123524] text-white p-6 rounded-2xl border-2 border-emerald-500/40 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-[#B99A60] flex items-center gap-1.5 tracking-wider">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <span>FSSAI Schedule 4 Audit Status</span>
                </span>
                <span className="text-xs bg-emerald-500 text-stone-950 font-black px-2.5 py-0.5 rounded-md">
                  Active Pass
                </span>
              </div>

              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">
                All 6 hot wells and 2 walk-in chillers verified within regulatory temperature parameters. Cooking oil TPM 14.2% (safely below 25% ceiling).
              </p>

              <button
                onClick={() => {
                  setFeedbackNotice('Audit Dossier PDF exported successfully.');
                  setTimeout(() => setFeedbackNotice(null), 3000);
                  window.print();
                }}
                className="w-full py-3 rounded-xl bg-[#B99A60] hover:bg-[#DFC694] text-[#183C2B] text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                Download Daily Audit Dossier (PDF)
              </button>
            </div>

          </div>

        </div>

        {/* Live Safety Incidents & Diner Escalations Section */}
        <section className="bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
                <span>Active Incidents &amp; Diner Concerns Stream</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
                Live stream of automated telemetry alerts, CCP control deviations, and diner safety reports.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs bg-stone-100 p-1 rounded-xl border border-stone-300">
              <button
                onClick={() => setIncidentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  incidentFilter === 'all'
                    ? 'bg-[#183C2B] text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                All ({incidents.length})
              </button>
              <button
                onClick={() => setIncidentFilter('open')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  incidentFilter === 'open'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Open ({stats.openIncidentsCount})
              </button>
              <button
                onClick={() => setIncidentFilter('critical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  incidentFilter === 'critical'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setIncidentFilter('closed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  incidentFilter === 'closed'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                Verified Closed
              </button>
            </div>
          </div>

          {/* Incidents Table / Cards */}
          <div className="space-y-3">
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-sm">No incidents matching the active filter.</p>
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const isClosed = incident.status === 'verified-closed' || incident.status === 'closed';
                const hasPendingCapa = correctiveActions.some(
                  (c) => c.incidentRef === incident.id && c.verificationStatus === 'pending-supervisor'
                );
                const linkedCapa = correctiveActions.find((c) => c.incidentRef === incident.id);

                return (
                  <div
                    key={incident.id}
                    className={`p-4 sm:p-5 rounded-xl border-2 transition-all flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      incident.severity === 'critical'
                        ? 'bg-red-50/40 border-red-200'
                        : isClosed
                        ? 'bg-stone-50 border-stone-200 opacity-90'
                        : 'bg-amber-50/30 border-amber-200'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#183C2B]">
                          {incident.id}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border tracking-wider ${getSeverityBadge(
                            incident.severity
                          )}`}
                        >
                          {incident.severity}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                            isClosed
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {incident.status}
                        </span>
                        {incident.linkedComplaintId && (
                          <span className="text-[10px] font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded border border-sky-300">
                            Diner Ticket: {incident.linkedComplaintId}
                            {complaints.find((c) => c.id === incident.linkedComplaintId)?.dinerContact
                              ? ` (${complaints.find((c) => c.id === incident.linkedComplaintId)?.dinerContact})`
                              : ''}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight leading-snug">
                        {incident.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
                        {incident.correctiveActionPlan}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1">
                        <span>Location: <strong className="text-stone-700">{incident.location}</strong></span>
                        <span>&bull;</span>
                        <span>Reported: <strong className="text-stone-700">{incident.timestamp}</strong></span>
                        <span>&bull;</span>
                        <span>By: <strong className="text-stone-700">{incident.reportedBy}</strong></span>
                      </div>
                    </div>

                    {/* Incident Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0">
                      {hasPendingCapa && linkedCapa && (
                        <button
                          onClick={() => handleSupervisorSignOff(linkedCapa.id, incident.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Sign Off CAPA</span>
                        </button>
                      )}

                      {incident.auditTrail && incident.auditTrail.length > 0 && (
                        <button
                          onClick={() =>
                            setSelectedAuditTrail({
                              title: `${incident.id} — ${incident.title}`,
                              entries: incident.auditTrail || [],
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:text-stone-950 hover:border-stone-400 text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          <History className="w-3.5 h-3.5 text-[#B99A60]" />
                          <span>Audit Trail ({incident.auditTrail.length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Corrective Actions (CAPA) Log Section */}
        <section className="bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <span>Verifiable Corrective Actions (CAPA Registry)</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-0.5 font-medium">
                ISO 22000 compliant remedial action log with supervisor verification signatures.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {correctiveActions.map((capa) => (
              <div
                key={capa.id}
                className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50/50 space-y-2 flex flex-col justify-between text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#183C2B] text-xs">{capa.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        capa.verificationStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {capa.verificationStatus}
                    </span>
                  </div>

                  <strong className="text-sm font-bold text-stone-900 block leading-snug">
                    Ref: {capa.incidentRef}
                  </strong>
                  <p className="text-stone-600 font-medium leading-relaxed">{capa.actionTaken}</p>
                </div>

                <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 space-y-1">
                  <div>Assigned: <strong className="text-stone-700">{capa.assignedStaff}</strong></div>
                  <div>Log: <span className="text-stone-700 italic">{capa.remedialVerificationLog}</span></div>
                  {capa.verificationStatus === 'pending-supervisor' && (
                    <button
                      onClick={() => handleSupervisorSignOff(capa.id, capa.incidentRef)}
                      className="mt-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      Approve &amp; Sign Off
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Audit Trail Inspection Modal */}
      {selectedAuditTrail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="relative w-full max-w-xl bg-white border-2 border-stone-300 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-[#123524] text-white px-6 py-4 flex items-center justify-between border-b border-[#B99A60]/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#B99A60]" />
                <div>
                  <h3 className="text-base font-bold text-white">Immutable Audit Trail</h3>
                  <p className="text-xs text-stone-300">{selectedAuditTrail.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditTrail(null)}
                className="text-stone-300 hover:text-white p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="relative border-l-2 border-stone-300 ml-3 space-y-6 pl-5">
                {selectedAuditTrail.entries.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative group">
                    <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[#183C2B] border-2 border-white"></span>
                    <div className="flex items-baseline justify-between gap-2">
                      <strong className="text-sm font-bold text-stone-900">{entry.action}</strong>
                      <span className="font-mono text-[11px] text-stone-500">{entry.at}</span>
                    </div>
                    <div className="text-xs text-stone-700 font-medium mt-0.5">
                      Actor: <strong className="text-[#183C2B]">{entry.actor}</strong>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                      {entry.detail}
                    </p>
                    {entry.previousStatus && entry.newStatus && (
                      <div className="mt-1 text-[11px] text-stone-500">
                        Status: <span className="line-through">{entry.previousStatus}</span> &rarr;{' '}
                        <strong className="text-emerald-700">{entry.newStatus}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedAuditTrail(null)}
                className="px-5 py-2 rounded-xl bg-[#183C2B] text-white text-xs font-bold cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Probe Check Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in font-sans">
          <div className="relative w-full max-w-md bg-white border-2 border-stone-300 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <Thermometer className="w-6 h-6 text-[#183C2B]" />
                <h3 className="text-lg font-extrabold text-stone-900">
                  Log Handheld Probe Check
                </h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-stone-500 hover:text-stone-900 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogManualReading} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1.5">
                  Station / Probe Location
                </label>
                <select
                  value={manualProbe}
                  onChange={(e) => setManualProbe(e.target.value)}
                  className="w-full p-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:border-[#183C2B]"
                >
                  <option value="Tandoor Grill B">Tandoor Grill B (Safe: &ge;74°C)</option>
                  <option value="Steam Table Well">Steam Table Well (Safe: &ge;63°C)</option>
                  <option value="Chiller Bay 2">Chiller Bay 2 (Safe: &le;4°C)</option>
                  <option value="Walk-in Chiller 1">Walk-in Chiller 1 (Safe: &le;4°C)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1.5">
                  Measured Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={manualTemp}
                  onChange={(e) => setManualTemp(e.target.value)}
                  className="w-full p-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-base font-black text-stone-900 focus:outline-none focus:border-[#183C2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1.5">
                  Supervisor Notes
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-xs text-stone-900 font-medium focus:outline-none focus:border-[#183C2B]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#183C2B] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#24523C] shadow-sm cursor-pointer"
                >
                  Save to Shift Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
