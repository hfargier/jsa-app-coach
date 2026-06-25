import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  Plus, X, FileText, ChevronRight,
  GripVertical, Eye, EyeOff, ArrowLeft,
  Smartphone, Trash2, Copy, ChevronDown, BookMarked
} from 'lucide-react';

interface Criterion {
  id: number;
  nom_critere: string;
  categorie: string;
  formulaire_id: number | null;
  ordre: number;
}

interface Formulaire {
  id: number;
  nom_formulaire: string;
  team_id: number | null;
  actif: number;
  is_template: number;
}

interface AdminFormsProps {
  API: string;
  activeTeamId: number;
  activeTeamName: string;
  isAdmin: boolean;
}

export default function AdminForms({ API, activeTeamId, activeTeamName, isAdmin }: AdminFormsProps) {
  const [myForms, setMyForms] = useState<Formulaire[]>([]);
  const [availableForms, setAvailableForms] = useState<Formulaire[]>([]);
  const [selectedForm, setSelectedForm] = useState<Formulaire | null>(null);
  const [allCriteria, setAllCriteria] = useState<Criterion[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState('Tous');
  const [loading, setLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [newCrit, setNewCrit] = useState({ nom: '', categorie: '' });
  const [newFormName, setNewFormName] = useState('');
  const [confirmDeleteCrit, setConfirmDeleteCrit] = useState<number | null>(null);
  const [confirmDeleteForm, setConfirmDeleteForm] = useState<number | null>(null);
  const [showAvailable, setShowAvailable] = useState(false);
  const [copyingId, setCopyingId] = useState<number | null>(null);

  const post = (body: object) =>
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

  const fetchData = async () => {
    if (!activeTeamId) return;
    setLoading(true);
    try {
      const [resF, resA, resC, resCat] = await Promise.all([
        fetch(`${API}?action=get_all_forms&team_id=${activeTeamId}&t=${Date.now()}`).then(r => r.json()),
        fetch(`${API}?action=get_available_forms&team_id=${activeTeamId}&t=${Date.now()}`).then(r => r.json()),
        fetch(`${API}?action=get_all_criteria_global&t=${Date.now()}`).then(r => r.json()),
        fetch(`${API}?action=get_categories&t=${Date.now()}`).then(r => r.json()),
      ]);
      setMyForms(Array.isArray(resF) ? resF : []);
      setAvailableForms(Array.isArray(resA) ? resA : []);
      setAllCriteria(Array.isArray(resC) ? resC : []);
      setDbCategories(Array.isArray(resCat) ? resCat : []);
      if (resCat.length > 0 && !newCrit.categorie) setNewCrit(p => ({ ...p, categorie: resCat[0] }));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTeamId]);

  // Sync form après toggle visibilité
  const handleToggleVisibility = async (form: Formulaire) => {
    const res = await post({ action: 'toggle_form_visibility', form_id: form.id });
    if (res.status === 'success') {
      setMyForms(prev => prev.map(f => f.id === form.id ? { ...f, actif: res.actif } : f));
    }
  };

  const handleToggleTemplate = async (form: Formulaire) => {
    const res = await post({ action: 'toggle_form_template', form_id: form.id });
    if (res.status === 'success') {
      setMyForms(prev => prev.map(f => f.id === form.id ? { ...f, is_template: res.is_template } : f));
    }
  };

  const handleDeleteForm = async (formId: number) => {
    const res = await post({ action: 'delete_form', form_id: formId });
    if (res.status === 'success') {
      setMyForms(prev => prev.filter(f => f.id !== formId));
      setConfirmDeleteForm(null);
      if (selectedForm?.id === formId) setSelectedForm(null);
      fetchData();
    }
  };

  const handleCopyForm = async (sourceId: number) => {
    setCopyingId(sourceId);
    const res = await post({ action: 'copy_form_to_team', source_form_id: sourceId, team_id: activeTeamId });
    setCopyingId(null);
    if (res.status === 'success') fetchData();
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || !selectedForm) return;
    if (source.droppableId === 'form-fields' && destination.droppableId === 'form-fields') {
      const items = [...allCriteria.filter(c => Number(c.formulaire_id) === Number(selectedForm.id)).sort((a, b) => a.ordre - b.ordre)];
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);
      await post({ action: 'update_criteria_order_bulk', orders: items.map((item, i) => ({ id: item.id, ordre: i })) });
      fetchData();
      return;
    }
    if (source.droppableId === 'bank-list' && destination.droppableId === 'form-fields') {
      await post({ action: 'add_to_form', crit_id: Number(draggableId), form_id: Number(selectedForm.id) });
      fetchData();
    }
  };

  const currentFormCriteria = allCriteria.filter(c => Number(c.formulaire_id) === Number(selectedForm?.id)).sort((a, b) => a.ordre - b.ordre);
  const bankCriteria = allCriteria.filter(c => Number(c.formulaire_id) !== Number(selectedForm?.id) && (filterCat === 'Tous' || c.categorie === filterCat)).sort((a, b) => b.id - a.id);

  // ─── PRÉVISUALISATION ───────────────────────────────────────
  if (isPreviewMode && selectedForm) {
    return (
      <div className="view-fade" style={{ padding: '10px', background: '#000', minHeight: '100vh' }}>
        <button onClick={() => setIsPreviewMode(false)} className="jsa-button-danger-outline" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={16} /> RETOUR ÉDITION
        </button>
        <div className="player-data-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="form-header-yellow" style={{ textAlign: 'center', padding: '15px' }}>
            <Smartphone size={18} /> {selectedForm.nom_formulaire.toUpperCase()}
          </div>
          <div style={{ padding: '20px' }}>
            {currentFormCriteria.map(c => (
              <div key={c.id} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                  <span>{c.nom_critere}</span>
                  <span className="yellow">5/10</span>
                </div>
                <input type="range" min="0" max="10" style={{ width: '100%', accentColor: '#ffcc00' }} readOnly />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── ÉDITEUR FORMULAIRE ─────────────────────────────────────
  if (selectedForm) {
    return (
      <div className="view-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <button onClick={() => setSelectedForm(null)} className="jsa-button-danger-outline">← RETOUR</button>
          <button onClick={() => setIsPreviewMode(true)} className="jsa-button-primary" style={{ background: '#333', color: '#ffcc00', border: '1px solid #ffcc00' }}>
            <Eye size={16} /> PRÉVISUALISER
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: '15px' }}>

            {/* BANQUE */}
            <div style={{ flex: 1 }}>
              <div className="player-data-card" style={{ padding: '15px', marginBottom: '10px', background: '#222' }}>
                <div className="form-header-yellow" style={{ fontSize: '0.7rem', marginBottom: '10px' }}>NOUVEAU CRITÈRE</div>
                <input type="text" placeholder="Nom..." value={newCrit.nom} onChange={e => setNewCrit({ ...newCrit, nom: e.target.value })} style={{ width: '100%', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select value={newCrit.categorie} onChange={e => setNewCrit({ ...newCrit, categorie: e.target.value })} style={{ flex: 1 }}>
                    {dbCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button className="jsa-button-primary" onClick={async () => {
                    if (!newCrit.nom) return;
                    await post({ action: 'create_global_criterion', ...newCrit });
                    setNewCrit({ ...newCrit, nom: '' }); fetchData();
                  }}><Plus size={16} /></button>
                </div>
                <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#666' }}>FILTRER :</label>
                  <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: '100%' }}>
                    <option value="Tous">TOUS</option>
                    {dbCategories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <Droppable droppableId="bank-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ minHeight: '300px', background: '#111', padding: '5px' }}>
                    {bankCriteria.map((c, index) => (
                      <Draggable key={c.id.toString()} draggableId={c.id.toString()} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className="player-data-card" style={{ padding: '8px', marginBottom: '5px', ...provided.draggableProps.style }}>
                            {confirmDeleteCrit === c.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>Supprimer ?</span>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button className="gestion-btn-cancel" style={{ padding: '4px 8px', fontSize: '0.62rem' }} onClick={() => setConfirmDeleteCrit(null)}>Non</button>
                                  <button className="gestion-btn-delete-confirm" style={{ padding: '4px 8px', fontSize: '0.62rem' }} onClick={async () => {
                                    await post({ action: 'delete_criterion', id: c.id });
                                    setConfirmDeleteCrit(null); fetchData();
                                  }}>Oui</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '800' }}>{c.nom_critere}</div>
                                  <div style={{ fontSize: '0.6rem', color: '#ffcc00' }}>{c.categorie.toUpperCase()}</div>
                                </div>
                                {isAdmin && (
                                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteCrit(c.id); }}
                                    style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* FORMULAIRE ACTIF */}
            <div style={{ flex: 1 }}>
              <div className="form-header-yellow" style={{ padding: '10px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
                {selectedForm.nom_formulaire.toUpperCase()}
              </div>
              <Droppable droppableId="form-fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ minHeight: '300px', background: '#1a1a1a', border: '2px dashed #333', padding: '5px' }}>
                    {currentFormCriteria.map((c, index) => (
                      <Draggable key={c.id.toString()} draggableId={c.id.toString()} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className="player-data-card border-yellow" style={{ padding: '8px', marginBottom: '5px', ...provided.draggableProps.style }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div {...provided.dragHandleProps}><GripVertical size={16} color="#666" /></div>
                              <div style={{ flex: 1, fontSize: '0.75rem', fontWeight: '800' }}>{c.nom_critere}</div>
                              <button onClick={async () => {
                                await post({ action: 'remove_from_form', crit_id: c.id });
                                fetchData();
                              }} style={{ background: 'none', border: 'none', color: '#666' }}><X size={14} /></button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </div>
    );
  }

  // ─── LISTE DES FORMULAIRES ──────────────────────────────────
  return (
    <div className="view-fade">

      {/* ENTÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 800 }}>
          <span className="yellow">{activeTeamName.toUpperCase()}</span>
        </div>
        <button className="jsa-button-primary" onClick={() => setShowNewFormModal(true)}>
          <Plus size={16} /> NOUVEAU
        </button>
      </div>

      {loading ? <p style={{ textAlign: 'center', padding: '20px', color: '#555' }}>Chargement...</p> : (
        <>
          {/* ── SECTION 1 : MES FORMULAIRES ── */}
          <div className="forms-section-label">MES FORMULAIRES</div>
          <div className="player-list" style={{ marginBottom: '24px' }}>
            {myForms.length === 0 && (
              <p style={{ color: '#444', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>Aucun formulaire — créez-en un ou copiez depuis la liste ci-dessous.</p>
            )}
            {myForms.map(f => (
              <div key={f.id} className="forms-card">
                {/* Nom cliquable → éditeur */}
                <div className="forms-card-left" onClick={() => setSelectedForm(f)}>
                  <FileText size={16} className={f.actif ? 'yellow' : ''} style={{ color: f.actif ? '#ffcc00' : '#444', flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="forms-card-name" style={{ color: f.actif ? '#fff' : '#555' }}>{f.nom_formulaire}</div>
                      {f.is_template === 1 && <span className="forms-badge-template">TEMPLATE</span>}
                    </div>
                    <div className="forms-card-status">{f.actif ? '● Visible joueurs' : '○ Masqué'}</div>
                  </div>
                </div>

                <div className="forms-card-actions">
                  {/* Toggle template (admin only) */}
                  {isAdmin && (
                    <button
                      className={`forms-btn-template ${f.is_template ? 'active' : ''}`}
                      onClick={() => handleToggleTemplate(f)}
                      title={f.is_template ? 'Retirer des templates' : 'Marquer comme template partageable'}
                    >
                      <BookMarked size={15} />
                    </button>
                  )}

                  {/* Toggle visibilité */}
                  <button className={`forms-btn-visibility ${f.actif ? 'active' : ''}`} onClick={() => handleToggleVisibility(f)} title={f.actif ? 'Masquer' : 'Rendre visible'}>
                    {f.actif ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>

                  {/* Supprimer */}
                  {confirmDeleteForm === f.id ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="gestion-btn-cancel" style={{ padding: '4px 8px', fontSize: '0.62rem' }} onClick={() => setConfirmDeleteForm(null)}>Non</button>
                      <button className="gestion-btn-delete-confirm" style={{ padding: '4px 8px', fontSize: '0.62rem' }} onClick={() => handleDeleteForm(f.id)}>Oui</button>
                    </div>
                  ) : (
                    <button className="forms-btn-delete" onClick={() => setConfirmDeleteForm(f.id)}>
                      <Trash2 size={15} />
                    </button>
                  )}

                  <ChevronRight size={16} style={{ color: '#333' }} onClick={() => setSelectedForm(f)} />
                </div>
              </div>
            ))}
          </div>

          {/* ── SECTION 2 : FORMULAIRES DISPONIBLES ── */}
          <button className="forms-available-toggle" onClick={() => setShowAvailable(v => !v)}>
            <Copy size={15} />
            FORMULAIRES DISPONIBLES ({availableForms.length})
            <ChevronDown size={15} style={{ marginLeft: 'auto', transform: showAvailable ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showAvailable && (
            <div className="player-list view-fade" style={{ marginTop: '10px' }}>
              {availableForms.length === 0 && (
                <p style={{ color: '#444', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>Aucun formulaire disponible.</p>
              )}
              {availableForms.map(f => (
                <div key={f.id} className="forms-card forms-card-available">
                  <div className="forms-card-left">
                    <FileText size={16} style={{ color: '#555', flexShrink: 0 }} />
                    <div>
                      <div className="forms-card-name" style={{ color: '#888' }}>{f.nom_formulaire}</div>
                      <div className="forms-card-status" style={{ color: '#333' }}>
                        {allCriteria.filter(c => Number(c.formulaire_id) === f.id).length} critère(s)
                      </div>
                    </div>
                  </div>
                  <button
                    className="forms-btn-copy"
                    onClick={() => handleCopyForm(f.id)}
                    disabled={copyingId === f.id}
                  >
                    <Copy size={14} />
                    {copyingId === f.id ? '...' : 'Copier'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL CRÉATION */}
      {showNewFormModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="player-data-card" style={{ width: '300px', padding: '20px' }}>
            <h3 style={{ color: '#ffcc00', marginBottom: '15px' }}>NOM DU FORMULAIRE</h3>
            <input type="text" value={newFormName} onChange={e => setNewFormName(e.target.value)} style={{ width: '100%', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => {
                const res = await post({ action: 'create_new_form', nom_formulaire: newFormName, team_id: activeTeamId });
                if (res.status === 'success') { setNewFormName(''); setShowNewFormModal(false); fetchData(); }
              }} className="jsa-button-submit" style={{ flex: 1 }}>CRÉER</button>
              <button onClick={() => setShowNewFormModal(false)} className="jsa-button-danger-outline" style={{ flex: 1 }}>ANNULER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
