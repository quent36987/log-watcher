import React, { useState, useEffect } from 'react';
import { Folder, File, Download, RefreshCw, AlertCircle } from 'lucide-react';

interface LogFile {
  name: string;
  path: string;
  size: number;
  lastModified: string;
}

interface FileSelectorProps {
  onFileLoad?: (content: string, fileName: string) => void; // mode single (legacy)
  onFilesLoad?: (files: { content: string; fileName: string }[]) => void; // mode multiple
  loading: boolean;
  multiple?: boolean; // <- nouveau
}

export const FileSelector: React.FC<FileSelectorProps> = ({ onFileLoad, onFilesLoad, loading, multiple = false }) => {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // <- gère 1 ou N fichiers
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/api';

  const loadFiles = async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/files`);
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.files || []);
    } catch (err) {
      console.error('Erreur lors du chargement des fichiers:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des fichiers');
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadSelectedFiles = async () => {
    if (selected.length === 0) return;
    setError(null);

    // Pour compat : si multiple=false, on ne charge que le premier
    const namesToLoad = multiple ? selected : [selected[0]];
    try {
      const results = await Promise.all(
          namesToLoad.map(async (name) => {
            const fileName = name.split('/').pop() || name;
            const res = await fetch(`${API_BASE}/file/${encodeURIComponent(fileName)}`);
            if (!res.ok) throw new Error(`Erreur ${res.status}: ${res.statusText}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return { content: data.content as string, fileName: data.fileName as string };
          })
      );

      // Callback adapté au mode
      if (multiple && onFilesLoad) {
        onFilesLoad(results);
      } else if (!multiple && onFileLoad && results[0]) {
        onFileLoad(results[0].content, results[0].fileName);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du/des fichier(s):', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du/des fichier(s)');
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions).map(o => o.value);
      setSelected(selectedOptions);
    } else {
      setSelected([e.target.value]);
    }
  };

  return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Folder className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {multiple ? 'Fichiers de logs (sélection multiple)' : 'Fichiers de logs'}
            </h3>
          </div>
          <button
              onClick={loadFiles}
              disabled={loadingFiles}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
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
              {multiple
                  ? `Sélectionner des fichiers (${files.length} dispo)`
                  : `Sélectionner un fichier (${files.length} dispo)`}
            </label>

            <select
                value={multiple ? undefined : (selected[0] ?? '')}
                onChange={handleSelectChange}
                multiple={multiple}
                size={multiple ? Math.min(Math.max(files.length, 4), 12) : 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingFiles || files.length === 0}
            >
              {!multiple && <option value="">-- Choisir un fichier --</option>}
              {files.map((file) => (
                  <option
                      key={file.path}
                      value={file.name}
                      selected={multiple ? selected.includes(file.name) : undefined}
                  >
                    {file.name} ({formatFileSize(file.size)}) - {formatDate(file.lastModified)}
                  </option>
              ))}
            </select>

            {multiple && (
                <p className="text-xs text-gray-500 mt-1">
                  Astuce : maintiens <kbd className="px-1 py-0.5 border rounded">Ctrl</kbd> (Windows/Linux) ou <kbd className="px-1 py-0.5 border rounded">⌘</kbd> (Mac) pour sélectionner plusieurs fichiers.
                </p>
            )}
          </div>

          <button
              onClick={loadSelectedFiles}
              disabled={selected.length === 0 || loading || loadingFiles}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>
            {loading
                ? 'Chargement...'
                : multiple
                    ? `Charger ${selected.length} fichier(s)`
                    : 'Charger le fichier'}
          </span>
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
