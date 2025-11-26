// App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import RealtimeTable from './components/RealtimeTable';
import ResultsPanel from './components/ResultsPanel'; // implémente pareil que UploadPanel
import useBackendStatus from './hooks/useBackendStatus';
import useSocket from './hooks/useSocket';
import { postPredict, startRealTime, stopRealTime } from './Api/api';

export default function App() {
  const { status: backendStatus, meta } = useBackendStatus(30000);
  const { connected: socketConnected, on } = useSocket(backendStatus === 'online');

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // real-time
  const [realTimeActive, setRealTimeActive] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!on) return;
    const unsub1 = on('real_time_prediction', (data) => {
      setPredictions(prev => [...prev.slice(-99), data.prediction]);
    });
    const unsub2 = on('network_packet', (data) => {
      // gérer si tu veux
    });
    return () => { unsub1(); unsub2(); };
  }, [on]);

  const handleUpload = async (file) => {
    setFile(file);
    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const json = await postPredict(fd);
      setResults(json);
    } catch (err) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const toggleRealTime = async () => {
    try {
      if (realTimeActive) {
        const res = await stopRealTime();
        if (res.status === 'stopped') {
          setRealTimeActive(false);
          setPredictions([]);
        }
      } else {
        const res = await startRealTime();
        if (res.status === 'started') {
          setRealTimeActive(true);
          setPredictions([]);
        }
      }
    } catch (err) {
      setError('Erreur real-time');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <Header backendStatus={backendStatus} socketConnected={socketConnected} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <UploadPanel backendStatus={backendStatus} onFileUpload={handleUpload} loading={loading} />
          </div>

          <div className="lg:col-span-2">
            {results ? <ResultsPanel results={results} /> : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
                <p className="text-gray-300">Téléchargez un fichier CSV pour lancer l'analyse.</p>
                <div className="mt-4">
                  <button onClick={toggleRealTime} className="bg-green-600 px-4 py-2 rounded-lg text-white">
                    {realTimeActive ? 'Arrêter' : 'Démarrer'} temps réel
                  </button>
                </div>
                {predictions.length > 0 && <RealtimeTable predictions={predictions} autoScroll={autoScroll} setAutoScroll={setAutoScroll} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
