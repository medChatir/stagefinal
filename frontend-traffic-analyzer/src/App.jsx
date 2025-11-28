// App.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import RealtimeTable from './components/RealtimeTable';
import ResultsPanel from './components/ResultsPanel';
import useBackendStatus from './hooks/useBackendStatus';
import useSocket from './hooks/useSocket';
import { postPredict, startRealTime, stopRealTime } from './api/api';

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
      console.log('📊 Nouvelle prédiction temps réel:', data);
      setPredictions(prev => [...prev.slice(-99), data.prediction]);
    });
    const unsub2 = on('network_packet', (data) => {
      console.log('📦 Paquet réseau reçu:', data);
    });
    return () => { 
      unsub1(); 
      unsub2(); 
    };
  }, [on]);

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) {
      setError('Aucun fichier sélectionné');
      return;
    }

    console.log('📤 Upload du fichier:', selectedFile.name);
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      console.log('📡 Envoi de la requête de prédiction...');
      const json = await postPredict(fd);
      console.log('✅ Résultats reçus:', json);
      setResults(json);
    } catch (err) {
      console.error('❌ Erreur upload:', err);
      setError(err.message || 'Erreur lors de l\'analyse du fichier');
    } finally {
      setLoading(false);
    }
  };

  const toggleRealTime = async () => {
    console.log('🔄 Toggle real-time:', realTimeActive ? 'STOP' : 'START');
    
    try {
      if (realTimeActive) {
        console.log('⏹️ Arrêt du mode temps réel...');
        const res = await stopRealTime();
        console.log('✅ Réponse stop:', res);
        if (res.status === 'stopped' || res.status === 'not_running') {
          setRealTimeActive(false);
          setPredictions([]);
        }
      } else {
        console.log('▶️ Démarrage du mode temps réel...');
        const res = await startRealTime();
        console.log('✅ Réponse start:', res);
        if (res.status === 'started' || res.status === 'already_running') {
          setRealTimeActive(true);
          setPredictions([]);
        }
      }
    } catch (err) {
      console.error('❌ Erreur real-time:', err);
      setError('Erreur lors du basculement du mode temps réel: ' + err.message);
    }
  };

  const clearResults = () => {
    console.log('🗑️ Effacement des résultats');
    setResults(null);
    setFile(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <Header backendStatus={backendStatus} socketConnected={socketConnected} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Afficher les erreurs */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-200">❌ {error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-300 underline hover:text-red-100"
            >
              Fermer
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panneau d'upload */}
          <div className="lg:col-span-1">
            <UploadPanel 
              backendStatus={backendStatus} 
              onFileUpload={handleUpload} 
              loading={loading} 
            />

            {/* Bouton mode temps réel */}
            <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Mode Temps Réel</h3>
              <button 
                onClick={toggleRealTime}
                disabled={backendStatus !== 'online'}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  realTimeActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {realTimeActive ? '⏹️ Arrêter' : '▶️ Démarrer'} le mode temps réel
              </button>
              <p className="text-xs text-gray-300 mt-2 text-center">
                {realTimeActive 
                  ? `📊 ${predictions.length} prédictions reçues` 
                  : 'Cliquez pour capturer le trafic en direct'}
              </p>
            </div>

            {/* Bouton effacer les résultats */}
            {results && (
              <div className="mt-4">
                <button 
                  onClick={clearResults}
                  className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                >
                  🗑️ Effacer les résultats
                </button>
              </div>
            )}
          </div>

          {/* Panneau des résultats */}
          <div className="lg:col-span-2">
            {results ? (
              <ResultsPanel results={results} />
            ) : predictions.length > 0 ? (
              <RealtimeTable 
                predictions={predictions} 
                autoScroll={autoScroll} 
                setAutoScroll={setAutoScroll} 
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
                <p className="text-gray-300 text-lg mb-4">
                  {realTimeActive 
                    ? '⏳ En attente de données temps réel...' 
                    : '📤 Téléchargez un fichier CSV ou démarrez le mode temps réel'}
                </p>
                <p className="text-gray-400 text-sm">
                  Backend: <span className={backendStatus === 'online' ? 'text-green-400' : 'text-red-400'}>
                    {backendStatus === 'online' ? '✅ Connecté' : '❌ Déconnecté'}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}