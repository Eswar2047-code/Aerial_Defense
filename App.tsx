
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, SimulationStatus, SystemStats, ThreatPriority } from './types';
import { createMockTarget, calculateThreatScore, getPriority, HOME_BASE, calculateDistance, playAlertSound } from './utils';
import RadarView from './components/RadarView';
import ThreatList from './components/ThreatList';
import DecisionPanel from './components/DecisionPanel';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import Sidebar from './components/Sidebar';
import AnalyticsView from './components/AnalyticsView';
import DefensesView from './components/DefensesView';
import AlertsView from './components/AlertsView';
import VoiceAssistant from './components/VoiceAssistant';
import ChatAssistant from './components/ChatAssistant';
import RegistryView from './components/RegistryView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import { LanguageProvider, useTranslation } from './components/LanguageContext';
import { AlertTriangle, AlertCircle, Cpu, ExternalLink } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [targets, setTargets] = useState<Target[]>([]);
  const [historicalTargets, setHistoricalTargets] = useState<Target[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    activeThreats: 0,
    criticalAlerts: 0,
    interceptorReadiness: 94,
    systemHealth: 98,
  });

  const prevCriticalCount = useRef(0);

  // Simulation loop
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTargets(prev => {
        const toArchive: Target[] = [];
        const nextTargets = prev
          .map(t => {
            if (t.status === SimulationStatus.INTERCEPTED || t.status === SimulationStatus.MISSED || t.status === SimulationStatus.DISMISSED) {
                return t;
            }

            const newPos = {
              x: t.position.x + t.velocity.x * 0.1,
              y: t.position.y + t.velocity.y * 0.1
            };

            const dist = calculateDistance(newPos, HOME_BASE);
            
            let status: SimulationStatus = t.status;
            
            if (dist < 50) {
                status = SimulationStatus.MISSED;
            } else if (dist < 400 && t.status === SimulationStatus.DETECTED) {
                status = SimulationStatus.TRACKING;
            }

            const updatedTarget = {
              ...t,
              position: newPos,
              history: [...t.history.slice(-20), t.position],
              status,
              impactEta: Math.max(0, t.impactEta - 0.1),
              threatScore: calculateThreatScore({ ...t, position: newPos }),
            } as Target;
            
            updatedTarget.priority = getPriority(updatedTarget.threatScore);
            return updatedTarget;
          })
          .filter(t => {
              const dist = calculateDistance(t.position, HOME_BASE);
              const keep = dist < 1500;
              if (!keep) toArchive.push(t);
              return keep;
          });

        if (toArchive.length > 0) {
          setHistoricalTargets(h => [...h, ...toArchive]);
        }
        return nextTargets;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Update Stats & Play Notification Sound
  useEffect(() => {
    const criticalCount = targets.filter(t => t.priority === ThreatPriority.CRITICAL).length;
    
    if (criticalCount > prevCriticalCount.current && !isPaused && !isMuted) {
      playAlertSound('critical');
    }
    
    prevCriticalCount.current = criticalCount;

    setStats(prev => ({
      ...prev,
      activeThreats: targets.length,
      criticalAlerts: criticalCount,
    }));
  }, [targets, isPaused, isMuted]);

  // Initial spawn
  useEffect(() => {
    if (targets.length === 0) {
      const initial = Array.from({length: 12}, createMockTarget);
      setTargets(initial);
    }
  }, []);

  // Spawn new targets periodically
  useEffect(() => {
    const spawn = () => {
      if (!isPaused && targets.length < 40) {
        setTargets(prev => [...prev, createMockTarget()]);
      }
      setTimeout(spawn, 3000 + Math.random() * 5000);
    };
    spawn();
  }, [isPaused]);

  const handleAction = (id: string, action: 'APPROVE' | 'OVERRIDE' | 'DISMISS') => {
    setTargets(prev => prev.map(t => {
      if (t.id !== id) return t;
      
      let newStatus = t.status;
      if (action === 'APPROVE') {
        newStatus = SimulationStatus.LOCKED;
        if (!isMuted) playAlertSound('normal');
      }
      if (action === 'DISMISS') newStatus = SimulationStatus.DISMISSED;
      
      return {
        ...t,
        humanVerified: true,
        humanAction: action,
        status: newStatus
      };
    }));
  };

  const selectedTarget = targets.find(t => t.id === selectedId) || historicalTargets.find(t => t.id === selectedId);

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsView targets={targets} />;
      case 'defenses':
        return <DefensesView stats={stats} />;
      case 'alerts':
        return <AlertsView targets={targets} />;
      case 'settings':
        return <SettingsView />;
      case 'help':
        return <HelpView />;
      case 'registry':
        return (
          <RegistryView 
            targets={targets} 
            historicalTargets={historicalTargets} 
            selectedId={selectedId} 
            onSelect={setSelectedId} 
          />
        );
      case 'radar':
        return (
          <div className="flex-1 bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col items-center justify-center">
             <RadarView targets={targets} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        );
      default:
        return (
          <div className="flex-1 flex flex-col gap-6 min-h-0">
              {/* Stats Overview is now part of the Dashboard/Home view */}
              <StatsOverview stats={stats} />

              <div className="flex-1 flex gap-6 min-h-0">
                <section className="flex-[3] bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl overflow-hidden relative shadow-2xl">
                    <div className="absolute top-5 left-6 z-10 flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-md">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-mono font-bold text-slate-100 uppercase tracking-widest">{t('title')} Visualizer</span>
                    </div>
                    <RadarView 
                        targets={targets} 
                        selectedId={selectedId} 
                        onSelect={setSelectedId} 
                    />
                </section>

                <section className="flex-[2] bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl overflow-hidden flex flex-col shadow-lg min-h-0">
                    <div className="px-6 py-4 border-b border-slate-800/40 flex justify-between items-center bg-slate-900/30">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">{t('registry')}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setActiveTab('registry')}
                              className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                            >
                              View Full History <ExternalLink size={10} />
                            </button>
                            <div className="h-4 w-px bg-slate-800"></div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-mono font-bold uppercase">
                                ACTIVE: {targets.length}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <ThreatList 
                            targets={targets} 
                            selectedId={selectedId} 
                            onSelect={setSelectedId} 
                        />
                    </div>
                </section>
              </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
            isPaused={isPaused} 
            isMuted={isMuted}
            onTogglePause={() => setIsPaused(!isPaused)} 
            onToggleMute={() => setIsMuted(!isMuted)}
            onReset={() => {
              setTargets([]);
              setHistoricalTargets([]);
            }}
        />
        
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          <div className="flex-[3] flex flex-col gap-6 overflow-hidden">
            {/* Main Content Area */}
            {renderContent()}
          </div>

          {/* Right Panel: Decision Dashboard */}
          <aside className="flex-1 w-full max-w-[440px] flex flex-col gap-6 overflow-hidden">
             <section className="flex-[4] bg-[#0f172a]/30 border border-slate-800/40 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <DecisionPanel 
                    target={selectedTarget} 
                    onAction={handleAction}
                />
             </section>
             
             {/* Safety Protocol Disclaimer */}
             <div className="bg-rose-950/10 border border-rose-900/30 p-6 rounded-2xl flex items-start gap-4 backdrop-blur-md">
                <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-1" />
                <div>
                    <h4 className="text-xs font-bold text-rose-500 uppercase mb-2 tracking-widest">
                        {t('safety_protocol')}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        {t('safety_desc')}
                    </p>
                </div>
             </div>
          </aside>
        </div>
      </main>

      {/* AI Assistants Hub */}
      <VoiceAssistant 
        targets={targets}
        stats={stats}
        onSelectTarget={setSelectedId}
        onSetTab={setActiveTab}
        onTogglePause={setIsPaused}
        activeTab={activeTab}
      />
      <ChatAssistant 
        targets={targets}
        stats={stats}
        onSelectTarget={setSelectedId}
        onSetTab={setActiveTab}
        onTogglePause={setIsPaused}
        activeTab={activeTab}
      />
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <Dashboard />
  </LanguageProvider>
);

export default App;
