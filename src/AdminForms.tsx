import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd'; 
import { 
  Plus, X, FileText, ChevronRight, 
  GripVertical, Eye, ArrowLeft,
  Smartphone
} from 'lucide-react';

// --- INTERFACES POUR LE TYPAGE ---
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
}

// Définition explicite des propriétés acceptées par le composant
interface AdminFormsProps {
  API: string;
  activeTeamId: number;
  activeTeamName: string; // Ajouté pour corriger l'erreur (2322)
}

export default function AdminForms({ API, activeTeamId, activeTeamName }: AdminFormsProps) {
  const [forms, setForms] = useState<Formulaire[]>([]);
  const [selectedForm, setSelectedForm] = useState<Formulaire | null>(null);
  const [allCriteria, setAllCriteria] = useState<Criterion[]>([]);
  
  // ÉTATS DYNAMIQUES POUR LES CATÉGORIES
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState('Tous');
  
  const [loading, setLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [newCrit, setNewCrit] = useState({ nom: '', categorie: '' });
  const [newFormName, setNewFormName] = useState('');

  const fetchData = async () => {
    if (!activeTeamId) return;
    setLoading(true);
    try {
      // 1. Charger les formulaires de l'équipe
      const resF = await fetch(`${API}?action=get_all_forms&team_id=${activeTeamId}&t=${Date.now()}`);
      setForms(await resF.json());

      // 2. Charger tous les critères
      const resC = await fetch(`${API}?action=get_all_criteria_global&t=${Date.now()}`);
      const dataC = await resC.json();
      setAllCriteria(dataC);

      // 3. Charger les catégories DYNAMIQUEMENT depuis la BDD
      const resCat = await fetch(`${API}?action=get_categories&t=${Date.now()}`);
      const dataCat = await resCat.json();
      setDbCategories(dataCat);
      
      // Initialiser la catégorie par défaut pour un nouveau critère
      if (dataCat.length > 0 && !newCrit.categorie) {
        setNewCrit(prev => ({ ...prev, categorie: dataCat[0] }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTeamId]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || !selectedForm) return;

    if (source.droppableId === 'form-fields' && destination.droppableId === 'form-fields') {
      const currentItems = allCriteria
        .filter(c => Number(c.formulaire_id) === Number(selectedForm.id))
        .sort((a, b) => a.ordre - b.ordre);
      const items = Array.from(currentItems);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      const newOrderData = items.map((item, index) => ({ id: item.id, ordre: index }));
      await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'update_criteria_order_bulk', orders: newOrderData }) });
      fetchData();
      return;
    }

    if (source.droppableId === 'bank-list' && destination.droppableId === 'form-fields') {
      await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'add_to_form', crit_id: Number(draggableId), form_id: Number(selectedForm.id) }) });
      fetchData();
    }
  };

  // Filtrage
  const currentFormCriteria = allCriteria
    .filter(c => Number(c.formulaire_id) === Number(selectedForm?.id))
    .sort((a, b) => a.ordre - b.ordre);

  const bankCriteria = allCriteria
    .filter(c => Number(c.formulaire_id) !== Number(selectedForm?.id) && (filterCat === 'Tous' || c.categorie === filterCat))
    .sort((a, b) => b.id - a.id);

  if (isPreviewMode && selectedForm) {
    return (
      <div className="view-fade preview-container" style={{ padding: '10px', background: '#000', minHeight: '100vh' }}>
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

  return (
    <div className="view-fade">
      {!selectedForm ? (
        <div className="view-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{fontSize: '0.9rem', color: '#888', fontWeight: '800'}}>
               ÉQUIPE : <span className="yellow">{activeTeamName.toUpperCase()}</span>
            </div>
            <button className="jsa-button-primary" onClick={() => setShowNewFormModal(true)}>
              <Plus size={16}/> NOUVEAU FORMULAIRE
            </button>
          </div>
          <div className="player-list">
            {loading ? <p style={{textAlign: 'center', padding: '20px'}}>Chargement...</p> : 
              forms.map(f => (
              <div key={f.id} className="player-data-card event-card-jsa" onClick={() => setSelectedForm(f)}>
                <div className="card-header">
                  <div className="event-main-info"><FileText className="yellow" size={20} /> <span className="event-title">{f.nom_formulaire.toUpperCase()}</span></div>
                  <ChevronRight size={20} className="yellow" />
                </div>
              </div>
            ))
            }
          </div>
        </div>
      ) : (
        <div className="view-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <button onClick={() => setSelectedForm(null)} className="jsa-button-danger-outline">← RETOUR</button>
            <button onClick={() => setIsPreviewMode(true)} className="jsa-button-primary" style={{ background: '#333', color: '#ffcc00', border: '1px solid #ffcc00' }}>
                <Eye size={16} /> PRÉVISUALISER
            </button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="dual-column-layout" style={{ display: 'flex', gap: '15px' }}>
              
              {/* BANQUE DE CRITÈRES */}
              <div style={{ flex: 1 }}>
                <div className="player-data-card" style={{padding:'15px', marginBottom:'10px', background: '#222'}}>
                  <div className="form-header-yellow" style={{fontSize: '0.7rem', marginBottom: '10px'}}>NOUVEAU CRITÈRE</div>
                  <input 
                    type="text" 
                    placeholder="Nom..." 
                    value={newCrit.nom} 
                    onChange={e => setNewCrit({...newCrit, nom: e.target.value})}
                    style={{width: '100%', marginBottom: '8px'}}
                  />
                  <div style={{display: 'flex', gap: '5px'}}>
                    <select value={newCrit.categorie} onChange={e => setNewCrit({...newCrit, categorie: e.target.value})} style={{flex: 1}}>
                      {dbCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button className="jsa-button-primary" onClick={async () => {
                         if(!newCrit.nom) return;
                         await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'create_global_criterion', ...newCrit }) });
                         setNewCrit({ ...newCrit, nom: '' }); fetchData();
                    }}><Plus size={16}/></button>
                  </div>
                  
                  <div style={{marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px'}}>
                    <label style={{fontSize: '0.7rem', color: '#666'}}>FILTRER PAR :</label>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{width: '100%'}}>
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
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="player-data-card" style={{ padding: '8px', marginBottom: '5px', ...provided.draggableProps.style }}>
                               <div style={{fontSize: '0.75rem', fontWeight: '800'}}>{c.nom_critere}</div>
                               <div style={{fontSize: '0.6rem', color: '#ffcc00'}}>{c.categorie.toUpperCase()}</div>
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
                <div className="form-header-yellow" style={{padding: '10px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold'}}>
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
                                <div style={{flex: 1, fontSize: '0.75rem', fontWeight: '800'}}>{c.nom_critere}</div>
                                <button onClick={async () => {
                                    await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'remove_from_form', crit_id: c.id }) });
                                    fetchData();
                                  }} style={{background: 'none', border: 'none', color: '#666'}}><X size={14}/></button>
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
      )}

      {/* MODAL CRÉATION FORMULAIRE */}
      {showNewFormModal && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
           <div className="player-data-card" style={{width: '300px', padding: '20px'}}>
              <h3 style={{color: '#ffcc00', marginBottom: '15px'}}>NOM DU FORMULAIRE</h3>
              <input type="text" value={newFormName} onChange={e => setNewFormName(e.target.value)} style={{width: '100%', marginBottom: '20px'}} />
              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={async () => {
                    const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'create_new_form', nom_formulaire: newFormName, team_id: activeTeamId }) });
                    if((await res.json()).status === "success") { setNewFormName(''); setShowNewFormModal(false); fetchData(); }
                }} className="jsa-button-submit" style={{flex: 1}}>CRÉER</button>
                <button onClick={() => setShowNewFormModal(false)} className="jsa-button-danger-outline" style={{flex: 1}}>ANNULER</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}