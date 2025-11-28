// components/Header.jsx - Version améliorée
import React from 'react';
import { Shield, Wifi, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Header({ backendStatus, socketConnected }) {
  const getStatusIcon = () => {
    if (backendStatus === 'online') 
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (backendStatus === 'offline') 
      return <XCircle className="w-4 h-4 text-red-400" />;
    return <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"/>;
  };

  const getStatusText = () => {
    if (backendStatus === 'online') return 'Backend connecté';
    if (backendStatus === 'offline') return 'Backend déconnecté';
    return 'Vérification...';
  };

  const getStatusBadgeColor = () => {
    if (backendStatus === 'online') return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (backendStatus === 'offline') return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Traffic Classifier</h1>
              <p className="text-blue-200 text-sm">Intelligence Artificielle pour la Cybersécurité</p>
            </div>
          </div>

          {/* Indicateurs de statut */}
          <div className="flex items-center space-x-3">
            {/* Backend Status */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusBadgeColor()}`}>
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>

            {/* WebSocket Status */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              socketConnected 
                ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
            }`}>
              <Wifi className={`w-4 h-4 ${socketConnected ? 'text-green-400' : 'text-gray-400'}`} />
              <span className="text-sm font-medium">
                {socketConnected ? 'Socket connecté' : 'Socket déconnecté'}
              </span>
            </div>
          </div>
        </div>

        {/* Message d'avertissement si déconnecté */}
        {backendStatus === 'offline' && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200 text-sm">
              Le backend n'est pas accessible. Vérifiez qu'il est démarré sur http://localhost:5000
            </p>
          </div>
        )}
      </div>
    </div>
  );
}