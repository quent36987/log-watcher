import React, { useState, useEffect } from 'react';
import { Folder, File, Download, Upload, RefreshCw, AlertCircle } from 'lucide-react';

interface LogFile {
  name: string;
  path: string;
  size: number;
  lastModified: string;
}

interface FileSelectorProps {
  onFileLoad: (content: string, fileName: string) => void;
  loading: boolean;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ onFileLoad, loading }) => {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/api';

  const loadFiles = async () => {
    setLoadingFiles(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/files`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setFiles(data.files || []);
    } catch (err) {
      console.error('Erreur lors du chargement des fichiers:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des fichiers');
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadFileContent = async () => {
    if (!selectedFile) return;
    
    setError(null);
    
    try {
      // Extraire juste le nom du fichier du chemin complet
      const fileName = selectedFile.split('/').pop() || selectedFile;
      const response = await fetch(`${API_BASE}/file/${encodeURIComponent(fileName)}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      onFileLoad(data.content, data.fileName);
    } catch (err) {
      console.error('Erreur lors du chargement du fichier:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du fichier');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Folder className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Fichiers de logs</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadFiles}
            disabled={loadingFiles}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un fichier ({files.length} fichier{files.length !== 1 ? 's' : ''} disponible{files.length !== 1 ? 's' : ''})
          </label>
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loadingFiles || files.length === 0}
          >
            <option value="">-- Choisir un fichier --</option>
            {files.map((file) => (
              <option key={file.path} value={file.name}>
                {file.name} ({formatFileSize(file.size)}) - {formatDate(file.lastModified)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadFileContent}
          disabled={!selectedFile || loading || loadingFiles}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{loading ? 'Chargement...' : 'Charger le fichier'}</span>
        </button>
      </div>

      {files.length === 0 && !loadingFiles && (
        <div className="text-center py-8 text-gray-500">
          <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun fichier de logs trouvé</p>
          <p className="text-sm">Vérifiez le chemin du dossier dans le serveur</p>
        </div>
      )}
    </div>
  );
};