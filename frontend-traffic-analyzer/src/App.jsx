<<<<<<< HEAD
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
=======
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Upload, FileText, Brain, Shield, Network, Activity, Eye, 
  TrendingUp, AlertTriangle, CheckCircle, XCircle, Play, 
  Pause, Wifi,  BarChart3 
} from 'lucide-react';

const App = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [stats, setStats] = useState({
    totalPredictions: 0,
    accuracy: 0,
    threatLevel: 'Inconnu'
  });

  // États temps réel
  const [realTimeActive, setRealTimeActive] = useState(false);
  const [realTimePredictions, setRealTimePredictions] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState({
    total_processed: 0,
    current_threat_level: 'Faible',
    high_risk_count: 0,
    classifications_per_minute: 0,
    flows_analyzed: 0,
    bytes_analyzed: 0,
    active_connections: 0
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [networkCaptureActive, setNetworkCaptureActive] = useState(false);
  const [networkPackets, setNetworkPackets] = useState([]);
  
  const realTimeTableRef = useRef(null);
  const networkTableRef = useRef(null);
  const socketRef = useRef(null);

  // Vérification du statut du backend
  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  // Connexion WebSocket
  useEffect(() => {
    if (backendStatus === 'online') {
      connectWebSocket();
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocketConnected(false);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [backendStatus]);

  // Auto-scroll pour les prédictions temps réel
  useEffect(() => {
    if (autoScroll && realTimeTableRef.current && realTimePredictions.length > 0) {
      realTimeTableRef.current.scrollTop = realTimeTableRef.current.scrollHeight;
    }
  }, [realTimePredictions, autoScroll]);

  // Auto-scroll pour les paquets réseau
  useEffect(() => {
    if (networkTableRef.current && networkPackets.length > 0) {
      networkTableRef.current.scrollTop = networkTableRef.current.scrollHeight;
    }
  }, [networkPackets]);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/health');
      const data = await response.json();
      
      if (data.status === "OK") {
        setBackendStatus('online');
        
        // Mettre à jour les statistiques globales
        setStats(prev => ({
          ...prev,
          accuracy: data.model_loaded ? 94.2 : 0
        }));
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      console.error('Erreur de connexion au backend:', error);
      setBackendStatus('offline');
    }
  };

  const connectWebSocket = () => {
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connecté au serveur WebSocket');
      setSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Déconnecté du serveur WebSocket');
      setSocketConnected(false);
    });

    socketRef.current.on('connection_status', (data) => {
      console.log('Statut de connexion:', data);
    });

    socketRef.current.on('real_time_prediction', (data) => {
      setRealTimePredictions(prev => [...prev.slice(-99), data.prediction]);
      setRealTimeStats(data.stats);
      
      // Mettre à jour les statistiques globales
      setStats(prev => ({
        ...prev,
        totalPredictions: data.stats.total_processed,
        threatLevel: data.stats.current_threat_level
      }));
    });

    socketRef.current.on('network_packet', (data) => {
      setNetworkPackets(prev => [...prev.slice(-99), data]);
    });

    socketRef.current.on('error', (error) => {
      console.error('Erreur WebSocket:', error);
      setError('Erreur de connexion temps réel');
    });
  };

  const toggleRealTime = () => {
    if (realTimeActive) {
      // Arrêter l'analyse temps réel
      fetch('http://localhost:5000/real-time/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'stopped') {
          setRealTimeActive(false);
          setRealTimeStats({
            total_processed: 0,
            current_threat_level: 'Faible',
            high_risk_count: 0,
            classifications_per_minute: 0,
            flows_analyzed: 0,
            bytes_analyzed: 0,
            active_connections: 0
          });
        }
      })
      .catch(error => {
        console.error('Erreur lors de l\'arrêt de l\'analyse temps réel:', error);
        setError('Erreur lors de l\'arrêt de l\'analyse temps réel');
      });
    } else {
      // Démarrer l'analyse temps réel
      fetch('http://localhost:5000/real-time/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'started') {
          setRealTimeActive(true);
          setRealTimePredictions([]);
        }
      })
      .catch(error => {
        console.error('Erreur lors du démarrage de l\'analyse temps réel:', error);
        setError('Erreur lors du démarrage de l\'analyse temps réel');
      });
    }
  };

  const getRealTimeStats = () => {
    fetch('http://localhost:5000/real-time/stats')
      .then(response => response.json())
      .then(data => {
        setRealTimeStats(data.stats);
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des statistiques:', error);
      });
  };

  const clearRealTimeData = () => {
    setRealTimePredictions([]);
  };

  const clearNetworkData = () => {
    setNetworkPackets([]);
  };

  const handleFileUpload = (uploadedFile) => {
    setFile(uploadedFile);
>>>>>>> 4740a354d6cf4a943b30b285e72bbb62729cee03
    setLoading(true);
    setError(null);
    setResults(null);

<<<<<<< HEAD
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
=======
    const formData = new FormData();
    formData.append('file', uploadedFile);

    fetch('http://localhost:5000/predict', {
      method: 'POST',
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse du fichier');
      }
      return response.json();
    })
    .then(data => {
      setResults(data);
      setStats(prev => ({
        totalPredictions: prev.totalPredictions + (data.stats?.total_samples || 0),
        accuracy: prev.accuracy,
        threatLevel: data.stats?.threat_level || prev.threatLevel
      }));
      setLoading(false);
    })
    .catch(error => {
      console.error('Erreur:', error);
      setError(error.message || 'Erreur lors de l\'analyse du fichier');
      setLoading(false);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileUpload(droppedFile);
    } else {
      setError('Veuillez sélectionner un fichier CSV valide.');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const getRiskColor = (risk) => {
    switch(risk?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    switch(backendStatus) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />;
    }
  };

  const getStatusText = () => {
    switch(backendStatus) {
      case 'online': return 'Backend connecté';
      case 'offline': return 'Backend déconnecté';
      default: return 'Vérification...';
    }
  };

  const getThreatLevelColor = (level) => {
    switch(level?.toLowerCase()) {
      case 'élevé': return 'text-red-400';
      case 'modéré': return 'text-yellow-400';
      case 'faible': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
>>>>>>> 4740a354d6cf4a943b30b285e72bbb62729cee03
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
<<<<<<< HEAD
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
=======
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Traffic Classifier</h1>
                <p className="text-blue-200">Intelligence Artificielle pour l'Analyse de Trafic Réseau</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-gray-300">{getStatusText()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className={`w-4 h-4 ${socketConnected ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-gray-300">WebSocket</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Prédictions</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.totalPredictions)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Précision du Modèle</p>
                <p className="text-2xl font-bold text-white">{stats.accuracy}%</p>
              </div>
              <Brain className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">Niveau de Menace</p>
                <p className={`text-2xl font-bold ${getThreatLevelColor(stats.threatLevel)}`}>
                  {stats.threatLevel}
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
                  {realTimeStats.classifications_per_minute || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Contrôles Temps Réel */}
        <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Wifi className="w-5 h-5 mr-2" />
              Classification Temps Réel
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${realTimeActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-gray-300 text-sm">
                  {realTimeActive ? 'En cours' : 'Arrêté'}
                </span>
              </div>
              <button
                onClick={toggleRealTime}
                disabled={backendStatus !== 'online'}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  realTimeActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } ${backendStatus !== 'online' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {realTimeActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {realTimeActive ? 'Arrêter' : 'Démarrer'}
              </button>
              {realTimePredictions.length > 0 && (
                <button
                  onClick={clearRealTimeData}
                  className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {realTimeActive && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{realTimeStats.total_processed}</p>
                <p className="text-xs text-gray-300">Traités</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{realTimeStats.high_risk_count}</p>
                <p className="text-xs text-gray-300">Haut Risque</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className={`text-lg font-bold ${getThreatLevelColor(realTimeStats.current_threat_level)}`}>
                  {realTimeStats.current_threat_level}
                </p>
                <p className="text-xs text-gray-300">Menace Actuelle</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-white">{realTimeStats.classifications_per_minute}</p>
                <p className="text-xs text-gray-300">Class./min</p>
              </div>
            </div>
          )}

          {realTimePredictions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Flux en Temps Réel</h3>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">Auto-scroll</span>
                </label>
              </div>
              <div 
                ref={realTimeTableRef}
                className="max-h-64 overflow-y-auto bg-white/5 rounded-lg"
              >
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
                    {realTimePredictions.map((prediction, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 px-3 text-gray-300 text-xs">
                          {new Date(prediction.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3 text-white font-mono text-xs">
                          {prediction.flow_id}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                            {prediction.prediction}
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-sm font-semibold ${getConfidenceColor(prediction.confidence)}`}>
                          {(prediction.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(prediction.risk)}`}>
                            {prediction.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-200">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-300 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
>>>>>>> 4740a354d6cf4a943b30b285e72bbb62729cee03
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
<<<<<<< HEAD
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
=======
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Analyse par Fichier
              </h2>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-400/10' 
                    : backendStatus === 'online'
                    ? 'border-gray-400 hover:border-blue-400'
                    : 'border-gray-600 cursor-not-allowed opacity-50'
                }`}
                onDrop={backendStatus === 'online' ? handleDrop : undefined}
                onDragOver={(e) => { 
                  e.preventDefault(); 
                  if (backendStatus === 'online') setDragOver(true); 
                }}
                onDragLeave={() => setDragOver(false)}
              >
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
                    <p className="text-white">Analyse en cours...</p>
                    <p className="text-gray-300 text-sm mt-2">Cela peut prendre quelques secondes</p>
                  </div>
                ) : (
                  <div>
                    <FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-white mb-2">Glissez votre fichier CSV ici</p>
                    <p className="text-gray-300 text-sm mb-4">ou</p>
                    <label className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                      backendStatus === 'online'
                        ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                        : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}>
                      <Upload className="w-4 h-4 mr-2" />
                      Sélectionner un fichier
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileSelect}
                        disabled={backendStatus !== 'online'}
                      />
                    </label>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                  <p className="text-white text-sm">
                    <strong>Fichier sélectionné:</strong> {file.name}
                  </p>
                  <p className="text-gray-300 text-xs mt-1">
                    Taille: {formatBytes(file.size)}
                  </p>
                </div>
              )}

              {backendStatus !== 'online' && (
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>Note:</strong> Assurez-vous que le serveur Flask est en cours d'exécution sur le port 5000.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {results ? (
              <div className="space-y-6">
                {/* Processing Stats */}
                {results.stats && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Statistiques de Traitement</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <p className="text-2xl font-bold text-white">{results.stats.total_samples}</p>
                        <p className="text-sm text-gray-300">Total</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <p className="text-2xl font-bold text-white">{results.stats.processed_samples}</p>
                        <p className="text-sm text-gray-300">Traités</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <p className="text-2xl font-bold text-white">{results.stats.high_risk_count}</p>
                        <p className="text-sm text-gray-300">Haut Risque</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <p className="text-2xl font-bold text-white">{results.stats.threat_level}</p>
                        <p className="text-sm text-gray-300">Menace</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                {results.summary && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Résumé des Classifications
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(results.summary).map(([type, count]) => (
                        <div key={type} className="text-center p-4 bg-white/5 rounded-lg">
                          <p className="text-2xl font-bold text-white">{count}</p>
                          <p className="text-sm text-gray-300">{type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Results */}
                {results.predictions && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      Détails des Prédictions
                      {results.predictions.length >= 100 && (
                        <span className="ml-2 text-sm text-yellow-300">(100 premiers résultats)</span>
                      )}
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
                          {results.predictions.map((result) => (
                            <tr key={result.id} className="border-b border-white/10 hover:bg-white/5">
                              <td className="py-3 px-4 text-white">{result.id}</td>
                              <td className="py-3 px-4 text-white font-mono text-xs">{result.flow}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                                  {result.prediction}
                                </span>
                              </td>
                              <td className={`py-3 px-4 font-semibold ${getConfidenceColor(result.confidence)}`}>
                                {(result.confidence * 100).toFixed(1)}%
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(result.risk)}`}>
                                  {result.risk}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
                <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Système d'Analyse Prêt</h3>
                <p className="text-gray-300 mb-4">
                  Téléchargez un fichier CSV contenant des données de traffic réseau pour commencer l'analyse.
                </p>
                {backendStatus === 'online' && socketConnected && (
                  <div className="space-y-2">
                    <p className="text-green-300 text-sm">✓ Backend connecté et modèle chargé</p>
                    <p className="text-green-300 text-sm">✓ WebSocket connecté pour temps réel</p>
                  </div>
                )}
                {backendStatus === 'online' && !socketConnected && (
                  <p className="text-yellow-300 text-sm">⚠ Backend connecté mais WebSocket indisponible</p>
                )}
>>>>>>> 4740a354d6cf4a943b30b285e72bbb62729cee03
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
};

export default App;
>>>>>>> 4740a354d6cf4a943b30b285e72bbb62729cee03
