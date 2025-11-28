// components/UploadPanel.jsx - Version corrigée
import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle } from 'lucide-react';

export default function UploadPanel({ backendStatus, onFileUpload, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    console.log('📎 Fichier déposé:', file?.name);
    
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(file);
      onFileUpload(file);
    } else {
      alert('⚠️ Veuillez sélectionner un fichier CSV');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    console.log('📎 Fichier sélectionné:', file?.name);
    
    if (file) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        setSelectedFile(file);
        onFileUpload(file);
      } else {
        alert('⚠️ Veuillez sélectionner un fichier CSV');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (backendStatus === 'online' && !loading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleButtonClick = () => {
    if (backendStatus === 'online' && !loading) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
        <Upload className="w-5 h-5 mr-2" /> 
        Analyse par Fichier
      </h2>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          dragOver 
            ? 'border-blue-400 bg-blue-400/10 scale-105' 
            : 'border-gray-400 bg-transparent'
        } ${
          backendStatus !== 'online' || loading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-white font-semibold">Analyse en cours...</p>
            <p className="text-gray-300 text-sm mt-2">Veuillez patienter</p>
          </div>
        ) : selectedFile && !loading ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
            <p className="text-white font-semibold mb-2">{selectedFile.name}</p>
            <p className="text-gray-300 text-sm mb-4">{formatFileSize(selectedFile.size)}</p>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm text-blue-300 underline hover:text-blue-200"
            >
              Sélectionner un autre fichier
            </button>
          </div>
        ) : (
          <>
            <FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <p className="text-white mb-2 font-semibold">Glissez votre fichier CSV ici</p>
            <p className="text-gray-300 text-sm mb-4">ou</p>
            
            <button
              onClick={handleButtonClick}
              disabled={backendStatus !== 'online'}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all ${
                backendStatus === 'online' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" /> 
              Sélectionner un fichier
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileSelect}
              disabled={backendStatus !== 'online'}
            />

            <p className="text-xs text-gray-400 mt-4">
              Formats acceptés: CSV uniquement
            </p>
          </>
        )}
      </div>

      {/* Status du backend */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Status: <span className={backendStatus === 'online' ? 'text-green-400' : 'text-red-400'}>
            {backendStatus === 'online' ? '✅ Prêt' : '❌ Déconnecté'}
          </span>
        </p>
      </div>
    </div>
  );
}