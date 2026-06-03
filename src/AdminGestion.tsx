import { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, ShieldCheck, Users, Plus, Pencil, Check, X } from 'lucide-react';

interface Equipe {
  id: number | string;
  nom_equipe: string;
}

interface Coach {
  id: number;
  nom: string;
  prenom: string;
  pseudo: string;
  password: string;
  equipes_autorisees: string;
}

interface AdminGestionProps {
  coachs: Coach[];
  equipes: Equipe[];
  coachId: number | null;
  API: string;
  onToggleRight: (coach: Coach, teamId: number) => void;
  onDeleted: (coachId: number) => void;
}

type Tab = 'coachs' | 'equipes';

interface Team {
  id: number;
  nom_equipe: string;
}

export default function AdminGestion({ coachs, equipes, coachId, API, onToggleRight, onDeleted }: AdminGestionProps) {
  const [tab, setTab] = useState<Tab>('coachs');

  // --- Coachs state ---
  const [visiblePwd, setVisiblePwd] = useState<Record<number, boolean>>({});
  const [confirmDeleteCoach, setConfirmDeleteCoach] = useState<number | null>(null);

  // --- Équipes state ---
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<number | null>(null);

  useEffect(() => {
    if (tab === 'equipes') fetchTeams();
  }, [tab]);

  const fetchTeams = () => {
    fetch(`${API}?action=get_all_teams_admin&t=${Date.now()}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setTeams(d.teams); });
  };

  const post = (action: string, body: object) =>
    fetch(`${API}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());

  // --- Coachs handlers ---
  const togglePwd = (id: number) =>
    setVisiblePwd(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteCoach = (targetId: number) => {
    post('delete_coach', { admin_id: coachId, coach_id: targetId }).then(d => {
      if (d.status === 'success') { onDeleted(targetId); setConfirmDeleteCoach(null); }
    });
  };

  // --- Équipes handlers ---
  const handleCreateTeam = () => {
    const nom = newTeamName.trim();
    if (!nom) return;
    post('create_team', { nom_equipe: nom }).then(d => {
      if (d.status === 'success') {
        setTeams(prev => [...prev, { id: Number(d.id), nom_equipe: nom }]);
        setNewTeamName('');
      }
    });
  };

  const handleUpdateTeam = (id: number) => {
    const nom = editingName.trim();
    if (!nom) return;
    post('update_team', { team_id: id, nom_equipe: nom }).then(d => {
      if (d.status === 'success') {
        setTeams(prev => prev.map(t => t.id === id ? { ...t, nom_equipe: nom } : t));
        setEditingId(null);
      }
    });
  };

  const handleDeleteTeam = (id: number) => {
    post('delete_team', { team_id: id }).then(d => {
      if (d.status === 'success') {
        setTeams(prev => prev.filter(t => t.id !== id));
        setConfirmDeleteTeam(null);
      }
    });
  };

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Tabs */}
      <div className="gestion-tabs">
        <button className={`gestion-tab ${tab === 'coachs' ? 'active' : ''}`} onClick={() => setTab('coachs')}>
          <ShieldCheck size={16} /> Coachs
        </button>
        <button className={`gestion-tab ${tab === 'equipes' ? 'active' : ''}`} onClick={() => setTab('equipes')}>
          <Users size={16} /> Équipes
        </button>
      </div>

      {/* ─── ONGLET COACHS ─── */}
      {tab === 'coachs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {coachs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Aucun coach enregistré</p>
            </div>
          )}
          {coachs.map((c) => {
            const rights = c.equipes_autorisees ? c.equipes_autorisees.split(',').filter(Boolean) : [];
            return (
              <div key={c.id} className="gestion-card">
                <div className="gestion-card-header">
                  <div>
                    <div className="gestion-coach-name">{c.prenom} {c.nom.toUpperCase()}</div>
                    <div className="gestion-meta-row">
                      <span className="gestion-label">LOGIN</span>
                      <span className="gestion-value-yellow">{c.pseudo}</span>
                    </div>
                    <div className="gestion-meta-row">
                      <span className="gestion-label">MDP</span>
                      <span className="gestion-value-white">
                        {visiblePwd[c.id] ? c.password : '••••••••'}
                      </span>
                      <button className="gestion-eye-btn" onClick={() => togglePwd(c.id)}>
                        {visiblePwd[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {confirmDeleteCoach === c.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>CONFIRMER ?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="gestion-btn-cancel" onClick={() => setConfirmDeleteCoach(null)}>Annuler</button>
                        <button className="gestion-btn-delete-confirm" onClick={() => handleDeleteCoach(c.id)}>Supprimer</button>
                      </div>
                    </div>
                  ) : (
                    <button className="gestion-btn-delete" onClick={() => setConfirmDeleteCoach(c.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="gestion-divider" />
                <div className="gestion-teams-label">ACCÈS ÉQUIPES</div>
                <div className="gestion-pills">
                  {equipes.map((eq) => (
                    <button
                      key={eq.id}
                      onClick={() => onToggleRight(c, Number(eq.id))}
                      className={`access-pill ${rights.includes(eq.id.toString()) ? 'active' : ''}`}
                    >
                      {eq.nom_equipe}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ONGLET ÉQUIPES ─── */}
      {tab === 'equipes' && (
        <div style={{ marginTop: 16 }}>
          {/* Formulaire ajout */}
          <div className="gestion-card" style={{ marginBottom: 12 }}>
            <div className="gestion-teams-label">NOUVELLE ÉQUIPE</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="gestion-input"
                placeholder="Nom de l'équipe"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              />
              <button className="gestion-btn-add" onClick={handleCreateTeam}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Liste équipes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teams.map(t => (
              <div key={t.id} className="gestion-card gestion-team-row">
                {editingId === t.id ? (
                  <>
                    <input
                      className="gestion-input"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateTeam(t.id)}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="gestion-btn-icon gestion-btn-confirm" onClick={() => handleUpdateTeam(t.id)}>
                        <Check size={16} />
                      </button>
                      <button className="gestion-btn-icon gestion-btn-cancel-icon" onClick={() => setEditingId(null)}>
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : confirmDeleteTeam === t.id ? (
                  <>
                    <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700 }}>Supprimer « {t.nom_equipe} » ?</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="gestion-btn-cancel" onClick={() => setConfirmDeleteTeam(null)}>Annuler</button>
                      <button className="gestion-btn-delete-confirm" onClick={() => handleDeleteTeam(t.id)}>Supprimer</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="gestion-team-name">{t.nom_equipe}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="gestion-btn-icon gestion-btn-edit" onClick={() => { setEditingId(t.id); setEditingName(t.nom_equipe); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="gestion-btn-icon gestion-btn-delete" onClick={() => setConfirmDeleteTeam(t.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
