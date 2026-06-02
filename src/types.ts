export interface Bilan {
  player_id: number;
  date_session: string;
  satisfaction: number;
  rpe: number;
  domaine_progres: string;
  auto_physique: number;
  auto_technique: number;
  auto_mental: number;
  commentaire: string;
}

export interface Joueur {
  id: number;
  prenom: string;
  nom: string;
  team_id: number | null;
  pseudo: string | null;
}

export interface Equipe {
  id: number;
  nom_equipe: string;
}