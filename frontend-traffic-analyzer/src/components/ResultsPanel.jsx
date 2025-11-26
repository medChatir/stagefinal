// ResultsPanel.jsx
import React from 'react';
import { Eye, BarChart3 } from 'lucide-react';
import StatsCards from './StatsCards';
import { formatBytes, formatNumber } from '../utils/formatters';

export default function ResultsPanel({ results = {}, stats = {}, realTimeStats = {} }) {
  const predictions = results.predictions ?? [];
  const summary = results.summary ?? {};
  const processingStats = results.stats ?? null;

  return (
    <div className="space-y-6">
      {/* Global stats cards (uses StatsCards component) */}
      <StatsCards stats={stats} realTimeStats={realTimeStats} />

      {/* Processing Stats (from results) */}
      {processingStats && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Statistiques de Traitement</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SmallStat label="Total" value={processingStats.total_samples} />
            <SmallStat label="Traités" value={processingStats.processed_samples} />
            <SmallStat label="Haut Risque" value={processingStats.high_risk_count} />
            <SmallStat label="Menace" value={processingStats.threat_level} />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Résumé des Classifications
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-sm text-gray-300">{type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Predictions */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Détails des Prédictions
          {predictions.length >= 100 && <span className="ml-2 text-sm text-yellow-300">(100 premiers résultats)</span>}
        </h3>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/10">
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-gray-300">ID</th>
                <th className="text-left py-3 px-4 text-gray-300">Flow ID</th>
                <th className="text-left py-3 px-4 text-gray-300">Prédiction</th>
                <th className="text-left py-3 px-4 text-gray-300">Confiance</th>
                <th className="text-left py-3 px-4 text-gray-300">Niveau de Risque</th>
              </tr>
            </thead>
            <tbody>
              {predictions.slice(0, 100).map((result, idx) => (
                <tr key={result.id ?? idx} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4 text-white">{result.id ?? idx + 1}</td>
                  <td className="py-3 px-4 text-white font-mono text-xs">{result.flow ?? result.flow_id}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                      {result.prediction}
                    </span>
                  </td>
                  <td className={`py-3 px-4 font-semibold ${getConfidenceColorClass(result.confidence)}`}>
                    {typeof result.confidence === 'number' ? `${(result.confidence * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColorClass(result.risk)}`}>
                      {result.risk ?? '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {predictions.length === 0 && (
            <div className="p-6 text-center text-gray-300">Aucune prédiction à afficher.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small helpers ---------- */

function SmallStat({ label, value }) {
  return (
    <div className="text-center p-4 bg-white/5 rounded-lg">
      <p className="text-2xl font-bold text-white">{value ?? '-'}</p>
      <p className="text-sm text-gray-300">{label}</p>
    </div>
  );
}

function getConfidenceColorClass(conf) {
  if (conf === null || conf === undefined) return 'text-gray-300';
  const c = Number(conf);
  if (isNaN(c)) return 'text-gray-300';
  if (c >= 0.9) return 'text-green-600';
  if (c >= 0.7) return 'text-yellow-600';
  return 'text-red-600';
}

function getRiskColorClass(risk) {
  if (!risk) return 'text-gray-600 bg-gray-50';
  const r = String(risk).toLowerCase();
  if (r.includes('high') || r.includes('élev') || r.includes('haut')) return 'text-red-600 bg-red-50';
  if (r.includes('med') || r.includes('mod')) return 'text-yellow-600 bg-yellow-50';
  if (r.includes('low') || r.includes('faible')) return 'text-green-600 bg-green-50';
  return 'text-gray-600 bg-gray-50';
}
