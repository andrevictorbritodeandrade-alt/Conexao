import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { 
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Calendar as CalendarIcon, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  User as UserIcon, 
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
  Sparkles,
  Zap,
  CalendarHeart,
  Ban,
  PlayCircle,
  StopCircle,
  Cloud,
  Check,
  ArrowRight,
  Smartphone,
  LogOut,
  LogIn,
  AlertCircle
} from 'lucide-react';

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// --- Error Handling ---
interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  console.error(`Firestore Error (${operationType}):`, error);
  if (error.code === 'permission-denied') {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: user ? {
        userId: user.uid,
        email: user.email || '',
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        providerInfo: user.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        }))
      } : {
        userId: 'anonymous',
        email: '',
        emailVerified: false,
        isAnonymous: true,
        providerInfo: []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

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

// Header Logo (Text only, matched to screenshot)
const HeaderLogo = () => (
  <span className="text-2xl font-black italic tracking-tighter text-brand-600 leading-none font-display">
    CONEXÃO
  </span>
);

const App: React.FC = () => {
  // Helpers
  const todayStr = new Date().toISOString().split('T')[0];

  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  
  // Controls which date we are currently editing
  const [editingDate, setEditingDate] = useState<string>(todayStr);

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

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
  }, []);

  // Sync with Firestore
  useEffect(() => {
    if (!currentUser) {
      // If not logged in, load from localStorage if available
      const saved = localStorage.getItem('conexao_v7_data');
      if (saved) {
        try {
          const loadedRecords = JSON.parse(saved);
          setRecords(loadedRecords);
        } catch (e) {
          console.error("Erro ao carregar do localStorage", e);
        }
      } else {
        // Default initial data logic if needed
        const currentYear = new Date().getFullYear();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
        const initialData: Record[] = [
          { id: 'm1', date: `${currentYear}-03-24`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-03-24`) },
          { id: 'm2', date: `${currentYear}-03-25`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-03-25`) },
          { id: 'm3', date: `${currentYear}-03-10`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-03-10`) },
          { id: 'f1', date: `${currentYear}-02-20`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-02-20`) },
          { id: 'f2', date: `${currentYear}-02-12`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-02-12`) },
          { id: 'f3', date: `${currentYear}-02-02`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-02-02`) },
          { id: 'j1', date: `${currentYear}-01-28`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-28`) },
          { id: 'j2', date: `${currentYear}-01-15`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-15`) },
          { id: 'j3', date: `${currentYear}-01-08`, hadSex: true, libido: 5, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-08`) },
          { id: 'j4', date: `${currentYear}-01-02`, hadSex: true, libido: 4, masturbated: false, usedTadala: false, periodEnded: false, timestamp: Date.parse(`${currentYear}-01-02`) },
          { 
            id: 'yesterday-' + Date.now(),
            date: yesterdayStr,
            hadSex: false,
            libido: 3,
            masturbated: false,
            usedTadala: false,
            periodEnded: false,
            timestamp: yesterdayDate.getTime()
          }
        ];
        setRecords(initialData);
      }
      return;
    }

    // Real-time Firestore Sync
    const recordsRef = collection(db, 'users', currentUser.uid, 'records');
    const q = query(recordsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbRecords = snapshot.docs.map(doc => doc.data() as Record);
      setRecords(dbRecords);
    }, (error) => {
      handleFirestoreError(error, 'list', `/users/${currentUser.uid}/records`);
    });

    // Check for localStorage migration
    const saved = localStorage.getItem('conexao_v7_data');
    if (saved) {
      try {
        const loadedRecords = JSON.parse(saved) as Record[];
        if (loadedRecords.length > 0) {
          // Migration logic: upload each record to Firestore
          loadedRecords.forEach(async (rec) => {
            await setDoc(doc(db, 'users', currentUser.uid, 'records', rec.id), rec);
          });
          // Clear migration once started (Firestore listener will handle state)
          localStorage.removeItem('conexao_v7_data');
        }
      } catch (e) {
        console.error("Migration error", e);
      }
    }

    return () => unsubscribe();
  }, [currentUser]);

  // Save Data Persistence (Only for Logged Out users)
  useEffect(() => {
    if (!currentUser && records.length > 0) {
      setSaveStatus('saving');
      localStorage.setItem('conexao_v7_data', JSON.stringify(records));
      const timer = setTimeout(() => setSaveStatus('saved'), 600);
      return () => clearTimeout(timer);
    }
  }, [records, currentUser]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Deseja sair da conta?")) {
      await signOut(auth);
    }
  };

  const todayRecord = records.find(r => r.date === todayStr);

  const handleOpenCheckin = (dateToEdit?: string) => {
    const targetDate = dateToEdit || todayStr;
    setEditingDate(targetDate);

    const existingRecord = records.find(r => r.date === targetDate);

    if (existingRecord) {
      setCheckinLibido(existingRecord.libido);
      setCheckinActivities({
        hadSex: existingRecord.hadSex,
        masturbated: existingRecord.masturbated,
        usedTadala: existingRecord.usedTadala,
      });
      setCheckinPartner({
        periodStarts: existingRecord.periodStarts || false,
        periodEnds: existingRecord.periodEnds || existingRecord.periodEnded || false,
        medsStarts: existingRecord.medsStarts || false,
        medsEnds: existingRecord.medsEnds || false
      });
    } else {
      setCheckinLibido(3);
      setCheckinActivities({ hadSex: false, masturbated: false, usedTadala: false });
      setCheckinPartner({ periodStarts: false, periodEnds: false, medsStarts: false, medsEnds: false });
    }
    setIsCheckinOpen(true);
  };

  const handleSaveCheckin = async () => {
    setSaveStatus('saving');
    // Find existing record for the editing date to keep ID if possible
    const existingIndex = records.findIndex(r => r.date === editingDate);
    const existingRecord = existingIndex > -1 ? records[existingIndex] : null;

    const recordId = existingRecord ? existingRecord.id : Date.now().toString();

    const newRecord: Record = {
      id: recordId,
      date: editingDate,
      libido: checkinLibido,
      ...checkinActivities,
      periodStarts: checkinPartner.periodStarts,
      periodEnds: checkinPartner.periodEnds,
      periodEnded: checkinPartner.periodEnds, 
      medsStarts: checkinPartner.medsStarts,
      medsEnds: checkinPartner.medsEnds,
      timestamp: new Date(editingDate + 'T12:00:00').getTime()
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'records', recordId), newRecord);
      } catch (error) {
        handleFirestoreError(error, 'write', `/users/${currentUser.uid}/records/${recordId}`);
      }
    } else {
      let updatedRecords = [...records];
      if (existingIndex > -1) {
        updatedRecords[existingIndex] = newRecord;
      } else {
        updatedRecords.push(newRecord);
      }
      setRecords(updatedRecords);
    }

    setSaveStatus('saved');
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

  const renderCheckinModal = () => {
    // Format the date being edited for the title
    const dateObj = new Date(editingDate + 'T12:00:00');
    const isToday = editingDate === todayStr;
    const dateTitle = isToday 
      ? "Check-in de Hoje" 
      : `Check-in: ${dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto border border-white/20">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 font-display italic tracking-tight">{dateTitle}</h2>
              {!isToday && <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.2em] mt-1">Registro Retroativo</p>}
            </div>
            <button onClick={() => setIsCheckinOpen(false)} className="w-10 h-10 bg-slate-50 rounded-2xl text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-all active:scale-90 flex items-center justify-center">
              <XIcon size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="space-y-8">
            {/* Libido Selection */}
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Nível de desejo (Você)</p>
              <div className="flex justify-between gap-2 bg-slate-50 p-2 rounded-[28px]">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button 
                    key={level} 
                    onClick={() => setCheckinLibido(level)} 
                    className={`
                      flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all duration-300
                      ${checkinLibido === level 
                        ? 'scale-110 shadow-xl shadow-brand-600/20 text-white' 
                        : 'text-slate-300 hover:bg-white hover:text-slate-400'}
                    `}
                    style={{ backgroundColor: checkinLibido === level ? LIBIDO_LEVELS[level].color : 'transparent' }}
                  >
                    {LIBIDO_LEVELS[level].icon}
                  </button>
                ))}
              </div>
            </div>
            {/* Activities */}
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Suas Atividades</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                  onClick={() => setCheckinActivities({ hadSex: false, masturbated: false, usedTadala: false })} 
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${(!checkinActivities.hadSex && !checkinActivities.masturbated && !checkinActivities.usedTadala) ? 'bg-slate-200 border-slate-300 text-slate-600 shadow-inner' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                >
                  <Ban size={24} strokeWidth={3} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Nada</span>
                </button>
                <button onClick={() => toggleActivity('hadSex')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${checkinActivities.hadSex ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/20' : 'bg-white border-slate-100 text-slate-400 hover:border-brand-100'}`}>
                  <Heart size={24} fill={checkinActivities.hadSex ? "currentColor" : "none"} strokeWidth={3} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Transa</span>
                </button>
                <button onClick={() => toggleActivity('masturbated')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${checkinActivities.masturbated ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white border-slate-100 text-slate-400 hover:border-orange-100'}`}>
                  <UserIcon size={24} strokeWidth={3} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Solo</span>
                </button>
                <button onClick={() => toggleActivity('usedTadala')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${checkinActivities.usedTadala ? 'bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-800/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                  <Pill size={24} strokeWidth={3} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Tadala</span>
                </button>
              </div>
            </div>
            {/* Partner Cycle */}
            <div className="bg-brand-50/50 p-6 rounded-[32px] border border-brand-100 space-y-4">
               <p className="text-xs font-black text-brand-600 uppercase tracking-widest text-center flex items-center justify-center gap-2">
                 <CalendarHeart size={16} /> Ciclo da Marcelly
               </p>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => togglePartner('periodStarts')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${checkinPartner.periodStarts ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-white text-slate-400 hover:border-brand-200'}`}>
                    <Droplets size={20} strokeWidth={3} />
                    <span className="font-black text-[10px] uppercase tracking-widest">Desceu</span>
                  </button>
                  <button onClick={() => togglePartner('periodEnds')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${checkinPartner.periodEnds ? 'bg-yellow-500 border-yellow-500 text-white shadow-md' : 'bg-white border-white text-slate-400 hover:border-yellow-200'}`}>
                    <Sparkles size={20} strokeWidth={3} />
                    <span className="font-black text-[10px] uppercase tracking-widest">Acabou</span>
                  </button>
                  <button onClick={() => togglePartner('medsStarts')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${checkinPartner.medsStarts ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-white text-slate-400 hover:border-blue-200'}`}>
                    <PlayCircle size={20} strokeWidth={3} />
                    <span className="font-black text-[10px] uppercase tracking-widest">Retomou</span>
                  </button>
                  <button onClick={() => togglePartner('medsEnds')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${checkinPartner.medsEnds ? 'bg-orange-400 border-orange-400 text-white shadow-md' : 'bg-white border-white text-slate-400 hover:border-orange-200'}`}>
                    <StopCircle size={20} strokeWidth={3} />
                    <span className="font-black text-[10px] uppercase tracking-widest">Pausa</span>
                  </button>
               </div>
            </div>
            <button onClick={handleSaveCheckin} className="btn-primary w-full text-lg font-black uppercase tracking-widest py-5 rounded-[28px]">
              {isToday ? "Salvar Hoje" : "Salvar Histórico"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Progress calculation based on current year
    const now = new Date();
    const currentYear = now.getFullYear();
    const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    const totalDaysInYear = isLeapYear(year) ? 366 : 365;
    
    let daysPassed = 0;
    if (year < currentYear) {
      daysPassed = totalDaysInYear;
    } else if (year === currentYear) {
      const startOfYear = new Date(year, 0, 1);
      const diff = now.getTime() - startOfYear.getTime();
      daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    }

    const uniqueDaysWithSex = new Set(
      records.filter(r => r.hadSex && new Date(r.date).getFullYear() === year).map(r => r.date)
    ).size;
    const sexPercentage = daysPassed > 0 ? ((uniqueDaysWithSex / daysPassed) * 100).toFixed(1) : '0.0';

    const avgLibido = records.length > 0 ? records.reduce((acc, r) => acc + r.libido, 0) / records.length : 0;
    
    // Performance Note: missed days count as "no sex" automatically because we use calendar days (daysPassed)
    // for the sexPercentage calculation above.

    // History data: Sort desc
    const sortedHistory = [...records]
      .sort((a,b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Last 10 events

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* HERO SUMMARY */}
        <section className="relative overflow-hidden bg-brand-600 rounded-[40px] p-8 text-white shadow-2xl shadow-brand-900/20">
           {/* Decorative elements */}
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
           <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-900 rounded-full blur-3xl opacity-30"></div>
           
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-2">
                   <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                      <Zap size={18} className="text-brand-100" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-100">Performance Anual</span>
                 </div>
                 <div className="text-right bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-brand-100 italic">
                     Dia {daysPassed} de {totalDaysInYear}
                   </span>
                 </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-1">
                 <h2 className="text-7xl font-black font-display tracking-tighter italic">{uniqueDaysWithSex}</h2>
                 <span className="text-xl font-bold text-brand-100 italic">dias transando</span>
              </div>
              
              <div className="mb-8">
                 <p className="text-sm font-medium text-brand-100/80 mb-3">
                   Relação de aproveitamento: {sexPercentage}% dos dias em {year}.
                 </p>
                 <div className="w-full bg-brand-900/40 rounded-full h-3 p-0.5 border border-white/10">
                    <div className="bg-gradient-to-r from-brand-300 to-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: `${Math.min(Number(sexPercentage), 100)}%` }}></div>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-200/60">Libido Média</span>
                    <div className="flex items-center gap-2">
                       <Flame size={14} className="text-brand-300" />
                       <span className="text-lg font-black font-display tracking-tight italic">{avgLibido.toFixed(1)}</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-200/60">Prev. Menstruação</span>
                    <div className="flex items-center gap-2">
                       <CalendarHeart size={14} className="text-brand-300" />
                       <span className="text-lg font-black font-display tracking-tight italic">
                         {partnerInfo?.nextPeriodDate ? partnerInfo.nextPeriodDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : '--'}
                       </span>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* CALENDAR CARD */}
        <section className="neo-card p-6">
           <div className="flex items-center justify-between mb-8">
              <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-90">
                <ChevronLeft size={20} strokeWidth={3} />
              </button>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] font-display">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-90">
                <ChevronRight size={20} strokeWidth={3} />
              </button>
           </div>
           
           <div className="grid grid-cols-7 mb-6 text-center">
             {['D','S','T','Q','Q','S','S'].map(d => (
               <div key={d} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
             ))}
           </div>

           <div className="grid grid-cols-7 gap-y-4 gap-x-2">
             {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`} />)}
             {Array.from({length: daysInMonth}).map((_, i) => {
               const day = i + 1;
               const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
               const rec = records.find(r => r.date === dStr);
               const isToday = dStr === todayStr;
               const hasRecord = !!rec;
               
               return (
                 <div 
                    key={day} 
                    onClick={() => handleOpenCheckin(dStr)}
                    className={`
                      aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all cursor-pointer hover:scale-110 active:scale-90
                      ${hasRecord 
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' 
                        : isToday 
                          ? 'bg-slate-900 text-white shadow-xl ring-4 ring-slate-100' 
                          : 'bg-slate-50 text-slate-400 hover:bg-brand-50 hover:text-brand-600'}
                    `}
                 >
                    <span className="text-xs font-black font-display">{day}</span>
                    
                    {(rec?.periodEnds || rec?.periodEnded) && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white shadow-sm"></div>
                    )}
                 </div>
               );
             })}
           </div>
        </section>

        {/* OSCILAÇÃO CARD */}
        <section className="neo-card p-6 overflow-hidden">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-brand-50 rounded-xl">
                    <Activity size={18} className="text-brand-600" />
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 font-display">Oscilação</h3>
              </div>
           </div>
           
           <div className="h-56 w-full -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...records].sort((a,b) => a.timestamp - b.timestamp).slice(-15)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLibido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e53e3e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).getDate().toString()} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 6]} 
                  hide={true}
                />
                <Tooltip 
                  cursor={{stroke: '#fca5a5', strokeWidth: 2, strokeDasharray: '5 5'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as Record;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            {new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-sm font-black italic font-display">Libido: {LIBIDO_LEVELS[data.libido].label}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="libido" 
                  stroke="#e53e3e" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#colorLibido)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </section>

        {/* HISTÓRICO LIST */}
        <section className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <div className="space-y-1">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] font-display">Histórico</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registros Recentes</p>
            </div>
            <div className="flex items-baseline gap-1">
               <span className="text-2xl font-black text-brand-600 font-display italic">{uniqueDaysWithSex}</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">transas</span>
            </div>
          </div>

          <div className="space-y-4">
             {sortedHistory.map((rec) => (
                <div key={rec.id} className="neo-card p-5 flex items-center gap-5 group hover:border-brand-200 transition-all">
                   {/* Icon Box */}
                   <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg transition-transform group-hover:scale-110" 
                      style={{ 
                        backgroundColor: LIBIDO_LEVELS[rec.libido].color,
                        boxShadow: `0 8px 20px ${LIBIDO_LEVELS[rec.libido].color}40`
                      }}
                   >
                      {LIBIDO_LEVELS[rec.libido].icon}
                   </div>
                   
                   {/* Content */}
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <h4 className="text-lg font-black text-slate-900 font-display italic">
                           {new Date(rec.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}.
                         </h4>
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                           {LIBIDO_LEVELS[rec.libido].label}
                         </span>
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-2">
                         {!rec.hadSex && !rec.masturbated && !rec.usedTadala && (
                           <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-slate-200">
                              <Ban size={10} /> NADA
                           </span>
                         )}
                         {rec.hadSex && (
                           <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-brand-100">
                              <Heart size={10} fill="currentColor" /> TRANSA
                           </span>
                         )}
                         {rec.masturbated && (
                           <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-orange-100">
                              <UserIcon size={10} /> SOLO
                           </span>
                         )}
                         {rec.usedTadala && (
                           <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-slate-200">
                              <Pill size={10} /> TADALA
                           </span>
                         )}
                         {(rec.periodEnds || rec.periodEnded) && (
                           <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-yellow-200">
                              <Sparkles size={10} /> ACABOU
                           </span>
                         )}
                      </div>
                   </div>
                </div>
             ))}
             {sortedHistory.length === 0 && (
                <div className="neo-card py-12 text-center text-slate-400 font-bold text-sm opacity-50 italic">
                   Nenhum registro relevante ainda.
                </div>
             )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 text-center space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-px bg-brand-200 mb-6"></div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2">
              CONEXÃO <span className="text-brand-200 mx-2">•</span> GESTÃO DE PERFORMANCE
            </h4>
            <p className="text-[10px] font-bold text-slate-400">
              Desenvolvido por André Brito
            </p>
          </div>
          
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
             <Smartphone size={14} className="text-brand-300" strokeWidth={2.5} />
             <span className="text-xs font-black tracking-widest text-slate-400">21 994 527 694</span>
          </div>
        </footer>

      </div>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-brand-50 font-sans text-slate-900 selection:bg-brand-200 flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-brand-50/80 backdrop-blur-xl px-6 py-5 flex justify-between items-center border-b border-brand-100/50">
        <div className="flex items-center gap-3">
           <HeaderLogo />
           {saveStatus === 'saved' && (
             <span className="bg-green-50 text-green-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-green-100 animate-in fade-in zoom-in duration-300">
               <Check size={10} strokeWidth={3} /> SALVO
             </span>
           )}
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">André Brito</p>
                <p className="text-[8px] font-bold text-brand-500 uppercase tracking-tighter mt-1">Conectado</p>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-brand-50 hover:text-brand-600 transition-all shadow-sm active:scale-90"
                title="Sair"
              >
                <LogOut size={18} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-95"
            >
              <LogIn size={14} /> Entrar
            </button>
          )}
          <button 
            onClick={() => {
              if (window.confirm("Deseja realmente limpar todos os dados e carregar o histórico padrão?")) {
                if (currentUser) {
                  // If logged in, clear Firestore (expensive but user requested)
                  records.forEach(async (r) => {
                    await deleteDoc(doc(db, 'users', currentUser.uid, 'records', r.id));
                  });
                }
                localStorage.removeItem('conexao_v7_data');
                window.location.reload();
              }
            }}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-brand-50 hover:text-brand-600 transition-all shadow-sm active:scale-90"
            title="Limpar Dados"
          >
            <Ban size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 flex-1 w-full space-y-8">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-16 h-16 bg-brand-100 rounded-[28px] flex items-center justify-center mb-4">
              <Zap size={32} className="text-brand-600" />
            </div>
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Carregando...</p>
          </div>
        ) : !currentUser ? (
          <div className="space-y-10">
            {/* CTA for login if not logged in */}
            <section className="bg-white/50 border-2 border-dashed border-brand-200 rounded-[40px] p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-brand-50 rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-brand-200/50">
                  <Cloud size={40} className="text-brand-600" strokeWidth={2.5} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 font-display italic leading-tight">Sincronize seus dados</h3>
                  <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">
                    Faça login com sua conta Google para salvar seus registros na nuvem e acessá-los de qualquer dispositivo.
                  </p>
                </div>
                <button 
                  onClick={handleSignIn}
                  className="w-full btn-primary flex items-center justify-center gap-3 py-5 rounded-3xl"
                >
                  <LogIn size={20} /> Entrar com Google
                </button>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Seus dados atuais serão migrados automaticamente após o login.
                </p>
            </section>
            {renderDashboard()}
          </div>
        ) : (
          renderDashboard()
        )}
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