import React, { useState, useMemo } from 'react';
import { FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { FileDropZone } from './components/FileDropZone';
import { FileSelector } from './components/FileSelector';
import { LogFilters } from './components/LogFilters';
import { LogTable } from './components/LogTable';
import { LogParser } from './utils/logParser';
import { LogEntry, LogFilter, LogStats } from './types';

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideAuthErrors, setHideAuthErrors] = useState(false);
  const [useFileSelector, setUseFileSelector] = useState(false);
  const [filter, setFilter] = useState<LogFilter>({
    search: '',
    level: '',
    dateFrom: '',
    dateTo: ''
  });

  const handleFileLoad = async (content: string, name: string) => {
    console.log('🎯 App: Début du traitement du fichier', name);
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 App: Parsing des logs...');
      const parsedLogs = LogParser.parseLogFile(content);
      console.log('✅ App: Logs parsés avec succès:', parsedLogs.length, 'entrées');
      
      setLogs(parsedLogs);
      setFileName(name);
      setHideAuthErrors(false);
      
      // Reset filters
      setFilter({
        search: '',
        level: '',
        dateFrom: '',
        dateTo: ''
      });
      
    } catch (error) {
      console.error('❌ App: Erreur lors du parsing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors du traitement du fichier';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    console.log('🔄 App: Reset de l\'application');
    setLogs([]);
    setFileName('');
    setError(null);
    setHideAuthErrors(false);
    setFilter({
      search: '',
      level: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleFilterAuthErrors = () => {
    setHideAuthErrors(!hideAuthErrors);
  };

  const filteredLogs = useMemo(() => {
    if (logs.length === 0) return [];
    
    let filtered = LogParser.filterLogs(logs, filter);
    
    // Filtrer les erreurs d'authentification si demandé
    if (hideAuthErrors) {
      filtered = filtered.filter(log => {
        const message = log.message.toLowerCase();
        return !message.includes('unauthorized error: full authentication is required to access this resource') &&
               !message.includes('handling exception: bad credentials');
      });
    }
    
    console.log('🔍 App: Logs filtrés:', filtered.length, '/', logs.length);
    return filtered;
  }, [logs, filter, hideAuthErrors]);

  const stats: LogStats = useMemo(() => {
    return LogParser.getLogStats(filteredLogs);
  }, [filteredLogs]);

  const allStats: LogStats = useMemo(() => {
    return LogParser.getLogStats(logs);
  }, [logs]);

  const authErrorsCount = useMemo(() => {
    return logs.filter(log => {
      const message = log.message.toLowerCase();
      return message.includes('unauthorized error: full authentication is required to access this resource') ||
             message.includes('handling exception: bad credentials');
    }).length;
  }, [logs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Analyseur de Logs
              </h1>
            </div>
            {logs.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {fileName} - {allStats.total} logs
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Nouveau fichier</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Erreur de traitement</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-sm underline mt-2"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Bienvenue dans l'Analyseur de Logs
              </h2>
              <p className="text-gray-600 max-w-md">
                Choisissez votre méthode de chargement de fichiers de logs.
              </p>
            </div>
            
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setUseFileSelector(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !useFileSelector 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Upload fichier
              </button>
              <button
                onClick={() => setUseFileSelector(true)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  useFileSelector 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Fichiers serveur
              </button>
            </div>

            {useFileSelector ? (
              <FileSelector onFileLoad={handleFileLoad} loading={loading} />
            ) : (
              <FileDropZone onFileLoad={handleFileLoad} loading={loading} />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <LogFilters 
              filter={filter} 
              onFilterChange={setFilter} 
              stats={stats}
              onFilterAuthErrors={handleFilterAuthErrors}
              authErrorsCount={authErrorsCount}
            />

            {/* Results */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Résultats de l'analyse
                </h2>
                <div className="text-sm text-gray-600">
                  {filteredLogs.length} / {logs.length} logs affichés
                  {hideAuthErrors && authErrorsCount > 0 && (
                    <span className="ml-2 text-orange-600">
                      ({authErrorsCount} erreurs auth masquées)
                    </span>
                  )}
                </div>
              </div>
              
              <LogTable logs={filteredLogs} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;