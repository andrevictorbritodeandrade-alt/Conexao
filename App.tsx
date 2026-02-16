import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Calendar as CalendarIcon, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  User, 
  Flame, 
  Pill, 
  Droplets,
  CheckCircle2,
  Plus,
  X as XIcon,
  Edit3,
  Smile,
  Frown,
  Meh,
  LogOut,
  Sparkles,
  Zap,
  CalendarHeart,
  Ban,
  PlayCircle,
  StopCircle,
  Cloud,
  Check,
  ArrowRight,
  Smartphone
} from 'lucide-react';

// --- Types ---
interface Record {
  id: string;
  date: string;
  hadSex: boolean;
  libido: number;
  masturbated: boolean;
  usedTadala: boolean;
  
  // Legacy support (will be treated as periodEnds)
  periodEnded: boolean; 

  // New Cycle Tracking
  periodStarts?: boolean; // Menstruação desceu
  periodEnds?: boolean;   // Menstruação acabou
  medsStarts?: boolean;   // Começou cartela
  medsEnds?: boolean;     // Parou cartela (Pausa)
  
  timestamp: number;
}

interface LibidoLevel {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

// --- Constants ---
// Red/Passion Theme Colors
const LIBIDO_LEVELS: { [key: number]: LibidoLevel } = {
  1: { label: "Zero", value: 1, color: "#9ca3af", icon: <Frown size={32} /> }, // Gray
  2: { label: "Baixa", value: 2, color: "#fca5a5", icon: <Meh size={32} /> }, // Light Red
  3: { label: "Média", value: 3, color: "#ef4444", icon: <Smile size={32} /> }, // Red
  4: { label: "Alta", value: 4, color: "#b91c1c", icon: <Flame size={32} /> }, // Dark Red
  5: { label: "Pico", value: 5, color: "#7f1d1d", icon: <Flame size={32} fill="currentColor" /> } // Deep Blood Red
};

// --- Components ---

// Intro Logo (Big)
const IntroLogo = () => (
  <div className="flex flex-col items-center select-none">
    <div className="relative mb-2">
      <div className="absolute inset-0 bg-red-600 blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative w-24 h-24 bg-gradient-to-br from-red-600 to-red-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/50 rotate-3 transform transition-transform duration-700 hover:rotate-0 border border-red-500/20">
        <Flame size={48} className="text-white drop-shadow-md" fill="currentColor" />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50 pointer-events-none"></div>
      </div>
    </div>
    <h1 className="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl mt-4">
      CONEXÃO
    </h1>
    <div className="flex items-center gap-3 mt-1 opacity-80">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-red-400"></div>
      <p className="text-red-400 text-xs font-bold tracking-[0.4em] uppercase">Performance</p>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-red-400"></div>
    </div>
  </div>
);

// Header Logo (Text only, matched to screenshot)
const HeaderLogo = () => (
  <span className="text-2xl font-black italic tracking-tighter text-[#ff5722] leading-none">
    CONEXÃO
  </span>
);

const App: React.FC = () => {
  // State
  const [hasEntered, setHasEntered] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  
  // Check-in Form State
  const [checkinLibido, setCheckinLibido] = useState<number>(3);
  
  // User Activities
  const [checkinActivities, setCheckinActivities] = useState({
    hadSex: false,
    masturbated: false,
    usedTadala: false
  });

  // Partner Activities (Marcelly)
  const [checkinPartner, setCheckinPartner] = useState({
    periodStarts: false,
    periodEnds: false, // Replaces periodEnded logic
    medsStarts: false,
    medsEnds: false
  });

  // Load Data with Fallback
  useEffect(() => {
    const saved = localStorage.getItem('conexao_v7_data');
    const currentYear = new Date().getFullYear();

    // Calculate Yesterday for Initial Data
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Create the "Yesterday" record (Only used if no data exists)
    const yesterdayRequest: Record = {
      id: 'yesterday-manual-' + Date.now(),
      date: yesterdayStr,
      hadSex: true,
      libido: 5, 
      masturbated: true,
      usedTadala: false,
      periodEnded: false,
      timestamp: yesterdayDate.getTime()
    };

    if (saved) {
      try {
        const loadedRecords = JSON.parse(saved);
        setRecords(loadedRecords);
      } catch (e) {
        console.error("Erro ao carregar, reiniciando dados", e);
        setRecords([yesterdayRequest]);
      }
    } else {
      // Initialize with sample data
      const initialData: Record[] = [
        { id: '1', date: `${currentYear}-01-10`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-10`) },
        { id: '2', date: `${currentYear}-01-18`, hadSex: true, libido: 3, masturbated: false, usedTadala: true, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-18`) },
        { id: '3', date: `${currentYear}-01-24`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-24`) },
        { id: '4', date: `${currentYear}-02-01`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-02-01`) },
        { id: '5', date: `${currentYear}-02-04`, hadSex: true, libido: 5, masturbated: true, usedTadala: false, periodEnded: true, timestamp: Date.parse(`${currentYear}-02-04`) },
        { id: '6', date: `${currentYear}-02-15`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-02-15`) },
        yesterdayRequest
      ];
      setRecords(initialData);
    }
  }, []);

  // Save Data Persistence
  useEffect(() => {
    if (records.length > 0) {
      setSaveStatus('saving');
      localStorage.setItem('conexao_v7_data', JSON.stringify(records));
      
      const timer = setTimeout(() => {
        setSaveStatus('saved');
      }, 600);
      
      return () => clearTimeout(timer);
    }
  }, [records]);

  // Helpers
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date === todayStr);

  const handleOpenCheckin = () => {
    if (todayRecord) {
      setCheckinLibido(todayRecord.libido);
      setCheckinActivities({
        hadSex: todayRecord.hadSex,
        masturbated: todayRecord.masturbated,
        usedTadala: todayRecord.usedTadala,
      });
      setCheckinPartner({
        periodStarts: todayRecord.periodStarts || false,
        periodEnds: todayRecord.periodEnds || todayRecord.periodEnded || false,
        medsStarts: todayRecord.medsStarts || false,
        medsEnds: todayRecord.medsEnds || false
      });
    } else {
      setCheckinLibido(3);
      setCheckinActivities({ hadSex: false, masturbated: false, usedTadala: false });
      setCheckinPartner({ periodStarts: false, periodEnds: false, medsStarts: false, medsEnds: false });
    }
    setIsCheckinOpen(true);
  };

  const handleSaveCheckin = () => {
    const newRecord: Record = {
      id: todayRecord ? todayRecord.id : Date.now().toString(),
      date: todayStr,
      libido: checkinLibido,
      ...checkinActivities,
      periodStarts: checkinPartner.periodStarts,
      periodEnds: checkinPartner.periodEnds,
      periodEnded: checkinPartner.periodEnds, 
      medsStarts: checkinPartner.medsStarts,
      medsEnds: checkinPartner.medsEnds,
      timestamp: Date.now()
    };

    let updatedRecords = [...records];
    const index = updatedRecords.findIndex(r => r.date === todayStr);
    
    if (index > -1) {
      updatedRecords[index] = newRecord;
    } else {
      updatedRecords.push(newRecord);
    }

    setRecords(updatedRecords);
    setIsCheckinOpen(false);
  };

  const toggleActivity = (key: keyof typeof checkinActivities) => {
    setCheckinActivities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePartner = (key: keyof typeof checkinPartner) => {
    setCheckinPartner(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Logic: Partner Libido Prediction (Selene Cycle) ---
  const getPartnerCycleInfo = () => {
    const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);
    
    const lastPeriodStart = sortedRecords.find(r => r.periodStarts);
    const lastPeriodEnd = sortedRecords.find(r => r.periodEnds || r.periodEnded);
    const lastMedsStart = sortedRecords.find(r => r.medsStarts);
    const lastMedsEnd = sortedRecords.find(r => r.medsEnds);

    let statusText = "Aguardando dados";
    let statusColor = "text-gray-300";
    let predictedLibido = 3;
    let daysSinceEnd = 0;
    let nextPeakDate = new Date();
    let nextPeriodDate: Date | null = null;
    let cycleDay = 0;

    const tStart = lastPeriodStart ? lastPeriodStart.timestamp : 0;
    const tEnd = lastPeriodEnd ? lastPeriodEnd.timestamp : 0;

    // Calculate Cycle Day
    if (lastPeriodStart) {
      const start = new Date(lastPeriodStart.date + 'T12:00:00');
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      cycleDay = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
      
      // Predict Next Period (28 days from start)
      nextPeriodDate = new Date(start);
      nextPeriodDate.setDate(start.getDate() + 28);
    } else {
        // Fallback cycle day
        cycleDay = 12; // Placeholder
    }

    // Determine Status
    if (tStart > tEnd) {
      statusText = "Menstruada";
      statusColor = "text-rose-300";
      predictedLibido = 1;
    } else if (tEnd > 0) {
      const endDate = new Date(lastPeriodEnd!.date + 'T12:00:00');
      const today = new Date();
      const diffTime = today.getTime() - endDate.getTime();
      daysSinceEnd = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (daysSinceEnd < 0) daysSinceEnd = 0;

      if (daysSinceEnd === 0) {
        statusText = "Fim do Ciclo";
        predictedLibido = 5;
      } else if (daysSinceEnd <= 2) {
        statusText = "Pico Sem Med";
        predictedLibido = 5;
      } else {
        statusText = "Ciclo Normal";
        predictedLibido = 3;
      }
      
      // Rough next peak (Ovulation area ~14 days from start, or purely fictional based on logic)
      nextPeakDate = new Date();
      nextPeakDate.setDate(nextPeakDate.getDate() + 5); // Placeholder
    }

    return { predictedLibido, statusText, statusColor, daysSinceEnd, nextPeakDate, nextPeriodDate, cycleDay };
  };

  const partnerInfo = getPartnerCycleInfo();

  // --- Render Functions ---

  const renderIntroScreen = () => (
    <div className="min-h-screen bg-[#1a0505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(220,38,38,0.2)_0%,rgba(0,0,0,0)_70%)] pointer-events-none"></div>
      
      <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000 w-full max-w-md">
        <div className="mb-8 w-full flex justify-center scale-105">
           <IntroLogo />
        </div>
        
        <button 
          onClick={() => setHasEntered(true)}
          className="group relative w-full max-w-[200px] flex items-center justify-center py-4 px-8 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full font-bold text-lg tracking-wide shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95 mt-4"
        >
          <span className="relative z-10">ENTRAR</span>
          <div className="absolute inset-0 rounded-full bg-red-500 blur-md opacity-0 group-hover:opacity-50 transition-opacity"></div>
        </button>
      </div>
      
      <p className="absolute bottom-8 text-white/20 text-xs">v.7.5.0</p>
    </div>
  );

  const renderCheckinModal = () => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[40px] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-900">Check-in Diário</h2>
          <button onClick={() => setIsCheckinOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
            <XIcon size={24} strokeWidth={3} />
          </button>
        </div>
        {/* Same Checkin Content as before, keeping functionality */}
        <div className="mb-6">
          <p className="text-lg font-bold text-gray-500 mb-3 text-center">Nível de desejo (Você)</p>
          <div className="flex justify-between gap-1 bg-gray-50 p-2 rounded-3xl">
            {[1, 2, 3, 4, 5].map((level) => (
              <button key={level} onClick={() => setCheckinLibido(level)} className={`flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 border-4 ${checkinLibido === level ? 'border-transparent scale-110 shadow-lg text-white' : 'border-transparent text-gray-300 hover:bg-gray-100'}`} style={{ backgroundColor: checkinLibido === level ? LIBIDO_LEVELS[level].color : 'transparent' }}>
                {LIBIDO_LEVELS[level].icon}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <p className="text-lg font-bold text-gray-500 mb-3 text-center">Suas Atividades</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => toggleActivity('hadSex')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinActivities.hadSex ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-red-100'}`}>
              <Heart size={24} fill={checkinActivities.hadSex ? "currentColor" : "none"} strokeWidth={3} />
              <span className="font-bold text-xs">Transamos</span>
            </button>
            <button onClick={() => toggleActivity('masturbated')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinActivities.masturbated ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-orange-100'}`}>
              <User size={24} strokeWidth={3} />
              <span className="font-bold text-xs">Solo</span>
            </button>
            <button onClick={() => toggleActivity('usedTadala')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinActivities.usedTadala ? 'bg-slate-700 border-slate-700 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-slate-100'}`}>
              <Pill size={24} strokeWidth={3} />
              <span className="font-bold text-xs">Tadala</span>
            </button>
          </div>
        </div>
        <div className="mb-8 bg-rose-50 p-4 rounded-3xl border border-rose-100">
           <p className="text-lg font-bold text-rose-500 mb-3 text-center flex items-center justify-center gap-2"><CalendarHeart size={20} /> Ciclo da Marcelly</p>
           <div className="grid grid-cols-2 gap-3">
              <button onClick={() => togglePartner('periodStarts')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinPartner.periodStarts ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-white border-white text-gray-400 hover:border-rose-200'}`}><Droplets size={24} strokeWidth={3} /><span className="font-bold text-xs">Desceu</span></button>
              <button onClick={() => togglePartner('periodEnds')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinPartner.periodEnds ? 'bg-yellow-500 border-yellow-500 text-white shadow-md' : 'bg-white border-white text-gray-400 hover:border-yellow-200'}`}><Sparkles size={24} strokeWidth={3} /><span className="font-bold text-xs">Acabou</span></button>
              <button onClick={() => togglePartner('medsStarts')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinPartner.medsStarts ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-white text-gray-400 hover:border-blue-200'}`}><PlayCircle size={24} strokeWidth={3} /><span className="font-bold text-xs">Retomou Med</span></button>
              <button onClick={() => togglePartner('medsEnds')} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${checkinPartner.medsEnds ? 'bg-orange-400 border-orange-400 text-white shadow-md' : 'bg-white border-white text-gray-400 hover:border-orange-200'}`}><StopCircle size={24} strokeWidth={3} /><span className="font-bold text-xs">Iniciou Pausa</span></button>
           </div>
        </div>
        <button onClick={handleSaveCheckin} className="w-full py-5 bg-gray-900 text-white rounded-3xl text-xl font-black uppercase tracking-wide shadow-xl active:scale-95 transition-transform">Salvar Dia</button>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // History data: Sort desc
    const sortedHistory = [...records]
      .filter(r => r.hadSex || r.masturbated || r.periodEnded || r.usedTadala)
      .sort((a,b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Last 10 interesting events

    const sexCount = records.filter(r => r.hadSex).length;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Dates */}
        <div className="flex justify-between items-end px-2">
           <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider">HOJE</h2>
           <span className="text-sm font-bold text-red-500 capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</span>
        </div>

        {/* HERO CARD: "Registrar" (Red) or "Status" (White) */}
        {!todayRecord ? (
          <button 
            onClick={handleOpenCheckin}
            className="w-full bg-[#c62828] text-white rounded-[40px] p-8 shadow-xl shadow-red-900/20 relative overflow-hidden group active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-4 min-h-[220px]"
          >
             {/* Glossy top */}
             <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
             
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
               <Plus size={40} strokeWidth={3} className="text-white" />
             </div>
             
             <div className="z-10">
               <h3 className="text-3xl font-black tracking-tight">Registrar</h3>
               <p className="text-red-100 text-sm font-medium opacity-90 mt-1">Como está o fogo hoje?</p>
             </div>
             
             {/* Bottom glow */}
             <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full h-20 bg-red-500 blur-3xl opacity-50" />
          </button>
        ) : (
          <div onClick={handleOpenCheckin} className="bg-white p-6 rounded-[40px] shadow-lg shadow-gray-200/50 border border-gray-100 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-red-600"><Edit3 size={40} /></div>
             <div className="flex items-center gap-4 mb-4">
               <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg" style={{ backgroundColor: LIBIDO_LEVELS[todayRecord.libido].color }}>
                 {LIBIDO_LEVELS[todayRecord.libido].icon}
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase mb-1">Desejo Atual</p>
                 <p className="text-3xl font-black text-gray-900 leading-none">{LIBIDO_LEVELS[todayRecord.libido].label}</p>
               </div>
             </div>
             <div className="flex flex-wrap gap-2">
                 {todayRecord.hadSex && <span className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-black flex items-center gap-1.5"><Heart size={14} fill="currentColor" /> Sexo</span>}
                 {todayRecord.masturbated && <span className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-black flex items-center gap-1.5"><User size={14} /> Solo</span>}
             </div>
          </div>
        )}

        {/* SINCRONIA CARD (Dark Brown) */}
        <section className="bg-[#3f1212] rounded-[40px] p-6 text-white shadow-xl relative overflow-hidden">
           {/* Background gradient/glow */}
           <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-red-900/40 to-transparent pointer-events-none" />

           <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-2 text-red-300">
                <Sparkles size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Sincronia</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Ciclo Selene</p>
                <p className="text-lg font-black leading-none">Dia {partnerInfo?.cycleDay}</p>
              </div>
           </div>

           <h3 className="text-2xl font-black mb-6 relative z-10">Sincronizados</h3>

           {/* Score Cards */}
           <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="flex-1 bg-[#2a0a0a] rounded-2xl p-3 flex flex-col items-center border border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Você</span>
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-lg font-black shadow-lg shadow-red-500/30">
                  {todayRecord ? todayRecord.libido : checkinLibido}
                </div>
              </div>
              
              <Zap size={24} className="text-red-500/50" fill="currentColor" />

              <div className="flex-1 bg-[#2a0a0a] rounded-2xl p-3 flex flex-col items-center border border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ela (Prev)</span>
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-lg font-black shadow-lg shadow-red-500/30">
                   {partnerInfo?.predictedLibido}
                </div>
              </div>
           </div>

           {/* Status Dela */}
           <div className="bg-[#2a0a0a] rounded-2xl p-4 mb-4 border border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><CalendarHeart size={20} /></div>
                 <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Status Dela</span>
                    <p className="text-lg font-black leading-tight">{partnerInfo?.statusText}</p>
                 </div>
              </div>
           </div>

           {/* Dates */}
           <div className="space-y-1 relative z-10">
              <div className="flex justify-between text-xs">
                 <span className="text-red-200/60 font-medium">Próximo Pico:</span>
                 <span className="font-black text-yellow-400">{partnerInfo?.nextPeakDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}.</span>
              </div>
              <div className="flex justify-between text-xs">
                 <span className="text-red-200/60 font-medium">Prev. Menstruação:</span>
                 <span className="font-black text-white">{partnerInfo?.nextPeriodDate ? partnerInfo.nextPeriodDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : '--'}.</span>
              </div>
           </div>
        </section>

        {/* CALENDAR CARD (White) */}
        <section className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100">
           <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="text-gray-300 hover:text-gray-600"><ChevronLeft size={24} strokeWidth={3} /></button>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="text-gray-300 hover:text-gray-600"><ChevronRight size={24} strokeWidth={3} /></button>
           </div>
           
           {/* Weekdays */}
           <div className="grid grid-cols-7 mb-4 text-center">
             {['D','S','T','Q','Q','S','S'].map(d => (
               <div key={d} className="text-[10px] font-black text-gray-300">{d}</div>
             ))}
           </div>

           {/* Days */}
           <div className="grid grid-cols-7 gap-y-3 gap-x-1">
             {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`} />)}
             {Array.from({length: daysInMonth}).map((_, i) => {
               const day = i + 1;
               const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
               const rec = records.find(r => r.date === dStr);
               const isToday = dStr === todayStr;
               
               // Styling logic based on screenshot
               // Selected/Record days have red backgrounds
               // Today is black if no record? Or handle click
               const hasRecord = !!rec;
               
               return (
                 <div 
                    key={day} 
                    onClick={() => { if(dStr === todayStr) handleOpenCheckin(); }}
                    className={`
                      aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all cursor-default
                      ${hasRecord 
                        ? 'bg-[#ef4444] text-white shadow-md shadow-red-500/20' 
                        : isToday 
                          ? 'bg-slate-900 text-white shadow-lg' 
                          : 'bg-transparent text-gray-300 hover:bg-gray-50'}
                    `}
                 >
                    <span className="text-xs font-black">{day}</span>
                    
                    {/* Dots for extra info */}
                    {rec?.periodEnded && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full border border-red-500"></div>
                    )}
                 </div>
               );
             })}
           </div>
        </section>

        {/* OSCILAÇÃO CARD (Chart) */}
        <section className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100">
           <div className="flex items-center gap-2 mb-4 text-gray-400">
              <Activity size={18} />
              <h3 className="text-sm font-black uppercase tracking-widest">Oscilação</h3>
           </div>
           
           <div className="h-48 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...records].sort((a,b) => a.timestamp - b.timestamp).slice(-15)}>
                <defs>
                  <linearGradient id="colorLibido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).getDate().toString() + '/' + (new Date(val).getMonth()+1)} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                  interval={2}
                />
                <YAxis 
                  domain={[0, 6]} 
                  hide={false}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(val) => {
                     if(val===5) return 'Pico';
                     if(val===4) return 'Alta';
                     if(val===3) return 'Média';
                     if(val===2) return 'Baixa';
                     if(val===1) return 'Zero';
                     return '';
                  }}
                  tick={{ fill: '#d1d5db', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                  cursor={{stroke: '#fca5a5', strokeWidth: 2}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 800, color: '#1f2937' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="libido" 
                  stroke="#ef4444" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorLibido)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </section>

        {/* HISTÓRICO LIST */}
        <section>
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Histórico</h3>
            <span className="text-xs font-bold text-red-500">{sexCount} transas</span>
          </div>

          <div className="space-y-3">
             {sortedHistory.map((rec) => (
                <div key={rec.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-gray-100 flex items-start gap-4">
                   {/* Icon Box */}
                   <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0" 
                      style={{ backgroundColor: LIBIDO_LEVELS[rec.libido].color }}
                   >
                      {LIBIDO_LEVELS[rec.libido].icon}
                   </div>
                   
                   {/* Content */}
                   <div className="flex-1 py-1">
                      <div className="flex justify-between items-start mb-1">
                         <h4 className="text-lg font-black text-slate-900">
                           {new Date(rec.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}.
                         </h4>
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-3">{LIBIDO_LEVELS[rec.libido].label.toUpperCase()}</p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                         {rec.hadSex && (
                           <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black flex items-center gap-1">
                              <Heart size={10} fill="currentColor" /> Transa
                           </span>
                         )}
                         {rec.masturbated && (
                           <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black flex items-center gap-1">
                              <User size={10} /> Solo
                           </span>
                         )}
                         {rec.usedTadala && (
                           <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black flex items-center gap-1">
                              <Pill size={10} /> Tadala
                           </span>
                         )}
                         {(rec.periodEnds || rec.periodEnded) && (
                           <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black flex items-center gap-1">
                              <Sparkles size={10} /> Acabou
                           </span>
                         )}
                      </div>
                   </div>
                </div>
             ))}
             {sortedHistory.length === 0 && (
                <div className="text-center py-8 text-gray-400 font-bold text-sm opacity-50">
                   Nenhum registro relevante ainda.
                </div>
             )}
          </div>
        </section>

        {/* FOOTER (Developer Info) */}
        <footer className="mt-8 py-8 text-center">
          <div className="flex flex-col items-center">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-900/20 mb-1">
              CONEXÃO - GESTÃO DE PERFORMANCE
            </h4>
            <p className="text-[10px] font-bold text-red-900/20 mb-4">
              Desenvolvido por André Brito
            </p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-red-100 shadow-sm">
               <Smartphone size={14} className="text-red-300" strokeWidth={2.5} />
               <span className="text-xs font-bold tracking-wider text-gray-400">21 994 527 694</span>
            </div>
          </div>
        </footer>

      </div>
    );
  };

  // Main Render
  if (!hasEntered) {
    return renderIntroScreen();
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5] font-sans text-slate-900 selection:bg-red-200 flex flex-col">
      {/* HEADER (Matching Screenshot) */}
      <header className="sticky top-0 z-30 bg-[#FFF5F5]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <HeaderLogo />
           {saveStatus === 'saved' && (
             <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
               <Check size={10} /> Salvo
             </span>
           )}
        </div>
        <button 
          onClick={() => setHasEntered(false)}
          className="w-10 h-10 rounded-full bg-white border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
        >
          <LogOut size={18} strokeWidth={2.5} />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 pt-2 flex-1 w-full">
        {renderDashboard()}
      </main>

      {/* Floating Checkin Modal */}
      {isCheckinOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsCheckinOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto w-full">
              {renderCheckinModal()}
            </div>
          </div>
        </>
      )}

      {/* Toast for Save Status (Saving only, Saved is in header now) */}
      {saveStatus === 'saving' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5">
           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
           <span className="font-bold text-sm">Salvando...</span>
        </div>
      )}

    </div>
  );
};

export default App;