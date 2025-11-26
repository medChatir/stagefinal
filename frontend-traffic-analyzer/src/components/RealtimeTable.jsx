// src/components/RealtimeTable.jsx
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';

/**
 * RealtimeTable
 *
 * Props:
 * - predictions: Array of prediction objects (each should contain at least: flow_id, timestamp, prediction, confidence, risk)
 * - autoScroll: boolean
 * - setAutoScroll: fn(boolean)
 * - maxItems: number (optional, default 100)
 *
 * Notes:
 * - This component keeps a local copy of predictions to add an `isNew` flag for animation.
 * - Sorting, filtering and search are client-side.
 */

const DEFAULT_MAX = 100;

export default function RealtimeTable({
  predictions = [],
  autoScroll = true,
  setAutoScroll = () => {},
  maxItems = DEFAULT_MAX,
}) {
  const [localPreds, setLocalPreds] = useState([]);
  const [filterRisk, setFilterRisk] = useState('all'); // all | high | medium | low
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('time'); // time | confidence | risk
  const [sortDir, setSortDir] = useState('desc'); // asc | desc
  const containerRef = useRef(null);

  // helper: normalize key for a prediction (used to detect new ones)
  const predKey = (p, idx) => `${p.flow_id ?? p.flow ?? 'flow'}_${p.timestamp ?? ''}_${idx}`;

  // map risk string to numeric for sorting (higher = worse)
  const riskValue = (r) => {
    if (!r) return 0;
    const s = String(r).toLowerCase();
    if (s.includes('high') || s.includes('élev') || s.includes('haut')) return 3;
    if (s.includes('med') || s.includes('mod')) return 2;
    if (s.includes('low') || s.includes('faible')) return 1;
    return 0;
  };

  // safe date parse
  const safeDate = (ts) => {
    try {
      if (!ts) return null;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // confidence/risk color helpers (Tailwind classes)
  const getConfidenceColor = (conf) => {
    const c = Number(conf);
    if (isNaN(c)) return 'text-gray-300';
    if (c >= 0.9) return 'text-green-500';
    if (c >= 0.7) return 'text-yellow-400';
    return 'text-red-500';
  };

  const getRiskBadge = (risk) => {
    if (!risk) return 'text-gray-600 bg-gray-50';
    const r = String(r).toLowerCase();
    if (r.includes('high') || r.includes('élev') || r.includes('haut')) return 'text-red-600 bg-red-50';
    if (r.includes('med') || r.includes('mod')) return 'text-yellow-600 bg-yellow-50';
    if (r.includes('low') || r.includes('faible')) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  // When incoming predictions prop changes, merge into localPreds and mark new ones
  useEffect(() => {
    // Build a map of existing keys
    const existingKeys = new Set(localPreds.map((p) => p._key));
    // Create merged list where new items get isNew = true
    const incoming = predictions.map((p, idx) => {
      const key = predKey(p, idx);
      return { ...p, _key: key, _isNew: !existingKeys.has(key) };
    });

    // Merge keeping order of incoming (we want latest arrivals shown)
    // But to avoid duplicates across re-indexing, prefer unique by _key (last wins)
    const seen = new Map();
    [...incoming].forEach((p) => seen.set(p._key, p));
    // Keep the most recent `maxItems * 2` in memory to allow smoothing animations,
    // and then trim for display later.
    const merged = Array.from(seen.values());

    // Add isNew flag that will be cleared after a short timeout for animation
    setLocalPreds((prev) => {
      // We want new items to appear highlighted. Use merged (latest) as baseline.
      const mergedLimited = merged.slice(-Math.max(maxItems, 300)); // keep some buffer
      // For any item in mergedLimited that existed in prev, preserve _isNew if it was already false.
      const prevMap = new Map(prev.map((p) => [p._key, p]));
      return mergedLimited.map((p) => {
        // if it was seen before and previously not new, keep not new
        if (prevMap.has(p._key)) return { ...p, _isNew: prevMap.get(p._key)._isNew };
        return { ...p, _isNew: p._isNew ?? true };
      });
    });

    // Clear the _isNew flags after a short delay so CSS animation can run
    const clearTimeoutId = setTimeout(() => {
      setLocalPreds((prev) => prev.map((p) => ({ ...p, _isNew: false })));
    }, 1200);

    return () => clearTimeout(clearTimeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions]);

  // Auto-scroll when new content arrives and autoScroll is true
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [localPreds, autoScroll]);

  // Derived list: filter, search, sort, and limit to maxItems
  const displayed = (() => {
    let arr = [...localPreds];

    // filter by risk
    if (filterRisk !== 'all') {
      arr = arr.filter((p) => {
        const r = (p.risk ?? '').toString().toLowerCase();
        if (filterRisk === 'high') return r.includes('high') || r.includes('élev') || r.includes('haut');
        if (filterRisk === 'medium') return r.includes('med') || r.includes('mod');
        if (filterRisk === 'low') return r.includes('low') || r.includes('faible');
        return true;
      });
    }

    // search by flow id or prediction text
    const s = search.trim().toLowerCase();
    if (s.length > 0) {
      arr = arr.filter((p) => {
        const flow = (p.flow_id ?? p.flow ?? '').toString().toLowerCase();
        const pred = (p.prediction ?? '').toString().toLowerCase();
        return flow.includes(s) || pred.includes(s);
      });
    }

    // sorting
    arr.sort((a, b) => {
      if (sortBy === 'time') {
        const da = safeDate(a.timestamp)?.getTime() ?? 0;
        const db = safeDate(b.timestamp)?.getTime() ?? 0;
        return sortDir === 'asc' ? da - db : db - da;
      }
      if (sortBy === 'confidence') {
        const ca = Number(a.confidence) || 0;
        const cb = Number(b.confidence) || 0;
        return sortDir === 'asc' ? ca - cb : cb - ca;
      }
      if (sortBy === 'risk') {
        const ra = riskValue(a.risk);
        const rb = riskValue(b.risk);
        return sortDir === 'asc' ? ra - rb : rb - ra;
      }
      return 0;
    });

    // limit to maxItems (take the latest according to current sort)
    return arr.slice(0, Math.max(10, Math.min(maxItems, 1000)));
  })();

  // helpers to toggle sorting
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // quick refresh (force remove local history)
  const handleRefresh = () => {
    setLocalPreds([]);
  };

  return (
    <div className="bg-white/5 rounded-lg p-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-300 mr-2">Filtrer :</div>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-white/10 text-sm text-gray-200 rounded px-2 py-1"
          >
            <option value="all">Tous</option>
            <option value="high">Haut Risque</option>
            <option value="medium">Modéré</option>
            <option value="low">Faible</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex items-center w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher Flow ID ou prédiction..."
              className="pl-8 pr-2 py-1 rounded bg-white/8 text-sm text-gray-200 w-full md:w-64"
            />
            <button
              onClick={() => setSearch('')}
              className="ml-2 text-sm text-gray-300 px-2 py-1 rounded hover:bg-white/5"
              title="Effacer la recherche"
            >
              ×
            </button>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-sm rounded ${autoScroll ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'}`}
            title="Basculer auto-scroll"
          >
            {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          </button>

          <button
            onClick={handleRefresh}
            className="px-2 py-1 rounded bg-white/8 text-sm text-gray-200 hover:bg-white/10"
            title="Vider l'historique local"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div ref={containerRef} className="max-h-72 overflow-y-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white/6 backdrop-blur-sm">
            <tr className="text-left text-gray-300 text-xs">
              <th className="py-2 px-3">Temps
                <button onClick={() => toggleSort('time')} className="ml-2 align-middle">
                  {sortBy === 'time' ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />) : <ChevronDown className="w-3 h-3 inline opacity-30" />}
                </button>
              </th>
              <th className="py-2 px-3">Flow ID</th>
              <th className="py-2 px-3">Prédiction</th>
              <th className="py-2 px-3">Confiance
                <button onClick={() => toggleSort('confidence')} className="ml-2">
                  {sortBy === 'confidence' ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />) : <ChevronDown className="w-3 h-3 inline opacity-30" />}
                </button>
              </th>
              <th className="py-2 px-3">Risque
                <button onClick={() => toggleSort('risk')} className="ml-2">
                  {sortBy === 'risk' ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />) : <ChevronDown className="w-3 h-3 inline opacity-30" />}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">Aucune prédiction en mémoire.</td>
              </tr>
            )}

            {displayed.map((p, idx) => {
              const timeLabel = safeDate(p.timestamp) ? safeDate(p.timestamp).toLocaleTimeString() : '-';
              const key = p._key ?? `${p.flow_id ?? p.flow}_${p.timestamp ?? ''}_${idx}`;
              const rowClass = p._isNew ? 'bg-white/8 transform transition duration-500 ease-out scale-101' : '';
              return (
                <tr
                  key={key}
                  className={`border-b border-white/6 hover:bg-white/5 transition-colors duration-200 ${rowClass}`}
                  style={{
                    // small entrance animation via opacity/transform; isNew triggers it
                    transitionProperty: 'opacity, transform, background-color',
                    transitionDuration: p._isNew ? '450ms' : '250ms',
                    opacity: p._isNew ? 0.98 : 1,
                    transform: p._isNew ? 'translateY(-4px)' : 'none',
                  }}
                >
                  <td className="py-2 px-3 text-gray-300 text-xs">{timeLabel}</td>
                  <td className="py-2 px-3 text-white font-mono text-xs break-words max-w-[12rem]">{p.flow_id ?? p.flow ?? '-'}</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                      {p.prediction ?? '-'}
                    </span>
                  </td>
                  <td className={`py-2 px-3 font-semibold ${getConfidenceColor(p.confidence)}`}>
                    {typeof p.confidence === 'number' ? `${(Number(p.confidence) * 100).toFixed(1)}%` : (p.confidence ?? '-')}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadge(p.risk)}`}>
                      {p.risk ?? '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
        <div>Affichés: {displayed.length} / Reçus: {localPreds.length}</div>
        <div>Limite: {maxItems}</div>
      </div>
    </div>
  );
}
