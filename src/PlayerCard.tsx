import React from 'react';
import { TrendingUp, Smile, ChevronRight } from 'lucide-react';
import type { Joueur, Bilan } from './types';

interface PlayerCardProps {
  joueur: Joueur;
  lastBilan?: Bilan;
  avgSatisfaction: number;
  onClick: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ joueur, lastBilan, avgSatisfaction, onClick }) => {
  const rpe = lastBilan ? Number(lastBilan.rpe) : 0;
  const satisfaction = lastBilan ? Number(lastBilan.satisfaction) : 10;
  const isAlert = rpe > 8 || satisfaction < 4;

  return (
    <div 
      onClick={onClick}
      className={`relative bg-[#1e1e1e] rounded-xl p-5 border-2 transition-all cursor-pointer hover:scale-[1.02] 
        ${isAlert ? 'border-red-600' : 'border-gray-800 hover:border-[#ffcc00]'}`}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white uppercase leading-tight">
            {joueur.prenom} <span className="text-[#ffcc00] block text-sm">{joueur.nom}</span>
          </h3>
          <p className="text-gray-500 text-xs mt-1">@{joueur.pseudo || 'invité'}</p>
        </div>
        <ChevronRight className="text-gray-600" size={20} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#121212] p-3 rounded-lg border border-gray-800 text-center">
          <div className="flex justify-center items-center gap-1 mb-1 text-gray-400">
            <TrendingUp size={12} />
            <span className="text-[10px] uppercase font-bold">RPE</span>
          </div>
          <p className={`text-xl font-black ${rpe > 8 ? 'text-red-500' : 'text-white'}`}>{rpe || '--'}</p>
        </div>
        <div className="bg-[#121212] p-3 rounded-lg border border-gray-800 text-center">
          <div className="flex justify-center items-center gap-1 mb-1 text-gray-400">
            <Smile size={12} />
            <span className="text-[10px] uppercase font-bold">Satis.</span>
          </div>
          <p className="text-xl font-black text-[#ffcc00]">{avgSatisfaction || '--'}</p>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;