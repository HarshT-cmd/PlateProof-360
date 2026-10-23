import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Flame,
  AlertCircle,
  Leaf,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const InteractiveDishExplorer: React.FC = () => {
  const [activeHotspot, setActiveHotspot] = useState<number>(0);

  const checkpoints = [
    {
      id: 0,
      icon: Flame,
      num: '1',
      tag: 'Core Temperature',
      title: '82.4°C Cooking Verification',
      value: '82.4°C',
      subtitle: 'Critical Control Point 1 (Passed)',
      description: 'Logged with calibrated BLE thermocouple probe at skewer extraction. Exceeds the mandatory 74.0°C microbial destruction threshold with a safe +8.4°C operating margin.',
      badgeColor: 'bg-[#183C2B] text-white',
      x: '50%',
      y: '48%',
    },
    {
      id: 1,
      icon: Leaf,
      num: '2',
      tag: 'Single-Source Dairy',
      title: 'Nilgiris Highlands Farm Co-op',
      value: 'Lot MM-8812',
      subtitle: 'Cold-Chain 3.4°C & FTIR Pure',
      description: 'Fresh organic cow-milk paneer received under unbroken cold chain standards. Rapid FTIR screening verified 100% pure without starch or synthetic adulterants.',
      badgeColor: 'bg-[#183C2B] text-white',
      x: '32%',
      y: '35%',
    },
    {
      id: 2,
      icon: AlertCircle,
      num: '3',
      tag: 'Allergen Isolation',
      title: 'Milk & Cashew Declaration',
      value: '2 Declared',
      subtitle: 'Segregated Preparation Utensils',
      description: 'Ground W320 Mangalore cashews and cultured paneer handled in designated prep bays with dedicated blue/yellow stainless cookware to prevent cross-contact.',
      badgeColor: 'bg-amber-800 text-white',
      x: '68%',
      y: '60%',
    },
    {
      id: 3,
      icon: ShieldCheck,
      num: '4',
      tag: 'Surface Hygiene',
      title: 'Pre-Service ATP Bioluminescence',
      value: '12 RLU',
      subtitle: 'Surface Swab Pass (<30 RLU Standard)',
      description: 'Prep stations, chef knives, and plating surfaces swabbed and sanitized with food-contact quat solutions before lunch service.',
      badgeColor: 'bg-stone-800 text-white',
      x: '28%',
      y: '68%',
    },
  ];

  const current = checkpoints[activeHotspot];

  return (
    <section id="dish-inspection" className="py-20 bg-[#FAF7F0] border-b border-[#22241F]/10 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#B99A60]">
            <span>Dish Telemetry</span>
            <span>&middot;</span>
            <span>Sample Attestation #1042</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#183C2B] font-semibold">
            Point-of-Service Food Verification
          </h2>
          <p className="text-sm text-[#55584F] leading-relaxed">
            Click on any checkpoint below to examine verified thermocouple telemetry, allergen handling protocols, and agricultural intake lot records.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {checkpoints.map((cp) => {
            const Icon = cp.icon;
            const isActive = activeHotspot === cp.id;
            return (
              <button
                key={cp.id}
                onClick={() => setActiveHotspot(cp.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#183C2B] text-white border-[#183C2B] shadow-xs'
                    : 'bg-white text-[#55584F] border-[#22241F]/15 hover:border-[#183C2B] hover:text-[#183C2B]'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isActive ? 'bg-[#B99A60] text-[#183C2B]' : 'bg-stone-200 text-[#55584F]'
                }`}>
                  {cp.num}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#B99A60]' : 'text-[#808477]'}`} />
                <span>{cp.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Inspection Card Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-6 sm:p-8 rounded-2xl border border-[#22241F]/15 shadow-sm">
          
          {/* Dish Visual with Interactive Checkpoints */}
          <div className="lg:col-span-7 relative">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#22241F]/10 shadow-xs">
              <img
                src="/images/paneer_tikka_masala.jpg"
                alt="Artisanal Paneer Tikka Masala verified batch"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-stone-900/10 pointer-events-none"></div>

              {/* Numbered Hotspot Pins */}
              {checkpoints.map((cp) => {
                const isActive = activeHotspot === cp.id;
                return (
                  <button
                    key={cp.id}
                    onClick={() => setActiveHotspot(cp.id)}
                    style={{ left: cp.x, top: cp.y }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-all duration-200 z-10 ${
                      isActive ? 'scale-115 ring-4 ring-[#B99A60]/60 ring-offset-2' : 'scale-100 hover:scale-105'
                    }`}
                    title={cp.tag}
                  >
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shadow-md text-white font-bold text-xs ${
                      isActive ? 'bg-[#183C2B] text-[#B99A60]' : 'bg-[#183C2B]/90 text-white'
                    } border-2 border-white`}>
                      {cp.num}
                    </span>
                  </button>
                );
              })}

              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-medium text-[#183C2B] shadow-xs border border-[#22241F]/10 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Order #1042 Attestation Live</span>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${current.badgeColor}`}>
                {current.tag}
              </span>
              <span className="text-xs text-[#808477] font-medium">
                Checkpoint {current.num} of 4
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-stone-900 tracking-tight font-sans">
                {current.title}
              </h3>
              <p className="text-xs font-bold text-[#8E733E]">
                {current.subtitle}
              </p>
            </div>

            {/* Measurement Box */}
            <div className="p-4 rounded-xl bg-stone-50 border-2 border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-stone-600 block tracking-wider">
                  Calibrated Parameter
                </span>
                <strong className="text-3xl sm:text-4xl font-extrabold text-stone-950 font-sans tracking-tight">
                  {current.value}
                </strong>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-[#22241F]/10 shadow-xs text-[#183C2B]">
                <current.icon className="w-5 h-5 text-[#183C2B]" />
              </div>
            </div>

            <p className="text-xs text-[#55584F] leading-relaxed">
              {current.description}
            </p>

            <div className="pt-2">
              <Link
                to="/order/order-1042"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#183C2B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#24523C] shadow-xs transition-all"
              >
                <span>View Full Order Ledger (#1042)</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#B99A60]" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
