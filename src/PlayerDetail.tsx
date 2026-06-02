import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  X,
  Activity,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  ClipboardCheck,
  ListChecks,
  Zap,
  Brain,
} from 'lucide-react';
import type { Bilan, Joueur } from './types';

interface PlayerDetailProps {
  joueur: Joueur;
  bilans: Bilan[];
  onClose: () => void;
  API: string;
}

export default function PlayerDetail({
  joueur,
  bilans,
  onClose,
  API,
}: PlayerDetailProps) {
  // --- GESTION DES DATES (Saison sportive JSA) ---
  const getDefaultStartDate = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const septFirst = new Date(currentYear, 8, 1);
    const startYear = now >= septFirst ? currentYear : currentYear - 1;
    return `${startYear}-09-01`;
  };

  const getToday = () => new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getToday());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailedNotes, setDetailedNotes] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const resetToCurrentSeason = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(getToday());
  };

  // 1. FILTRAGE ET TRI DES BILANS
  const filteredBilans = useMemo(() => {
    return bilans
      .filter((b) => b.date_session >= startDate && b.date_session <= endDate)
      .sort(
        (a, b) =>
          new Date(a.date_session).getTime() -
          new Date(b.date_session).getTime()
      );
  }, [bilans, startDate, endDate]);

  // Pointer le bilan le plus récent au chargement
  useEffect(() => {
    if (filteredBilans.length > 0) {
      setCurrentIndex(filteredBilans.length - 1);
    }
  }, [filteredBilans]);

  const selectedBilan = filteredBilans[currentIndex];

  // 2. RÉCUPÉRATION DES NOTES DÉTAILLÉES
  useEffect(() => {
    if (selectedBilan && joueur.id) {
      setLoadingDetails(true);
      const url = `${API}?action=get_player_detailed_notes&player_id=${
        joueur.id
      }&date=${selectedBilan.date_session}&t=${Date.now()}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setDetailedNotes(Array.isArray(data) ? data : []);
          setLoadingDetails(false);
        })
        .catch((err) => {
          console.error('Erreur détails formulaire:', err);
          setDetailedNotes([]);
          setLoadingDetails(false);
        });
    }
  }, [selectedBilan, joueur.id, API]);

  // 3. LOGIQUE DES COULEURS
  const getStatColor = (val: number, isRpe: boolean = false) => {
    const n = Number(val);
    if (isRpe) {
      if (n >= 8) return '#ef4444';
      if (n <= 3) return '#22c55e';
      return '#ffffff';
    }
    if (n >= 9) return '#ffcc00';
    if (n >= 7) return '#22c55e';
    if (n <= 5) return '#ef4444';
    return '#ffffff';
  };

  // 4. DONNÉES POUR GRAPHIQUES
  const chartData = useMemo(
    () =>
      filteredBilans.map((b, index) => ({
        date: new Date(b.date_session).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        fatigue: Number(b.rpe),
        satis: Number(b.satisfaction),
        phys: Number(b.auto_physique),
        tech: Number(b.auto_technique),
        ment: Number(b.auto_mental),
        index,
      })),
    [filteredBilans]
  );

  const MiniChart = ({ title, dataKey, color, icon: Icon }: any) => (
    <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-gray-800 shadow-lg mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color }} />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {title}
        </h3>
      </div>
      <div style={{ width: '100%', height: '120px', touchAction: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onClick={(s: any) =>
              s &&
              s.activeTooltipIndex !== undefined &&
              setCurrentIndex(s.activeTooltipIndex)
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
            <XAxis dataKey="date" stroke="#666" fontSize={8} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 10]} hide />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={3}
              isAnimationActive={false}
              dot={(props: any) => (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={props.index === currentIndex ? 5 : 0}
                  fill="#fff"
                  stroke={color}
                  strokeWidth={2}
                />
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex justify-end">
      <div className="w-full max-w-2xl bg-[#121212] h-full shadow-2xl border-l border-gray-800 flex flex-col">
        {/* HEADER */}
        <div className="player-detail-header">
          <h2 className="player-detail-title">
            {joueur.prenom} <span className="lastname">{joueur.nom}</span>
          </h2>
          <button onClick={onClose} className="close-modal-btn">
            <X size={20} />
          </button>
        </div>

        {/* BARRE DE PÉRIODE */}
        <div className="period-container">
          <div className="date-input-group">
            <Calendar size={14} className="text-[#ffcc00]" />
            <span>DU</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="styled-date-input" />
          </div>
          <div className="date-input-group">
            <span>AU</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="styled-date-input" />
          </div>
          <button onClick={resetToCurrentSeason} className="btn-season-reset">
            <RotateCcw size={12} strokeWidth={3} /> SAISON
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 custom-scrollbar">
          {filteredBilans.length === 0 ? (
            <div className="text-center py-20 text-gray-600 uppercase text-[10px] font-black tracking-widest bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-800">
              Aucune donnée sur cette période
            </div>
          ) : (
            <>
              {/* SECTION 1 : ÉVALUATION GÉNÉRALE - TOUS LES GRAPHES */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Activity size={18} className="text-[#ffcc00]" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
                    1. Évolution des indicateurs
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MiniChart title="Fatigue (RPE)" dataKey="fatigue" color="#ffffff" icon={Activity} />
                  <MiniChart title="Satisfaction" dataKey="satis" color="#ffcc00" icon={Heart} />
                  <MiniChart title="Engagement Physique" dataKey="phys" color="#3b82f6" icon={Zap} />
                  <MiniChart title="Prestation Technique" dataKey="tech" color="#22c55e" icon={ShieldCheck} />
                </div>
                {/* On met le Mental en plein largeur ou on ajuste la grille */}
                <MiniChart title="Détermination Mentale" dataKey="ment" color="#a855f7" icon={Brain} />
              </div>

              {/* SÉLECTEUR DE SÉANCE DÉTAILLÉE */}
              {selectedBilan && (
                <div className="space-y-4">
                  <div className="date-selector-row">
                    <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="nav-arrow-btn">
                      <ChevronLeft size={28} />
                    </button>
                    <div className="date-display-center">
                      <span className="label">SÉANCE DU</span>
                      <span className="value">
                        {new Date(selectedBilan.date_session).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <button onClick={() => setCurrentIndex(Math.min(filteredBilans.length - 1, currentIndex + 1))} disabled={currentIndex === filteredBilans.length - 1} className="nav-arrow-btn">
                      <ChevronRight size={28} />
                    </button>
                  </div>

                  <div className="report-card">
                    <div className="report-header">
                      <span className="report-header-title">SYNTHÈSE</span>
                      <span className="satisfaction-badge">SATIS. {selectedBilan.satisfaction}/10</span>
                    </div>
                    <div className="report-grid">
                      {[
                        { label: 'Fatigue', val: Number(selectedBilan.rpe), isRpe: true },
                        { label: 'Physique', val: Number(selectedBilan.auto_physique), isRpe: false },
                        { label: 'Technique', val: Number(selectedBilan.auto_technique), isRpe: false },
                        { label: 'Mental', val: Number(selectedBilan.auto_mental), isRpe: false },
                      ].map((item, i) => (
                        <div key={i} className="report-stat-item" style={{ border: `1px solid ${getStatColor(item.val, item.isRpe)}44` }}>
                          <span className="report-stat-label">{item.label}</span>
                          <span className="report-stat-value" style={{ color: getStatColor(item.val, item.isRpe) }}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="report-text-block">
                      <p className="report-text-label">Progression déclarée</p>
                      <p className="report-text-content">{selectedBilan.domaine_progres || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2 : AUTO-ÉVALUATION DÉTAILLÉE */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 px-2">
                  <ClipboardCheck size={18} className="text-[#ffcc00]" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
                    2. Détails des critères
                  </h3>
                </div>

                <div className="bg-[#181818] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl min-h-[100px] flex flex-col justify-center">
                  {loadingDetails ? (
                    <div className="p-8 text-center text-gray-500 text-[10px] animate-pulse uppercase font-black">Chargement...</div>
                  ) : detailedNotes.length > 0 ? (
                    <div className="divide-y divide-gray-800/40">
                      {detailedNotes.map((n: any, i: number) => (
                        <div key={i} className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-[8px] font-black text-[#ffcc00] uppercase block tracking-tighter">{n.categorie}</span>
                              <span className="text-sm font-bold text-gray-200">{n.nom_critere}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black" style={{ color: getStatColor(n.note) }}>{n.note}</span>
                              <span className="text-[10px] font-bold text-gray-600 ml-1">/ 10</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${n.note * 10}%`,
                                backgroundColor: getStatColor(n.note),
                                boxShadow: `0 0 8px ${getStatColor(n.note)}33`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-700 uppercase text-[9px] font-black tracking-widest">
                      <ListChecks size={24} className="mx-auto mb-2 opacity-20" />
                      Aucune note détaillée
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}