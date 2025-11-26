// components/UploadPanel.jsx
import React, { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export default function UploadPanel({ backendStatus, onFileUpload, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) onFileUpload(file);
    else alert('Veuillez sélectionner un fichier CSV');
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center"><Upload className="w-5 h-5 mr-2" /> Analyse par Fichier</h2>
      <div
        onDrop={backendStatus === 'online' ? handleDrop : undefined}
        onDragOver={(e)=>{ e.preventDefault(); if(backendStatus==='online') setDragOver(true); }}
        onDragLeave={()=>setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${dragOver ? 'border-blue-400 bg-blue-400/10' : 'border-gray-400'}`}
      >
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-white">Analyse en cours...</p>
          </div>
        ) : (
          <>
            <FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <p className="text-white mb-2">Glissez votre fichier CSV ici</p>
            <p className="text-gray-300 text-sm mb-4">ou</p>
            <label className={`inline-flex items-center px-4 py-2 rounded-lg ${backendStatus === 'online' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
              <Upload className="w-4 h-4 mr-2" /> Sélectionner un fichier
              <input type="file" accept=".csv" className="hidden" onChange={(e)=>onFileUpload(e.target.files?.[0])} disabled={backendStatus!=='online'} />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
