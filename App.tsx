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
  Check
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

// Simple Text Logo Component
const ConexaoTextLogo = ({ size = "large" }: { size?: "small" | "large" }) => (
  <div className={`font-black tracking-tighter italic select-none w-full text-center ${
    size === 'large' 
      ? 'text-5xl sm:text-7xl' 
      : 'text-2xl sm:text-3xl'
  }`}>
    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7f1d1d] via-[#dc2626] to-[#fb923c] drop-shadow-sm px-2 py-1 inline-block">
      CONEXÃO
    </span>
  </div>
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

  // Load Data with Fallback & Inject User Request
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
        // Load data exactly as saved - DO NOT OVERWRITE with defaults
        // This ensures user changes are respected on reload
        setRecords(loadedRecords);
      } catch (e) {
        console.error("Erro ao carregar, reiniciando dados", e);
        // Fallback if error
        setRecords([yesterdayRequest]);
      }
    } else {
      // Initialize with sample data + yesterday's request (First run only)
      const initialData: Record[] = [
        { id: '1', date: `${currentYear}-01-10`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-10`) },
        { id: '2', date: `${currentYear}-01-18`, hadSex: true, libido: 3, masturbated: false, usedTadala: true, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-18`) },
        { id: '3', date: `${currentYear}-01-24`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-24`) },
        { id: '4', date: `${currentYear}-02-01`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-02-01`) },
        { id: '5', date: `${currentYear}-02-04`, hadSex: true, libido: 5, masturbated: true, usedTadala: false, periodEnded: true, timestamp: Date.parse(`${currentYear}-02-04`) },
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
      
      // Artificial delay to show the saving state briefly
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
      // Map partner fields
      periodStarts: checkinPartner.periodStarts,
      periodEnds: checkinPartner.periodEnds,
      periodEnded: checkinPartner.periodEnds, // Keep legacy synced
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
    // 1. Determine Current State based on last events
    const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);
    
    const lastPeriodStart = sortedRecords.find(r => r.periodStarts);
    const lastPeriodEnd = sortedRecords.find(r => r.periodEnds || r.periodEnded);
    const lastMedsStart = sortedRecords.find(r => r.medsStarts);
    const lastMedsEnd = sortedRecords.find(r => r.medsEnds);

    // Default State
    let statusText = "Aguardando dados";
    let statusColor = "text-gray-300";
    let predictedLibido = 3;
    let daysSinceEnd = 0;
    let nextPeakDate = new Date();
    let nextPeriodDate: Date | null = null;

    const tStart = lastPeriodStart ? lastPeriodStart.timestamp : 0;
    const tEnd = lastPeriodEnd ? lastPeriodEnd.timestamp : 0;

    // PREDICT NEXT PERIOD START
    if (lastPeriodStart) {
       // Standard 28-day cycle from start date
       const sDate = new Date(lastPeriodStart.date + 'T12:00:00');
       nextPeriodDate = new Date(sDate);
       nextPeriodDate.setDate(sDate.getDate() + 28);
    } else if (lastPeriodEnd) {
       // Fallback: If we only have end date, assume 5 days duration, so start was End - 5.
       // Next start = (End - 5) + 28 = End + 23
       const eDate = new Date(lastPeriodEnd.date + 'T12:00:00');
       nextPeriodDate = new Date(eDate);
       nextPeriodDate.setDate(eDate.getDate() + 23);
    }
    
    // IS SHE ON PERIOD? (Start is more recent than End)
    if (tStart > tEnd) {
      statusText = "Menstruada 🩸";
      statusColor = "text-rose-300";
      predictedLibido = 1;
      // Recalculate peak based on predicted end? Hard to say. 
      // Let's keep nextPeakDate as a placeholder or based on previous data.
      return { predictedLibido, statusText, statusColor, daysSinceEnd: 0, nextPeakDate, nextPeriodDate }; 
    }

    // IS SHE OFF PERIOD?
    if (tEnd > 0) {
      const endDate = new Date(lastPeriodEnd!.date + 'T12:00:00');
      const today = new Date();
      const diffTime = today.getTime() - endDate.getTime();
      daysSinceEnd = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysSinceEnd < 0) daysSinceEnd = 0; // Future safety

      // Logic after period ends
      if (daysSinceEnd === 0) {
        statusText = "Fim do Ciclo (Hoje)";
        statusColor = "text-white font-black";
        predictedLibido = 5;
      } else if (daysSinceEnd <= 2) {
        statusText = `Pico Sem Med (${daysSinceEnd}d)`;
        statusColor = "text-white font-black";
        predictedLibido = 5;
      } else {
        // More than 3 days since period ended. Check Meds.
        const tMedsStart = lastMedsStart ? lastMedsStart.timestamp : 0;
        const tMedsEnd = lastMedsEnd ? lastMedsEnd.timestamp : 0;

        if (tMedsStart > tMedsEnd && tMedsStart > tEnd) {
          // She started meds after period
          statusText = "Estável (Com Med)";
          statusColor = "text-blue-200";
          predictedLibido = 3;
        } else if (tMedsEnd > tMedsStart && tMedsEnd > tEnd) {
          // She stopped meds recently (Pausa)
           statusText = "Pausa (Pré-Menstrual)";
           statusColor = "text-orange-300";
           predictedLibido = 4; // Often spikes before period
        } else {
           // Default fallback
           statusText = "Ciclo Normal";
           statusColor = "text-gray-300";
           predictedLibido = 3;
        }
      }
      
      // Calculate Next Peak (Roughly 28 days after last END + 1)
      nextPeakDate = new Date(endDate);
      nextPeakDate.setDate(endDate.getDate() + 29);

      return { predictedLibido, statusText, statusColor, daysSinceEnd, nextPeakDate, nextPeriodDate };
    }

    return null;
  };

  const partnerInfo = getPartnerCycleInfo();

  // --- Render Components ---

  const renderIntroScreen = () => (
    <div className="min-h-screen bg-[#1a0505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(220,38,38,0.2)_0%,rgba(0,0,0,0)_70%)] pointer-events-none"></div>
      
      <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000 w-full max-w-md">
        {/* Logo Text */}
        <div className="mb-12 w-full flex justify-center">
           <ConexaoTextLogo size="large" />
        </div>
        
        <p className="text-red-400 font-medium tracking-widest text-sm uppercase mb-12">Performance & Intimidade</p>
        
        <button 
          onClick={() => setHasEntered(true)}
          className="group relative w-full max-w-[200px] flex items-center justify-center py-4 px-8 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full font-bold text-lg tracking-wide shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95"
        >
          <span className="relative z-10">ENTRAR</span>
          <div className="absolute inset-0 rounded-full bg-red-500 blur-md opacity-0 group-hover:opacity-50 transition-opacity"></div>
        </button>
      </div>
      
      <p className="absolute bottom-8 text-white/20 text-xs">v.7.4.0 Updated Today</p>
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

        {/* Passo 1: Libido */}
        <div className="mb-6">
          <p className="text-lg font-bold text-gray-500 mb-3 text-center">Nível de desejo (Você)</p>
          <div className="flex justify-between gap-1 bg-gray-50 p-2 rounded-3xl">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setCheckinLibido(level)}
                className={`flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 border-4
                  ${checkinLibido === level 
                    ? 'border-transparent scale-110 shadow-lg text-white' 
                    : 'border-transparent text-gray-300 hover:bg-gray-100'
                  }`}
                style={{ backgroundColor: checkinLibido === level ? LIBIDO_LEVELS[level].color : 'transparent' }}
              >
                {LIBIDO_LEVELS[level].icon}
              </button>
            ))}
          </div>
          <p className="text-center font-black text-xl mt-2 uppercase" style={{ color: LIBIDO_LEVELS[checkinLibido].color }}>
            {LIBIDO_LEVELS[checkinLibido].label}
          </p>
        </div>

        {/* Passo 2: O que rolou */}
        <div className="mb-6">
          <p className="text-lg font-bold text-gray-500 mb-3 text-center">Suas Atividades</p>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => toggleActivity('hadSex')}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                ${checkinActivities.hadSex 
                  ? 'bg-red-600 border-red-600 text-white shadow-md' 
                  : 'bg-white border-gray-100 text-gray-400 hover:border-red-100'}`}
            >
              <Heart size={24} fill={checkinActivities.hadSex ? "currentColor" : "none"} strokeWidth={3} />
              <span className="font-bold text-xs">Transamos</span>
            </button>

            <button 
              onClick={() => toggleActivity('masturbated')}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                ${checkinActivities.masturbated 
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                  : 'bg-white border-gray-100 text-gray-400 hover:border-orange-100'}`}
            >
              <User size={24} strokeWidth={3} />
              <span className="font-bold text-xs">Solo</span>
            </button>

            <button 
              onClick={() => toggleActivity('usedTadala')}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                ${checkinActivities.usedTadala 
                  ? 'bg-slate-700 border-slate-700 text-white shadow-md' 
                  : 'bg-white border-gray-100 text-gray-400 hover:border-slate-100'}`}
            >
              <Pill size={24} strokeWidth={3} />
              <span className="font-bold text-xs">Tadala</span>
            </button>
          </div>
        </div>

        {/* Passo 3: Ciclo da Marcelly (NEW) */}
        <div className="mb-8 bg-rose-50 p-4 rounded-3xl border border-rose-100">
           <p className="text-lg font-bold text-rose-500 mb-3 text-center flex items-center justify-center gap-2">
             <CalendarHeart size={20} /> Ciclo da Marcelly
           </p>
           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => togglePartner('periodStarts')}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                  ${checkinPartner.periodStarts
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
                    : 'bg-white border-white text-gray-400 hover:border-rose-200'}`}
              >
                <Droplets size={24} strokeWidth={3} />
                <span className="font-bold text-xs">Desceu</span>
              </button>

              <button 
                onClick={() => togglePartner('periodEnds')}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                  ${checkinPartner.periodEnds
                    ? 'bg-yellow-500 border-yellow-500 text-white shadow-md' 
                    : 'bg-white border-white text-gray-400 hover:border-yellow-200'}`}
              >
                <Sparkles size={24} strokeWidth={3} />
                <span className="font-bold text-xs">Acabou</span>
              </button>

              <button 
                onClick={() => togglePartner('medsStarts')}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                  ${checkinPartner.medsStarts
                    ? 'bg-blue-500 border-blue-500 text-white shadow-md' 
                    : 'bg-white border-white text-gray-400 hover:border-blue-200'}`}
              >
                <PlayCircle size={24} strokeWidth={3} />
                <span className="font-bold text-xs">Retomou Med</span>
              </button>

              <button 
                onClick={() => togglePartner('medsEnds')}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all
                  ${checkinPartner.medsEnds
                    ? 'bg-orange-400 border-orange-400 text-white shadow-md' 
                    : 'bg-white border-white text-gray-400 hover:border-orange-200'}`}
              >
                <StopCircle size={24} strokeWidth={3} />
                <span className="font-bold text-xs">Iniciou Pausa</span>
              </button>
           </div>
        </div>

        <button 
          onClick={handleSaveCheckin}
          className="w-full py-5 bg-gray-900 text-white rounded-3xl text-xl font-black uppercase tracking-wide shadow-xl active:scale-95 transition-transform"
        >
          Salvar Dia
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => {
    // Calendar logic inline
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    // Sincronia Logic
    const userLibido = todayRecord ? todayRecord.libido : 3; // Default to media
    const herLibido = partnerInfo ? partnerInfo.predictedLibido : 3;
    const isMatched = userLibido >= 4 && herLibido >= 4;
    const isSync = Math.abs(userLibido - herLibido) <= 1;

    return (
      <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Status do Dia (Hero Card) */}
        <section>
          <div className="flex justify-between items-end mb-3 px-2">
             <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider">Hoje</h2>
             <span className="text-sm font-bold text-red-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</span>
          </div>

          {todayRecord ? (
            <div onClick={handleOpenCheckin} className="bg-white p-6 rounded-[32px] shadow-lg shadow-red-900/5 border-2 border-red-50 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-red-600">
                  <Edit3 size={40} />
               </div>
               
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg" style={{ backgroundColor: LIBIDO_LEVELS[todayRecord.libido].color }}>
                   {LIBIDO_LEVELS[todayRecord.libido].icon}
                 </div>
                 <div>
                   <p className="text-sm font-bold text-gray-400 uppercase mb-1">Desejo</p>
                   <p className="text-2xl font-black text-gray-800">{LIBIDO_LEVELS[todayRecord.libido].label}</p>
                 </div>
               </div>

               <div className="flex gap-2 flex-wrap">
                 {(!todayRecord.hadSex && !todayRecord.masturbated && !todayRecord.usedTadala) && (
                   <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm">Nada rolou</span>
                 )}
                 {todayRecord.hadSex && <span className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center gap-2"><Heart size={16} fill="currentColor"/> Transamos</span>}
                 {todayRecord.masturbated && <span className="px-4 py-2 bg-orange-100 text-orange-600 rounded-xl font-bold text-sm flex items-center gap-2"><User size={16}/> Solo</span>}
                 {todayRecord.usedTadala && <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2"><Pill size={16}/> Tadala</span>}
                 
                 {/* Partner Tags in Hero */}
                 {todayRecord.periodStarts && <span className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm flex items-center gap-2"><Droplets size={16}/> Desceu</span>}
                 {(todayRecord.periodEnds || todayRecord.periodEnded) && <span className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl font-bold text-sm flex items-center gap-2"><Sparkles size={16}/> Acabou</span>}
               </div>
            </div>
          ) : (
            <button 
              onClick={handleOpenCheckin}
              className="w-full bg-gradient-to-br from-red-600 to-red-800 text-white p-8 rounded-[32px] shadow-xl shadow-red-200 active:scale-[0.98] transition-all flex flex-col items-center text-center relative overflow-hidden group"
            >
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus size={32} />
              </div>
              <h3 className="text-2xl font-black mb-1">Registrar</h3>
              <p className="text-red-100 font-bold text-sm">Como está o fogo hoje?</p>
            </button>
          )}
        </section>

        {/* Card de Sincronia e Previsão (NOVO) */}
        <section className="bg-gradient-to-br from-red-900 to-[#2a0a0a] p-6 rounded-[32px] shadow-xl shadow-red-900/20 text-white relative overflow-hidden border border-red-800/50">
           {/* Efeito de fundo */}
           {isMatched && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>}

           <div className="flex justify-between items-start mb-6 relative z-10">
             <div>
               <h3 className="text-sm font-black text-red-200/70 uppercase tracking-wider flex items-center gap-2">
                 <Sparkles size={16} className={isMatched ? "text-yellow-400" : "text-red-300/50"} />
                 Sincronia
               </h3>
               {isMatched ? (
                 <p className="text-2xl font-black text-white mt-1">FOGO ALTO 🔥</p>
               ) : (
                 <p className="text-xl font-bold text-red-50 mt-1">{isSync ? "Sincronizados" : "Descompasso"}</p>
               )}
             </div>
             {partnerInfo && (
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-red-300/60">Ciclo Selene</p>
                  <p className="text-sm font-bold text-rose-300">Dia {partnerInfo.daysSinceEnd}</p>
                </div>
             )}
           </div>

           <div className="flex items-center gap-4 mb-8 relative z-10">
              {/* Você */}
              <div className="flex-1 bg-black/20 rounded-2xl p-3 flex flex-col items-center gap-2 border border-white/5">
                <span className="text-xs font-bold text-red-200/70 uppercase">Você</span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-sm" style={{ backgroundColor: LIBIDO_LEVELS[userLibido].color }}>
                   {userLibido}
                </div>
              </div>

              <div className="text-red-300/50">
                <Zap size={20} fill={isMatched ? "#fbbf24" : "none"} className={isMatched ? "text-yellow-400" : ""} />
              </div>

              {/* Ela */}
              <div className="flex-1 bg-black/20 rounded-2xl p-3 flex flex-col items-center gap-2 border border-white/5">
                <span className="text-xs font-bold text-red-200/70 uppercase">Ela (Prev)</span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-sm" style={{ backgroundColor: LIBIDO_LEVELS[herLibido].color }}>
                   {herLibido}
                </div>
              </div>
           </div>

           {/* Previsão */}
           <div className="bg-black/20 rounded-2xl p-4 border border-white/5 relative z-10">
              <div className="flex gap-3 items-center mb-2">
                <div className="p-2 bg-rose-500/20 rounded-full text-rose-300">
                  <CalendarHeart size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-200/60 uppercase">Status Dela</p>
                  <p className={`font-bold ${partnerInfo?.statusColor || 'text-white'}`}>
                    {partnerInfo ? partnerInfo.statusText : "Aguardando dado do ciclo..."}
                  </p>
                </div>
              </div>
              {partnerInfo && (
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
                  {partnerInfo.statusText.includes("Menstruada") === false && (
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-red-200/50">Próximo Pico:</span>
                        <span className="text-sm font-black text-yellow-400">
                            {partnerInfo.nextPeakDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>
                  )}
                  {partnerInfo.nextPeriodDate && (
                     <div className="flex justify-between items-center">
                        <span className="text-xs text-red-200/50">Prev. Menstruação:</span>
                        <span className="text-sm font-bold text-rose-300">
                            {partnerInfo.nextPeriodDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                     </div>
                  )}
                </div>
              )}
           </div>
        </section>

        {/* Calendar Widget Integrated */}
        <section className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-gray-50">
           <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><ChevronLeft size={20}/></button>
            <h2 className="text-lg font-black uppercase text-gray-800 tracking-wide">{new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><ChevronRight size={20}/></button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[10px] font-black text-gray-300 uppercase">{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const record = records.find(r => r.date === dateStr);
              const isToday = dateStr === todayStr;

              let bgClass = "bg-gray-50/50 text-gray-300"; 
              let borderClass = "border-2 border-transparent";
              
              if (record) {
                  if (record.hadSex) {
                    bgClass = "bg-red-500 text-white shadow-md shadow-red-200";
                    borderClass = "border-2 border-red-500";
                  }
                  else if (record.masturbated) {
                    bgClass = "bg-orange-100 text-orange-600";
                    borderClass = "border-2 border-orange-200";
                  }
                  else {
                    bgClass = "bg-white text-gray-600";
                    borderClass = "border-2 border-gray-200";
                  }
              } else if (isToday) {
                bgClass = "bg-gray-900 text-white";
              }

              return (
                <div key={day} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${bgClass} ${borderClass}`}>
                    <span className="font-bold text-xs z-10">{day}</span>
                    <div className="flex gap-0.5 absolute bottom-1 justify-center w-full">
                      {record?.usedTadala && <div className="w-1 h-1 rounded-full bg-slate-600 ring-1 ring-white"></div>}
                      {/* Partner Dots */}
                      {record?.periodStarts && <div className="w-1.5 h-1.5 rounded-full bg-rose-600 ring-1 ring-white"></div>}
                      {(record?.periodEnds || record?.periodEnded) && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 ring-1 ring-white"></div>}
                      {record?.medsStarts && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-white"></div>}
                    </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Gráfico */}
        <section className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-gray-50">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity size={18} className="text-red-500" /> Oscilação
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={[...records].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7)}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorLibido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value + 'T12:00:00');
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 6]}
                  ticks={[1, 2, 3, 4, 5]}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => LIBIDO_LEVELS[value]?.label || ""}
                />
                <Tooltip 
                  cursor={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', color: '#1f2937' }}
                  formatter={(value: any) => [LIBIDO_LEVELS[value as number]?.label, "Libido"]}
                  labelFormatter={(label) => {
                     const d = new Date(label + 'T12:00:00');
                     return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  }}
                />
                <Area type="monotone" dataKey="libido" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorLibido)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Histórico Recente */}
        <section>
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">Histórico</h3>
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
              {records.filter(r => r.hadSex).length} transas
            </span>
          </div>
          
          <div className="space-y-3">
            {[...records]
              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map(record => (
               <div key={record.id} className="bg-white p-4 rounded-3xl border-2 border-gray-50 flex flex-col gap-3">
                  {/* Header: Date & Libido */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md`} style={{ backgroundColor: LIBIDO_LEVELS[record.libido].color }}>
                      {LIBIDO_LEVELS[record.libido].icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase">
                        {LIBIDO_LEVELS[record.libido].label}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tags misturadas */}
                  <div className="flex flex-wrap gap-2">
                     {record.hadSex && (
                       <div className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <Heart size={14} fill="currentColor"/> Transa
                       </div>
                     )}
                     {record.masturbated && (
                       <div className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <User size={14}/> Solo
                       </div>
                     )}
                     {record.usedTadala && (
                       <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <Pill size={14}/> Tadala
                       </div>
                     )}
                     
                     {/* Partner History Tags */}
                     {record.periodStarts && (
                       <div className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <Droplets size={14}/> Desceu
                       </div>
                     )}
                     {(record.periodEnds || record.periodEnded) && (
                       <div className="px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <Sparkles size={14}/> Acabou
                       </div>
                     )}
                     {record.medsStarts && (
                       <div className="px-3 py-1.5 bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <PlayCircle size={14}/> Med
                       </div>
                     )}
                     {record.medsEnds && (
                       <div className="px-3 py-1.5 bg-orange-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5">
                         <StopCircle size={14}/> Pausa
                       </div>
                     )}
                  </div>
               </div>
            ))}
          </div>
        </section>

      </div>
    );
  };

  // Main Render Switch
  if (!hasEntered) {
    return renderIntroScreen();
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5] font-sans text-slate-900 flex justify-center selection:bg-red-200">
      <div className="w-full max-w-md bg-[#FFF5F5] min-h-screen relative shadow-2xl flex flex-col">
        
        {/* Header */}
        <header className="p-6 flex justify-between items-center bg-[#FFF5F5]/90 backdrop-blur-sm sticky top-0 z-30 border-b border-red-50">
          <div className="flex items-center justify-start gap-2">
             <ConexaoTextLogo size="small" />
             {saveStatus === 'saving' && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-bold border border-yellow-200 animate-pulse">
                  <Cloud size={12} /> Salvando...
                </div>
             )}
             {saveStatus === 'saved' && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-200 animate-in fade-in zoom-in duration-300">
                  <Check size={12} /> Salvo
                </div>
             )}
          </div>
          <button 
            onClick={() => setHasEntered(false)} 
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
             <LogOut size={18} />
          </button>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {renderDashboard()}
        </main>

        {/* Modal de Check-in */}
        {isCheckinOpen && renderCheckinModal()}
        
      </div>
    </div>
  );
};

export default App;