import React from 'react';
import { TrendingUp, Brain, AlertTriangle, Activity } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export default function StatsCards({ stats = {}, realTimeStats = {} }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">Total Prédictions</p>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.totalPredictions || 0)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-blue-400" />
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm">Précision du Modèle</p>
            <p className="text-2xl font-bold text-white">{stats.accuracy ?? 0}%</p>
          </div>
          <Brain className="w-8 h-8 text-green-400" />
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-200 text-sm">Niveau de Menace</p>
            <p className={`text-2xl font-bold ${getThreatLevelColorClass(stats.threatLevel)}`}>
              {stats.threatLevel ?? 'Inconnu'}
            </p>
          </div>
          <AlertTriangle className="w-8 h-8 text-orange-400" />
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-sm">Classifications/min</p>
            <p className="text-2xl font-bold text-white">
              {realTimeStats?.classifications_per_minute ?? 0}
            </p>
          </div>
          <Activity className="w-8 h-8 text-purple-400" />
        </div>
      </div>
    </div>
  );
}

// helper to map threat level (French) to a Tailwind color class
function getThreatLevelColorClass(level) {
  if (!level) return 'text-gray-400';
  const l = String(level).toLowerCase();
  if (l.includes('élev') || l.includes('haut') || l.includes('high')) return 'text-red-400';
  if (l.includes('mod')) return 'text-yellow-400';
  if (l.includes('faible') || l.includes('low')) return 'text-green-400';
  return 'text-gray-400';
}
