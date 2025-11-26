// components/Header.jsx
import React from 'react';
import { Shield, Wifi, CheckCircle, XCircle } from 'lucide-react';

export default function Header({ backendStatus, socketConnected }) {
  const getStatusIcon = () => {
    if (backendStatus === 'online') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (backendStatus === 'offline') return <XCircle className="w-4 h-4 text-red-400" />;
    return <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"/>;
  };

  const getStatusText = () => {
    if (backendStatus === 'online') return 'Backend connecté';
    if (backendStatus === 'offline') return 'Backend déconnecté';
    return 'Vérification...';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg"><Shield className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Traffic Classifier</h1>
            <p className="text-blue-200">IA pour l'analyse de trafic réseau</p>
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
  );
}
