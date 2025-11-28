// ResultsPanel.jsx - Version corrigée
import React, { useState } from 'react';
import { Eye, BarChart3, Download, Filter } from 'lucide-react';

export default function ResultsPanel({ results = {} }) {
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('id');

  const predictions = results.predictions ?? [];
  const summary = results.summary ?? {};
  const processingStats = results.stats ?? null;

  // Filtrage et tri
  const filteredPredictions = predictions.filter(p => {
    if (filterType === 'all') return true;
    return p.prediction?.toLowerCase().includes(filterType.toLowerCase());
  });

  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    if (sortBy === 'id') return (a.id ?? 0) - (b.id ?? 0);
    if (sortBy === 'confidence') return (b.confidence ?? 0) - (a.confidence ?? 0);
    if (sortBy === 'risk') {
      const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return (riskOrder[b.risk] ?? 0) - (riskOrder[a.risk] ?? 0);
    }
    return 0;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Flow ID', 'Prédiction', 'Confiance', 'Risque'];
    const rows = predictions.map(p => [
      p.id ?? '',
      p.flow_id ?? p.flow ?? '',
      p.prediction ?? '',
      ((p.confidence ?? 0) * 100).toFixed(1) + '%',
      p.risk ?? ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictions_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Statistiques de traitement */}
      {processingStats && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Statistiques de Traitement</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total" value={processingStats.total_samples ?? 0} />
            <StatCard label="Traités" value={processingStats.processed_samples ?? 0} />
            <StatCard label="Haut Risque" value={processingStats.high_risk_count ?? 0} color="red" />
            <StatCard label="Menace" value={processingStats.threat_level ?? 'Inconnu'} color="orange" />
          </div>
        </div>
      )}

      {/* Résumé des classifications */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Résumé des Classifications
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-sm text-gray-300 mt-1">{type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau des prédictions détaillées */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Détails des Prédictions
            {predictions.length >= 100 && (
              <span className="ml-2 text-sm text-yellow-300">(100 premiers résultats)</span>
            )}
          </h3>

          <div className="flex gap-2">
            {/* Filtre */}
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 text-white text-sm border border-white/20"
            >
              <option value="all">Tous</option>
              {Object.keys(summary).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* Tri */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 text-white text-sm border border-white/20"
            >
              <option value="id">ID</option>
              <option value="confidence">Confiance</option>
              <option value="risk">Risque</option>
            </select>

            {/* Export */}
            <button 
              onClick={exportToCSV}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">ID</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Flow ID</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Prédiction</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Confiance</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Niveau de Risque</th>
              </tr>
            </thead>
            <tbody>
              {sortedPredictions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-300">
                    Aucune prédiction à afficher
                  </td>
                </tr>
              ) : (
                sortedPredictions.slice(0, 100).map((result, idx) => (
                  <tr 
                    key={result.id ?? idx} 
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-mono">{result.id ?? idx + 1}</td>
                    <td className="py-3 px-4 text-white font-mono text-xs">
                      {(result.flow_id ?? result.flow ?? '-').substring(0, 20)}
                      {(result.flow_id ?? result.flow ?? '').length > 20 ? '...' : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                        {result.prediction}
                      </span>
                    </td>
                    <td className={`py-3 px-4 font-semibold ${getConfidenceColorClass(result.confidence)}`}>
                      {typeof result.confidence === 'number' 
                        ? `${(result.confidence * 100).toFixed(1)}%` 
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRiskColorClass(result.risk)}`}>
                        {result.risk ?? '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-400 text-center">
          Affichage de {sortedPredictions.length} résultat(s) sur {predictions.length}
        </div>
      </div>
    </div>
  );
}

// Composant pour les cartes de statistiques
function StatCard({ label, value, color = 'white' }) {
  const colors = {
    white: 'text-white',
    red: 'text-red-400',
    orange: 'text-orange-400',
    green: 'text-green-400',
    blue: 'text-blue-400'
  };

  return (
    <div className="text-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value ?? '-'}</p>
      <p className="text-sm text-gray-300 mt-1">{label}</p>
    </div>
  );
}

// Helpers pour les couleurs
function getConfidenceColorClass(conf) {
  if (conf === null || conf === undefined) return 'text-gray-300';
  const c = Number(conf);
  if (isNaN(c)) return 'text-gray-300';
  if (c >= 0.9) return 'text-green-400';
  if (c >= 0.7) return 'text-yellow-400';
  return 'text-red-400';
}

function getRiskColorClass(risk) {
  if (!risk) return 'text-gray-400 bg-gray-600/20';
  const r = String(risk).toLowerCase();
  if (r.includes('high') || r.includes('élev') || r.includes('haut')) 
    return 'text-red-300 bg-red-600/20';
  if (r.includes('med') || r.includes('mod')) 
    return 'text-yellow-300 bg-yellow-600/20';
  if (r.includes('low') || r.includes('faible')) 
    return 'text-green-300 bg-green-600/20';
  return 'text-gray-400 bg-gray-600/20';
}