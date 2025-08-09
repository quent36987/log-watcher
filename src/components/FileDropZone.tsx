import React, { useCallback, useState } from 'react';
import { Upload, File, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { FileHandler } from '../utils/fileHandler';

interface FileDropZoneProps {
  onFileLoad?: (content: string, fileName: string) => void;               // support legacy (single)
  onFilesLoad?: (files: { content: string; fileName: string }[]) => void; // nouveau (multiple)
  loading: boolean;
  multiple?: boolean; // <- nouveau
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
                                                            onFileLoad,
                                                            onFilesLoad,
                                                            loading,
                                                            multiple = false
                                                          }) => {
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

  // lit/valide un fichier et renvoie {content, fileName}
  const processOneFile = async (file: File): Promise<{ content: string; fileName: string }> => {
    setError(null);
    setSuccess(null);
    setProgress(`Validation du fichier "${file.name}"...`);

    if (!FileHandler.validateLogFile(file)) {
      const errorMsg = `Format non supporté pour "${file.name}". Utilisez .log, .gz ou .txt (max 100MB)`;
      throw new Error(errorMsg);
    }

    setProgress(`Lecture de "${file.name}"...`);
    const content = await FileHandler.readFile(file);

    if (!content || content.trim().length === 0) {
      throw new Error(`Le fichier "${file.name}" est vide`);
    }

    return { content, fileName: file.name };
  };

  // traite N fichiers séquentiellement (progress clair)
  const processFiles = async (files: File[]) => {
    setError(null);
    setSuccess(null);

    const results: { content: string; fileName: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        setProgress(`(${i + 1}/${files.length}) Traitement de "${f.name}"...`);
        const res = await processOneFile(f);
        results.push(res);
      } catch (err) {
        console.error('❌ Erreur sur', f.name, err);
        // On stoppe tout au premier échec (comportement conservateur). Si tu veux “best-effort”, enlève le return.
        setProgress('');
        setError(err instanceof Error ? err.message : `Erreur sur "${f.name}"`);
        return;
      }
    }

    setProgress('');
    if (multiple && onFilesLoad) {
      setSuccess(`${results.length} fichier(s) chargé(s) avec succès !`);
      // petit délai visuel
      setTimeout(() => {
        onFilesLoad(results);
        setSuccess(null);
      }, 600);
    } else if (!multiple && onFileLoad && results[0]) {
      setSuccess(`Fichier "${results[0].fileName}" chargé avec succès !`);
      setTimeout(() => {
        onFileLoad(results[0].content, results[0].fileName);
        setSuccess(null);
      }, 600);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      setError('Aucun fichier sélectionné');
      return;
    }

    if (!multiple && files.length > 1) {
      setError('Veuillez sélectionner un seul fichier à la fois');
      return;
    }

    await processFiles(multiple ? files : [files[0]]);
  }, [multiple, onFileLoad, onFilesLoad]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (!multiple && files.length > 1) {
      setError('Veuillez sélectionner un seul fichier à la fois');
      e.target.value = '';
      return;
    }

    await processFiles(multiple ? files : [files[0]]);
    e.target.value = '';
  }, [multiple, onFileLoad, onFilesLoad]);

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
              multiple={multiple} // <- clé pour multi sélection
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
                    success ? 'Fichier(s) chargé(s) !' :
                        multiple ? 'Glissez-déposez vos fichiers de logs' : 'Glissez-déposez votre fichier de logs'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {multiple ? 'ou cliquez pour sélectionner plusieurs fichiers' : 'ou cliquez pour sélectionner un fichier'}
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
              Taille maximum: 100MB par fichier
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
