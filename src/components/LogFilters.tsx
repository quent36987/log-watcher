import React from 'react';
import { Search, Calendar, Filter, Shield } from 'lucide-react';
import { LogFilter, LogStats } from '../types';

interface LogFiltersProps {
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  stats: LogStats;
  onFilterAuthErrors: () => void;
  authErrorsCount: number;
}

export const LogFilters: React.FC<LogFiltersProps> = ({ 
  filter, 
  onFilterChange, 
  stats, 
  onFilterAuthErrors, 
  authErrorsCount 
}) => {
  const handleFilterChange = (key: keyof LogFilter, value: string) => {
    onFilterChange({ ...filter, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Search and Auth Filter Row */}
      <div className="flex gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans les logs..."
            value={filter.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Auth Error Filter Button */}
        {authErrorsCount > 0 && (
          <button
            onClick={onFilterAuthErrors}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors border border-orange-300"
            title="Masquer les erreurs d'authentification"
          >
            <Shield className="w-4 h-4" />
            <span>Masquer auth ({authErrorsCount})</span>
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Filter className="inline w-4 h-4 mr-1" />
            Niveau
          </label>
          <select
            value={filter.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous les niveaux</option>
            <option value="ERROR">ERROR ({stats.error})</option>
            <option value="WARN">WARN ({stats.warn})</option>
            <option value="INFO">INFO ({stats.info})</option>
            <option value="DEBUG">DEBUG ({stats.debug})</option>
            <option value="TRACE">TRACE ({stats.trace})</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            Date de début
          </label>
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            Date de fin
          </label>
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          <div className="text-sm text-gray-500">Erreurs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.warn}</div>
          <div className="text-sm text-gray-500">Warnings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
          <div className="text-sm text-gray-500">Info</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.debug}</div>
          <div className="text-sm text-gray-500">Debug</div>
        </div>
      </div>
    </div>
  );
};