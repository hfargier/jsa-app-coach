import { useState, useEffect, useMemo } from 'react';
import PlayerDetail from './PlayerDetail';
import Login from './Login';
import AdminEvents from './AdminEvents';
import AdminForms from './AdminForms'; 
import type { Joueur, Bilan, Equipe } from './types';
import {
  Users,
  User,
  Search,
  ShieldCheck,
  Lock,
  Calendar,
  List,
  HeartPlus,
  X,
  Sparkles
} from 'lucide-react';
import './App.css';

type ViewMode = 'seance' | 'joueur' | 'gestion' | 'events' | 'formulaires';

export default function App() {
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [bilans, setBilans] = useState<Bilan[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [allCoachs, setAllCoachs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const logoPath = `${import.meta.env.BASE_URL}logo_coach192.png`;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [coachId, setCoachId] = useState<number | null>(null);
  const [coachRole, setCoachRole] = useState<string>('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('seance');
  const [selectedTeamId, setSelectedTeamId] = useState<number | string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const API_URL = 'https://seme-et-tisse.fr/API/api_volley_coach.php';

  useEffect(() => {
    const savedCoach = localStorage.getItem('coachData');
    if (savedCoach) {
      const data = JSON.parse(savedCoach);
      setCoachId(data.id);
      setCoachRole(data.role);
      setNom(data.nom);
      setPrenom(data.prenom);
      setIsLoggedIn(true);
      fetchDashboardData(data.id);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("PWA: Événement d'installation capturé");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const fetchDashboardData = (id: number) => {
    setLoading(true);
    fetch(`${API_URL}?action=get_all_data&coach_id=${id}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setJoueurs(data.joueurs || []);
          setBilans(data.bilans || []);
          setEquipes(data.equipes || []);
          if (data.bilans && data.bilans.length > 0) {
            setSelectedDate(data.bilans[0].date_session);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleLogin = (pseudo: string, pass: string) => {
    const formData = new FormData();
    formData.append('pseudo', pseudo);
    formData.append('password', pass);

    fetch(`${API_URL}?action=login_coach`, {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          const coachInfo = {
            id: data.coach.id,
            role: data.coach.role,
            nom: data.coach.nom || '',
            prenom: data.coach.prenom || '',
          };
          localStorage.setItem('coachData', JSON.stringify(coachInfo));
          setCoachId(data.coach.id);
          setCoachRole(data.coach.role);
          setNom(data.coach.nom || '');
          setPrenom(data.coach.prenom || '');
          setIsLoggedIn(true);
          fetchDashboardData(data.coach.id);
        } else {
          alert(data.message);
        }
      });
  };

  const handleRegister = (pseudo: string, pass: string, nomIn: string, prenomIn: string) => {
    const formData = new FormData();
    formData.append('pseudo', pseudo);
    formData.append('password', pass);
    formData.append('nom', nomIn);
    formData.append('prenom', prenomIn);

    fetch(`${API_URL}?action=register_coach`, {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          alert('Compte Coach créé !');
          setIsRegistering(false);
        } else {
          alert(data.message);
        }
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('coachData');
    setIsLoggedIn(false);
    setCoachId(null);
    setCoachRole('');
    setViewMode('seance');
    setSelectedTeamId('');
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const fetchAllCoachs = () => {
    if (coachRole !== 'admin') return;
    fetch(`${API_URL}?action=get_all_coachs&admin_id=${coachId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') setAllCoachs(data.coachs);
      });
  };

  const toggleCoachRight = (targetCoach: any, teamId: number) => {
    let currentRights = targetCoach.equipes_autorisees ? targetCoach.equipes_autorisees.split(',') : [];
    const idStr = teamId.toString();
    if (currentRights.includes(idStr)) {
      currentRights = currentRights.filter((id: string) => id !== idStr);
    } else {
      currentRights.push(idStr);
    }
    const newRightsStr = currentRights.join(',');

    setAllCoachs((prev) =>
      prev.map((c) => (c.id === targetCoach.id ? { ...c, equipes_autorisees: newRightsStr } : c))
    );

    const formData = new FormData();
    formData.append('admin_id', coachId!.toString());
    formData.append('coach_id', targetCoach.id);
    formData.append('equipes_autorisees', newRightsStr);

    fetch(`${API_URL}?action=update_coach_rights`, {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== 'success') fetchAllCoachs();
      });
  };

  const getAvgColor = (val: string | number, label: string) => {
    const n = Number(val);
    if (label.includes('Fatigue')) {
      if (n >= 7) return '#ef4444';
      if (n <= 3) return '#22c55e';
      return '#ffffff';
    }
    if (n >= 8.5) return '#ffcc00';
    if (n >= 7) return '#22c55e';
    if (n <= 5) return '#ef4444';
    return '#ffffff';
  };

  const availableDates = useMemo(() => {
    const dates = bilans.map((b) => b.date_session);
    return [...new Set(dates)].sort().reverse();
  }, [bilans]);

  const seanceData = useMemo(() => {
    if (!selectedTeamId)
      return { results: [], avgRpe: '0.0', avgSatis: '0.0', avgPhys: '0.0', avgTech: '0.0', avgMent: '0.0' };
    const playersInTeam = joueurs.filter((j) => Number(j.team_id) === Number(selectedTeamId));
    const results = playersInTeam
      .map((j) => ({
        joueur: j,
        bilan: bilans.find((b) => b.date_session === selectedDate && Number(b.player_id) === Number(j.id)),
      }))
      .filter((item) => item.bilan !== undefined);

    const calculateAvg = (key: keyof Bilan) => {
      if (results.length === 0) return '0.0';
      const sum = results.reduce((acc, r) => acc + Number(r.bilan![key] || 0), 0);
      return (sum / results.length).toFixed(1);
    };

    return {
      results,
      avgRpe: calculateAvg('rpe'),
      avgSatis: calculateAvg('satisfaction'),
      avgPhys: calculateAvg('auto_physique'),
      avgTech: calculateAvg('auto_technique'),
      avgMent: calculateAvg('auto_mental'),
    };
  }, [joueurs, bilans, selectedDate, selectedTeamId]);

  const currentPlayer = useMemo(() => joueurs.find((j) => j.id === selectedPlayerId), [joueurs, selectedPlayerId]);

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={handleRegister}
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
      />
    );
  }

  return (
    <div className="dashboard-container">
      {/* BANDEAU D'INSTALLATION PWA */}
      {deferredPrompt && showInstallBanner && (
        <div className="pwa-install-banner">
          <div className="pwa-banner-content">
            <div className="pwa-icon-box">
               <Sparkles className="yellow-sparkle" size={20} />
            </div>
            <div className="pwa-text">
              <strong>Application Volley Coach</strong>
              <span>Installez l'app pour un accès rapide et hors-ligne.</span>
            </div>
          </div>
          <div className="pwa-actions">
            <button onClick={handleInstallApp} className="pwa-btn-confirm">
              INSTALLER
            </button>
            <button onClick={() => setShowInstallBanner(false)} className="pwa-btn-close">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="nav-bar">
        <div className="nav-left">
        <img 
        src={logoPath} 
        alt="Logo JSA" 
        className="club-logo" 
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== './logo_coach192.png') {
            target.src = './logo_coach192.png';
          }
        }}
      />
          <div className="nav-info">
            <div className="nav-name">
              {nom.toUpperCase()} {prenom}
            </div>
            <select
              className="nav-role-yellow"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                outline: 'none',
              }}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="" style={{ background: '#1a1a1a' }}>
                CHOISIR ÉQUIPE
              </option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id} style={{ background: '#1a1a1a' }}>
                  {eq.nom_equipe.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="nav-right">
          <button onClick={handleLogout} className="btn-logout-modern">
            <Lock size={16} />
            <span>DÉCONNEXION</span>
          </button>
        </div>
      </div>

      <div className="container">
        {selectedTeamId && (
          <div className="view-switcher" style={{ marginTop: '20px' }}>
            <button onClick={() => setViewMode('seance')} className={viewMode === 'seance' ? 'active' : ''}>
              <Users size={16} /> SÉANCE
            </button>
            <button onClick={() => setViewMode('joueur')} className={viewMode === 'joueur' ? 'active' : ''}>
              <User size={16} /> JOUEUR
            </button>
            <button onClick={() => setViewMode('events')} className={viewMode === 'events' ? 'active' : ''}>
              <Calendar size={16} /> ÉVÉNEMENTS
            </button>
            <button onClick={() => setViewMode('formulaires')} className={viewMode === 'formulaires' ? 'active' : ''}>
              <List size={16} /> FORMULAIRES
            </button>
            {coachRole === 'admin' && (
              <button
                onClick={() => {
                  setViewMode('gestion');
                  fetchAllCoachs();
                }}
                className={viewMode === 'gestion' ? 'active' : ''}
              >
                <ShieldCheck size={16} /> GESTION
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-screen">CHARGEMENT JSA...</div>
        ) : (
          <>
            {!selectedTeamId && viewMode !== 'gestion' ? (
              <div className="empty-state" style={{ marginTop: '40px' }}>
                <Search size={48} className="yellow" style={{ opacity: 0.2, marginBottom: '15px' }} />
                <p>Veuillez sélectionner une équipe dans le menu en haut à gauche.</p>
              </div>
            ) : (
              <div className="view-fade">
                {viewMode === 'seance' && (
                  <main className="seance-content">
                    <div className="filter-bar" style={{ marginBottom: '20px' }}>
                      <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                        <label>Séance (Participation)</label>
                        <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                          {availableDates.map((d) => {
                            // On filtre les joueurs de l'équipe sélectionnée
                            const teamPlayers = joueurs.filter(j => Number(j.team_id) === Number(selectedTeamId));
                            const totalInTeam = teamPlayers.length;

                            // On compte combien ont un bilan à cette date
                            const answeredCount = teamPlayers.filter(j => 
                              bilans.some(b => b.date_session === d && Number(b.player_id) === Number(j.id))
                            ).length;

                            const indicator = answeredCount > 0 ? '🔴 ' : '';
                            const ratio = totalInTeam > 0 ? ` (${answeredCount}/${totalInTeam})` : '';

                            return (
                              <option key={d} value={d}>
                                {indicator}
                                {new Date(d).toLocaleDateString('fr-FR', { 
                                  weekday: 'short', 
                                  day: 'numeric', 
                                  month: 'short' 
                                }).toUpperCase()}
                                {ratio}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="summary-bar">
                      {[
                        { label: 'Fatigue', val: seanceData.avgRpe, emoji: '😛' },
                        { label: 'Satisfaction', val: seanceData.avgSatis, emoji: '❤️' },
                        { label: 'Physique', val: seanceData.avgPhys, emoji: '💪' },
                        { label: 'Technique', val: seanceData.avgTech, emoji: '🏐' },
                        { label: 'Mental', val: seanceData.avgMent, emoji: '🧠' },
                      ].map((s, i) => (
                        <div key={i} className="summary-item">
                          <span className="summary-label">
                            <span className="emoji">{s.emoji}</span> {s.label}
                          </span>
                          <span className="summary-value" style={{ color: getAvgColor(s.val, s.label) }}>
                            {s.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="player-list">
                      {seanceData.results.map(({ joueur, bilan }) => (
                        <div key={joueur.id} className="player-data-card" onClick={() => setSelectedPlayerId(joueur.id)}>
                          <div className="card-header">
                            <span className="player-name">{joueur.prenom} {joueur.nom}</span>
                            <span className="satisfaction-badge">
                              Satisfaction: <span style={{ color: getAvgColor(bilan?.satisfaction || 0, 'Satisfaction'), fontWeight: 900 }}>
                                <HeartPlus /> {bilan?.satisfaction}/10
                              </span>
                            </span>
                          </div>
                          <div className="stats-grid">
                            <div className="stat-box">
                              <label>Fatigue</label>
                              <span style={{ color: getAvgColor(bilan?.rpe || 0, 'Fatigue') }}>{bilan?.rpe}</span>
                            </div>
                            <div className="stat-box">
                              <label>Phys.</label>
                              <span style={{ color: getAvgColor(bilan?.auto_physique || 0, 'Physique') }}>{bilan?.auto_physique}</span>
                            </div>
                            <div className="stat-box">
                              <label>Tech.</label>
                              <span style={{ color: getAvgColor(bilan?.auto_technique || 0, 'Technique') }}>{bilan?.auto_technique}</span>
                            </div>
                            <div className="stat-box">
                              <label>Ment.</label>
                              <span style={{ color: getAvgColor(bilan?.auto_mental || 0, 'Mental') }}>{bilan?.auto_mental}</span>
                            </div>
                          </div>
                          <div className="card-footer">
                            <div className="progres-row"><span className="progres-label">MES PROGRÈS:</span> {bilan?.domaine_progres || '-'}</div>
                            {bilan?.commentaire && <p className="comment-text">"{bilan.commentaire}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </main>
                )}

                {viewMode === 'joueur' && (
                  <div className="player-selection-view">
                    <div className="filter-group" style={{ maxWidth: '400px', margin: '20px auto' }}>
                      <label>Sélectionner l'athlète</label>
                      <select value={selectedPlayerId || ''} onChange={(e) => setSelectedPlayerId(Number(e.target.value))}>
                        <option value="">-- JOUEUR --</option>
                        {joueurs.filter((j) => Number(j.team_id) === Number(selectedTeamId)).map((j) => (
                          <option key={j.id} value={j.id}>{j.prenom} {j.nom}</option>
                        ))}
                      </select>
                    </div>
                    {selectedPlayerId && currentPlayer && (
                      <PlayerDetail
                        joueur={currentPlayer}
                        bilans={bilans.filter((b) => Number(b.player_id) === selectedPlayerId)}
                        onClose={() => setSelectedPlayerId(null)}
                        API={API_URL}
                      />
                    )}
                  </div>
                )}

                {viewMode === 'events' && <AdminEvents teamId={selectedTeamId} API={API_URL} />}

                {viewMode === 'formulaires' && (
                  <AdminForms
                    API={API_URL}
                    activeTeamId={Number(selectedTeamId)}
                    activeTeamName={equipes.find((eq) => Number(eq.id) === Number(selectedTeamId))?.nom_equipe || 'ÉQUIPE INCONNUE'}
                  />
                )}

                {viewMode === 'gestion' && (
                  <div className="admin-panel">
                    <div className="player-list">
                      {allCoachs.map((c) => (
                        <div key={c.id} className="player-data-card" style={{ cursor: 'default' }}>
                          <div className="card-header">
                            <span className="player-name">{c.prenom} {c.nom}</span>
                            <span style={{ color: '#ffcc00', fontSize: '0.8rem', fontWeight: 800 }}>ID: {c.pseudo}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
                            {equipes.map((eq) => {
                              const isChecked = c.equipes_autorisees?.split(',').includes(eq.id.toString());
                              return (
                                <button key={eq.id} onClick={() => toggleCoachRight(c, eq.id)} className={`access-pill ${isChecked ? 'active' : ''}`}>
                                  {eq.nom_equipe}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}