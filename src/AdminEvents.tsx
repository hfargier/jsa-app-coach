import React, { useState, useEffect } from 'react';
import {
  Plus,
  MapPin,
  Clock,
  Trophy,
  Dumbbell,
  Users,
  Repeat,
  Trash2,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';

// --- INTERFACES STRICTES ---
interface Event {
  id: number;
  type_event: string;
  date_event: string;
  heure_event: string;
  heure_fin?: string;
  lieu: string;
  adversaire?: string;
  commentaire?: string;
  presences?: { player_id: number; statut: string; prenom: string }[];
}

interface AdminEventsProps {
  teamId: number | string;
  API: string;
}

export default function AdminEvents({ teamId, API }: AdminEventsProps) {
  // --- ÉTATS PRINCIPAUX ---
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- ÉTATS POUR LA RÉCURRENCE (LOGIQUE SAISON) ---
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const daysOfWeek = [
    { id: 1, label: 'LUN' },
    { id: 2, label: 'MAR' },
    { id: 3, label: 'MER' },
    { id: 4, label: 'JEU' },
    { id: 5, label: 'VEN' },
    { id: 6, label: 'SAM' },
    { id: 0, label: 'DIM' },
  ];

  // --- ÉTAT FORMULAIRE INITIAL ---
  const initialFormState = {
    type_event: 'Entraînement',
    date_event: new Date().toISOString().split('T')[0],
    heure_event: '18:30',
    heure_fin: '20:30',
    lieu: 'Maitre Jean',
    adversaire: '',
    commentaire: '',
  };
  const [newEvent, setNewEvent] = useState(initialFormState);

  /**
   * CHARGEMENT DES ÉVÉNEMENTS
   * Filtre par équipe et injecte un cache-buster
   */
  const fetchEvents = () => {
    if (!teamId) return;
    setLoading(true);
    fetch(`${API}?action=get_team_events_admin&team_id=${teamId}&t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur API Events:", err);
        setLoading(false);
      });
  };

  // Déclenchement au changement d'équipe
  useEffect(() => {
    fetchEvents();
  }, [teamId]);

  /**
   * GESTION DES JOURS DE RÉCURRENCE
   */
  const toggleDay = (id: number) => {
    setSelectedDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  /**
   * SUPPRESSION UNITAIRE
   */
  const handleDelete = async (eventId: number) => {
    if (!window.confirm("❗ Supprimer cet événement et TOUTES les présences ?")) return;
    try {
      const res = await fetch(`${API}?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_delete_event', event_id: eventId }),
      });
      const result = await res.json();
      if (result.status === 'success') fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * NETTOYAGE MASSIF DU CALENDRIER FUTUR
   */
  const handleClearFuture = async () => {
    const c1 = window.confirm("🚨 ACTION CRITIQUE : Supprimer TOUS les événements futurs ?");
    if (!c1) return;
    const c2 = window.confirm("Confirmation finale : Cette action effacera aussi les pointages déjà faits.");
    if (!c2) return;

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_clear_future_events', team_id: teamId })
      });
      const result = await res.json();
      if (result.status === 'success') {
        fetchEvents();
        alert("Le calendrier a été remis à zéro.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * ENREGISTREMENT (SIMPLE OU RÉCURRENT)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecurring && selectedDays.length === 0) {
      alert('Veuillez sélectionner au moins un jour de la semaine.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          team_id: teamId,
          action: 'admin_create_event',
          is_recurring: isRecurring,
          selected_days: selectedDays,
        }),
      });
      const result = await res.json();
      if (result.status === 'success') {
        setShowAddForm(false);
        setIsRecurring(false);
        setSelectedDays([]);
        setNewEvent(initialFormState);
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="view-fade admin-events-container">
      {/* HEADER SECTION */}
      <div className="section-header-compact" style={{ marginTop: '20px' }}>
        <div className="divider-line"></div>
        <h2 className="section-title-moyenne">GESTION CALENDRIER</h2>
        <div className="divider-line"></div>
      </div>

      {/* BOUTONS D'ACTIONS PRINCIPAUX */}
      <div className="action-buttons-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className="btn-install"
          style={{ flex: 3, justifyContent: 'center', display: 'flex', gap: '8px', padding: '12px' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? 'ANNULER' : 'AJOUTER UN ÉVÉNEMENT'}
        </button>

        <button
          className="jsa-button-danger-outline"
          style={{ flex: 1, justifyContent: 'center', display: 'flex', gap: '8px', padding: '12px' }}
          onClick={handleClearFuture}
          title="Vider le calendrier futur"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* FORMULAIRE DE CRÉATION */}
      {showAddForm && (
        <form className="player-data-card view-fade" onSubmit={handleSubmit} style={{ marginBottom: '25px', padding: '20px', border: '1px solid #ffcc00' }}>
          <div className="filter-bar" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: '15px' }}>
            <div className="filter-group">
              <label><Calendar size={12}/> TYPE</label>
              <select
                value={newEvent.type_event}
                onChange={(e) => setNewEvent({ ...newEvent, type_event: e.target.value })}
              >
                <option value="Entraînement">⚽ ENTRAÎNEMENT</option>
                <option value="Match">🏆 MATCH</option>
                <option value="Match Amical">🤝 MATCH AMICAL</option>
              </select>
            </div>
            {!isRecurring && (
              <div className="filter-group">
                <label>DATE PRÉCISE</label>
                <input
                  type="date"
                  className="styled-date-input"
                  value={newEvent.date_event}
                  onChange={(e) => setNewEvent({ ...newEvent, date_event: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div className="filter-bar" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: '15px', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="filter-group">
              <label><Clock size={12}/> DÉBUT</label>
              <input type="time" className="styled-date-input" value={newEvent.heure_event} onChange={(e) => setNewEvent({ ...newEvent, heure_event: e.target.value })} required />
            </div>
            <div className="filter-group">
              <label>FIN</label>
              <input type="time" className="styled-date-input" value={newEvent.heure_fin} onChange={(e) => setNewEvent({ ...newEvent, heure_fin: e.target.value })} required />
            </div>
            <div className="filter-group">
              <label><MapPin size={12}/> LIEU</label>
              <input type="text" className="styled-date-input" placeholder="Gymnase..." value={newEvent.lieu} onChange={(e) => setNewEvent({ ...newEvent, lieu: e.target.value })} required />
            </div>
          </div>

          {/* RÉCURRENCE */}
          {newEvent.type_event === 'Entraînement' && (
            <div className="filter-group" style={{ marginBottom: '15px', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="checkRepeat" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: '20px', height: '20px' }} />
              <label htmlFor="checkRepeat" style={{ cursor: 'pointer', fontWeight: 'bold', color: isRecurring ? '#ffcc00' : '#888' }}>
                <Repeat size={14} /> GÉNÉRER SUR TOUTE LA SAISON
              </label>
            </div>
          )}

          {isRecurring && (
            <div className="recurrence-box" style={{ marginBottom: '20px', padding: '15px', background: '#111', borderRadius: '8px', border: '1px dashed #444' }}>
              <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: '10px' }}>SÉLECTIONNEZ LES JOURS :</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {daysOfWeek.map((day) => (
                  <div
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={`access-pill ${selectedDays.includes(day.id) ? 'active' : ''}`}
                    style={{ minWidth: '45px', textAlign: 'center', cursor: 'pointer' }}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {newEvent.type_event.includes('Match') && (
            <div className="filter-group" style={{ marginBottom: '15px' }}>
              <label>ADVERSAIRE / NOM DU TOURNOI</label>
              <input type="text" className="styled-date-input" placeholder="Ex: Bordeaux Volley" value={newEvent.adversaire} onChange={(e) => setNewEvent({ ...newEvent, adversaire: e.target.value })} />
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'ENREGISTREMENT...' : (isRecurring ? 'GÉNÉRER LE CALENDRIER' : 'CRÉER L\'ÉVÉNEMENT')}
          </button>
        </form>
      )}

      {/* LISTE DES ÉVÉNEMENTS */}
      {loading && !showAddForm ? (
        <div className="loading-screen" style={{ textAlign: 'center', padding: '40px', color: '#ffcc00' }}>
          <div className="spinner"></div> CHARGEMENT DU CALENDRIER...
        </div>
      ) : (
        <div className="player-list view-fade">
          {events.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
              <AlertCircle size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>Aucun événement trouvé pour cette équipe.</p>
            </div>
          ) : (
            events.map((ev) => {
              const countOK = ev.presences?.filter(p => p.statut === 'Présent').length || 0;
              const countTotal = ev.presences?.length || 0;

              return (
                <div key={ev.id} className="player-data-card event-card-master" style={{ cursor: 'default', position: 'relative', marginBottom: '15px' }}>
                  
                  {/* DELETE BUTTON */}
                  <button 
                    onClick={() => handleDelete(ev.id)}
                    className="btn-delete-event"
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#ff4444' }}
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="card-header" style={{ paddingRight: '40px' }}>
                    <span className="player-name" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ev.type_event.includes('Match') ? <Trophy size={18} className="yellow" /> : <Dumbbell size={18} className="yellow" />}
                      {ev.type_event.toUpperCase()} {ev.adversaire && ` vs ${ev.adversaire}`}
                    </span>
                    <div className="nav-role-yellow" style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                      {new Date(ev.date_event).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                    </div>
                  </div>

                  <div className="stats-grid" style={{ marginTop: '15px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="stat-box">
                      <label><Clock size={10} /> HORAIRES</label>
                      <span>{ev.heure_event.slice(0, 5)} {ev.heure_fin ? `- ${ev.heure_fin.slice(0, 5)}` : ''}</span>
                    </div>
                    <div className="stat-box">
                      <label><MapPin size={10} /> LIEU</label>
                      <span title={ev.lieu}>{ev.lieu.length > 12 ? ev.lieu.slice(0, 10) + '...' : ev.lieu}</span>
                    </div>
                    <div className="stat-box">
                      <label><Users size={10} /> PRÉSENTS</label>
                      <span className="yellow">{countOK} / {countTotal}</span>
                    </div>
                  </div>

                  {/* PRÉSENCES INDIVIDUELLES */}
                  <div className="presence-grid-mini" style={{ marginTop: '15px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {ev.presences?.map((p) => (
                        <span
                          key={p.player_id}
                          className={`access-pill ${p.statut === 'Présent' ? 'active' : ''}`}
                          style={{
                            fontSize: '0.6rem',
                            padding: '4px 8px',
                            background: p.statut === 'Absent' ? '#c0392b' : (p.statut === 'En attente' ? '#333' : ''),
                            opacity: p.statut === 'En attente' ? 0.5 : 1
                          }}
                        >
                          {p.prenom} {p.statut === 'Présent' ? '✅' : (p.statut === 'Absent' ? '❌' : '❓')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}