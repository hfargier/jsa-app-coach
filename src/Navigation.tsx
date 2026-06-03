import { useState } from 'react';
import { Users, User, Calendar, List, ShieldCheck, Download, X, Share } from 'lucide-react';
import './Navigation.css';

declare const __APP_VERSION__: string;

type ViewMode = 'seance' | 'joueur' | 'gestion' | 'events' | 'formulaires';

interface NavigationProps {
  nom: string;
  prenom: string;
  coachRole: string;
  equipes: { id: number | string; nom_equipe: string }[];
  selectedTeamId: number | string;
  setSelectedTeamId: (id: number | string) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onFetchAllCoachs: () => void;
  deferredPrompt: any;
  onInstall: () => void;
  onLogout: () => void;
  logoPath: string;
}

const NAV_TABS: { id: ViewMode; label: string; Icon: React.ElementType }[] = [
  { id: 'seance',      label: 'Séance',      Icon: Users },
  { id: 'joueur',      label: 'Joueur',       Icon: User },
  { id: 'events',      label: 'Événements',   Icon: Calendar },
  { id: 'formulaires', label: 'Formulaires',  Icon: List },
];

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches;

export default function Navigation({
  nom, prenom, coachRole, equipes, selectedTeamId, setSelectedTeamId,
  viewMode, setViewMode, onFetchAllCoachs, deferredPrompt, onInstall, onLogout, logoPath,
}: NavigationProps) {
  const [showIosModal, setShowIosModal] = useState(false);

  const handleTab = (id: ViewMode) => {
    setViewMode(id);
    if (id === 'gestion') onFetchAllCoachs();
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      onInstall();
    } else if (isIos()) {
      setShowIosModal(true);
    }
  };

  const showInstallBtn = !isStandalone() && (deferredPrompt || isIos());

  return (
    <>
      {/* ─── HEADER ─── */}
      <header className="main-header">
        <div className="nav-brand">
          <img src={logoPath} alt="JSA Coach" className="nav-logo" />
          <div className="nav-user-meta">
            <span className="nav-user-name">{nom.toUpperCase()} {prenom}</span>
            <select
              className="nav-team-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="" style={{ background: '#1a1a1a' }}>CHOISIR ÉQUIPE</option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id} style={{ background: '#1a1a1a' }}>
                  {eq.nom_equipe.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="nav-header-actions">
          {showInstallBtn && (
            <button className="btn-install-pwa" onClick={handleInstallClick}>
              <Download size={13} />
              App
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <button className="btn-deconnexion" onClick={onLogout}>Quitter</button>
            <span className="app-version">v {__APP_VERSION__}</span>
          </div>
        </div>
      </header>

      {/* ─── BOTTOM TAB BAR ─── */}
      {selectedTeamId && (
        <nav className="bottom-tab-bar">
          {NAV_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tab-item ${viewMode === id ? 'active' : ''}`}
              onClick={() => handleTab(id)}
            >
              <span className="tab-icon-wrap">
                <Icon size={22} strokeWidth={viewMode === id ? 2.5 : 1.8} />
              </span>
              <span className="tab-label">{label}</span>
            </button>
          ))}

          {coachRole === 'admin' && (
            <button
              className={`tab-item ${viewMode === 'gestion' ? 'active' : ''}`}
              onClick={() => handleTab('gestion')}
            >
              <span className="tab-icon-wrap">
                <ShieldCheck size={22} strokeWidth={viewMode === 'gestion' ? 2.5 : 1.8} />
              </span>
              <span className="tab-label">Gestion</span>
            </button>
          )}
        </nav>
      )}

      {/* ─── MODAL IOS ─── */}
      {showIosModal && (
        <div className="ios-modal-overlay" onClick={() => setShowIosModal(false)}>
          <div className="ios-modal" onClick={e => e.stopPropagation()}>
            <div className="ios-modal-header">
              <span className="ios-modal-title">Installer l'application</span>
              <button className="ios-modal-close" onClick={() => setShowIosModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ios-modal-steps">
              <div className="ios-step">
                <span className="ios-step-num">1</span>
                <span className="ios-step-text">
                  Appuie sur <Share size={15} className="ios-inline-icon" /> <strong>Partager</strong> en bas de Safari
                </span>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">2</span>
                <span className="ios-step-text">Sélectionne <strong>« Sur l'écran d'accueil »</strong></span>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">3</span>
                <span className="ios-step-text">Appuie sur <strong>« Ajouter »</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
