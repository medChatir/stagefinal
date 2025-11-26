// components/RealtimeTable.jsx
import React, { useRef, useEffect } from 'react';
import { getConfidenceColor, getRiskColor } from '../utils/formatters'; // adapte si besoin

export default function RealtimeTable({ predictions, autoScroll, setAutoScroll }) {
  const ref = useRef(null);

  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [predictions, autoScroll]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Flux en Temps Réel</h3>
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={autoScroll} onChange={(e)=>setAutoScroll(e.target.checked)} />
          <span className="text-sm text-gray-300">Auto-scroll</span>
        </label>
      </div>
      <div ref={ref} className="max-h-64 overflow-y-auto bg-white/5 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white/10">
            <tr className="border-b border-white/20">
              <th className="text-left py-2 px-3 text-gray-300">Temps</th>
              <th className="text-left py-2 px-3 text-gray-300">Flow ID</th>
              <th className="text-left py-2 px-3 text-gray-300">Prédiction</th>
              <th className="text-left py-2 px-3 text-gray-300">Confiance</th>
              <th className="text-left py-2 px-3 text-gray-300">Risque</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 px-3 text-gray-300 text-xs">{new Date(p.timestamp).toLocaleTimeString()}</td>
                <td className="py-2 px-3 text-white font-mono text-xs">{p.flow_id}</td>
                <td className="py-2 px-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">{p.prediction}</span></td>
                <td className={`py-2 px-3 text-sm font-semibold ${getConfidenceColor(p.confidence)}`}>{(p.confidence*100).toFixed(1)}%</td>
                <td className="py-2 px-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(p.risk)}`}>{p.risk}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
