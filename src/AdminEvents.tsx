import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Clock, Trophy, Dumbbell, Users, Repeat, Trash2, X, AlertCircle, ChevronDown } from 'lucide-react';
import './AdminEvents.css';

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

const EVENT_TYPES = [
  { value: 'Entraînement', label: 'Entraînement', icon: '🏐' },
  { value: 'Match',        label: 'Match',         icon: '🏆' },
  { value: 'Match Amical', label: 'Amical',         icon: '🤝' },
];

const DAYS = [
  { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'Me' },
  { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 0, label: 'D' },
];

const initialForm = {
  type_event: 'Entraînement',
  date_event: new Date().toISOString().split('T')[0],
  heure_event: '18:30',
  heure_fin: '20:30',
  lieu: 'Maitre Jean',
  adversaire: '',
};

export default function AdminEvents({ teamId, API }: AdminEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchEvents = () => {
    if (!teamId) return;
    setLoading(true);
    fetch(`${API}?action=get_team_events_admin&team_id=${teamId}&t=${Date.now()}`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, [teamId]);

  const toggleDay = (id: number) =>
    setSelectedDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const handleDelete = async (id: number) => {
    const res = await fetch(`${API}?t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_delete_event', event_id: id }),
    });
    const result = await res.json();
    if (result.status === 'success') fetchEvents();
  };

  const handleClearFuture = async () => {
    setConfirmClear(false);
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_clear_future_events', team_id: teamId }),
    });
    const result = await res.json();
    if (result.status === 'success') fetchEvents();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecurring && selectedDays.length === 0) return;
    setLoading(true);
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, team_id: teamId, action: 'admin_create_event', is_recurring: isRecurring, selected_days: selectedDays }),
    });
    const result = await res.json();
    if (result.status === 'success') {
      setShowForm(false);
      setForm(initialForm);
      setIsRecurring(false);
      setSelectedDays([]);
      fetchEvents();
    }
    setLoading(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <div className="ae-container">

      {/* ─── BARRE ACTIONS ─── */}
      <div className="ae-toolbar">
        <button className="ae-btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Ajouter
        </button>
        <button className="ae-btn-danger" onClick={() => setConfirmClear(true)} title="Vider le calendrier futur">
          <Trash2 size={16} />
        </button>
      </div>

      {/* ─── CONFIRM CLEAR ─── */}
      {confirmClear && (
        <div className="ae-confirm-bar">
          <span>Supprimer tous les événements futurs ?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ae-confirm-cancel" onClick={() => setConfirmClear(false)}>Annuler</button>
            <button className="ae-confirm-ok" onClick={handleClearFuture}>Confirmer</button>
          </div>
        </div>
      )}

      {/* ─── LISTE ÉVÉNEMENTS ─── */}
      {loading && events.length === 0 ? (
        <div className="ae-empty">Chargement...</div>
      ) : events.length === 0 ? (
        <div className="ae-empty">
          <AlertCircle size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
          <span>Aucun événement</span>
        </div>
      ) : (
        <div className="ae-list">
          {events.map(ev => {
            const countOK = ev.presences?.filter(p => p.statut === 'Présent').length ?? 0;
            const countTotal = ev.presences?.length ?? 0;
            const isMatch = ev.type_event.includes('Match');
            return (
              <div key={ev.id} className="ae-card">
                <div className="ae-card-top">
                  <div className="ae-card-left">
                    <span className={`ae-type-badge ${isMatch ? 'match' : 'training'}`}>
                      {isMatch ? <Trophy size={12} /> : <Dumbbell size={12} />}
                      {ev.type_event.toUpperCase()}
                    </span>
                    {ev.adversaire && <span className="ae-adversaire">vs {ev.adversaire}</span>}
                  </div>
                  <button className="ae-delete-btn" onClick={() => handleDelete(ev.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="ae-card-date">{formatDate(ev.date_event)}</div>

                <div className="ae-card-meta">
                  <span className="ae-meta-item">
                    <Clock size={12} />
                    {ev.heure_event.slice(0, 5)}{ev.heure_fin ? ` – ${ev.heure_fin.slice(0, 5)}` : ''}
                  </span>
                  <span className="ae-meta-item">
                    <MapPin size={12} />
                    {ev.lieu}
                  </span>
                  <span className="ae-meta-item ae-presences-count">
                    <Users size={12} />
                    {countOK}/{countTotal}
                  </span>
                </div>

                {(ev.presences?.length ?? 0) > 0 && (
                  <div className="ae-presences">
                    {ev.presences!.map(p => (
                      <span key={p.player_id} className={`ae-pill ${p.statut === 'Présent' ? 'present' : p.statut === 'Absent' ? 'absent' : 'pending'}`}>
                        {p.prenom}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── BOTTOM SHEET FORMULAIRE ─── */}
      {showForm && (
        <div className="ae-overlay" onClick={() => setShowForm(false)}>
          <form className="ae-sheet" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="ae-sheet-handle" />

            <div className="ae-sheet-header">
              <span className="ae-sheet-title">Nouvel événement</span>
              <button type="button" className="ae-sheet-close" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Type */}
            <div className="ae-field-label">TYPE</div>
            <div className="ae-type-pills">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  className={`ae-type-pill ${form.type_event === t.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, type_event: t.value })}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Date (si non récurrent) */}
            {!isRecurring && (
              <>
                <div className="ae-field-label">DATE</div>
                <input
                  type="date"
                  className="ae-input"
                  value={form.date_event}
                  onChange={e => setForm({ ...form, date_event: e.target.value })}
                  required
                />
              </>
            )}

            {/* Horaires */}
            <div className="ae-field-label">HORAIRES</div>
            <div className="ae-row">
              <div className="ae-field-wrap">
                <span className="ae-field-sub">Début</span>
                <input type="time" step="600" className="ae-input" value={form.heure_event}
                  onChange={e => setForm({ ...form, heure_event: e.target.value })} required />
              </div>
              <div className="ae-field-wrap">
                <span className="ae-field-sub">Fin</span>
                <input type="time" step="600" className="ae-input" value={form.heure_fin}
                  onChange={e => setForm({ ...form, heure_fin: e.target.value })} />
              </div>
            </div>

            {/* Lieu */}
            <div className="ae-field-label">LIEU</div>
            <input
              type="text"
              className="ae-input"
              placeholder="Gymnase..."
              value={form.lieu}
              onChange={e => setForm({ ...form, lieu: e.target.value })}
              required
            />

            {/* Adversaire */}
            {form.type_event.includes('Match') && (
              <>
                <div className="ae-field-label">ADVERSAIRE</div>
                <input
                  type="text"
                  className="ae-input"
                  placeholder="Ex: Bordeaux Volley"
                  value={form.adversaire}
                  onChange={e => setForm({ ...form, adversaire: e.target.value })}
                />
              </>
            )}

            {/* Récurrence */}
            {form.type_event === 'Entraînement' && (
              <button
                type="button"
                className={`ae-recurring-toggle ${isRecurring ? 'active' : ''}`}
                onClick={() => setIsRecurring(!isRecurring)}
              >
                <Repeat size={14} />
                Générer sur toute la saison
                <ChevronDown size={14} className={isRecurring ? 'rotated' : ''} style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: isRecurring ? 'rotate(180deg)' : 'none' }} />
              </button>
            )}

            {isRecurring && (
              <div className="ae-days-row">
                {DAYS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    className={`ae-day-pill ${selectedDays.includes(d.id) ? 'active' : ''}`}
                    onClick={() => toggleDay(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            <button type="submit" className="ae-submit" disabled={loading}>
              {loading ? 'Enregistrement...' : isRecurring ? 'Générer le calendrier' : 'Créer l\'événement'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
