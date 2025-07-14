import React, { useCallback, useState } from 'react';
import { Upload, File, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { FileHandler } from '../utils/fileHandler';

interface FileDropZoneProps {
  onFileLoad: (content: string, fileName: string) => void;
  loading: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileLoad, loading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    console.log('🚀 Début du traitement du fichier:', file.name);
    setError(null);
    setSuccess(null);
    setProgress('Validation du fichier...');
    
    if (!FileHandler.validateLogFile(file)) {
      const errorMsg = 'Format de fichier non supporté. Utilisez .log, .gz ou .txt (max 100MB)';
      setError(errorMsg);
      setProgress('');
      console.error('❌', errorMsg);
      return;
    }

    try {
      setProgress('Lecture du fichier...');
      const content = await FileHandler.readFile(file);
      
      setProgress('Traitement des données...');
      console.log('📊 Contenu lu, longueur:', content.length);
      
      if (!content || content.trim().length === 0) {
        throw new Error('Le fichier est vide');
      }

      setSuccess(`Fichier "${file.name}" chargé avec succès!`);
      setProgress('');
      
      // Petit délai pour montrer le succès
      setTimeout(() => {
        onFileLoad(content, file.name);
        setSuccess(null);
      }, 1000);
      
    } catch (err) {
      console.error('❌ Erreur lors du traitement:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier';
      setError(errorMsg);
      setProgress('');
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('📁 Fichiers déposés:', files.length);
    
    if (files.length === 0) {
      setError('Aucun fichier sélectionné');
      return;
    }

    if (files.length > 1) {
      setError('Veuillez sélectionner un seul fichier à la fois');
      return;
    }

    await processFile(files[0]);
  }, [onFileLoad]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📁 Fichier sélectionné:', file.name);
    await processFile(file);
    
    // Reset input
    e.target.value = '';
  }, [onFileLoad]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-gray-400'}
          ${loading ? 'opacity-50 pointer-events-none' : ''}
          ${success ? 'border-green-500 bg-green-50' : ''}
          ${error ? 'border-red-500 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".log,.gz,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={loading}
        />
        
        <div className="space-y-4">
          {loading || progress ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader className="animate-spin w-8 h-8 text-blue-500" />
              <div className="text-sm text-gray-600">{progress || 'Traitement en cours...'}</div>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="text-sm text-green-600">{success}</div>
            </div>
          ) : (
            <Upload className="mx-auto w-12 h-12 text-gray-400" />
          )}
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {loading ? 'Traitement du fichier...' : 
               success ? 'Fichier chargé!' :
               'Glissez-déposez votre fichier de logs'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              ou cliquez pour sélectionner un fichier
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <File className="w-4 h-4" />
              <span>.log</span>
            </div>
            <div className="flex items-center space-x-1">
              <File className="w-4 h-4" />
              <span>.gz</span>
            </div>
            <div className="flex items-center space-x-1">
              <File className="w-4 h-4" />
              <span>.txt</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            Taille maximum: 100MB
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};