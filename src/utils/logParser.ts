import { LogEntry, LogFilter, LogStats } from '../types';

interface LogIndex {
  byLevel: Map<string, LogEntry[]>;
  byThread: Map<string, LogEntry[]>;
  byClassName: Map<string, LogEntry[]>;
  all: LogEntry[];
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export class LogParser {
  // Pattern simple pour détecter un timestamp au début d'une ligne
  private static readonly TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?Z?)/;

  // Cache des index pour optimiser les filtres
  private static logIndex: LogIndex | null = null;

  static parseLogFile(content: string): LogEntry[] {
    console.log('🔍 Début du parsing, taille du contenu:', content.length);

    if (!content || content.trim().length === 0) {
      console.error('❌ Contenu vide ou invalide');
      throw new Error('Le fichier est vide ou invalide');
    }

    const lines = content.split('\n');
    console.log('📄 Nombre de lignes à traiter:', lines.length);

    if (lines.length === 0) {
      throw new Error('Aucune ligne valide trouvée dans le fichier');
    }

    const entries: LogEntry[] = [];
    let currentEntry: LogEntry | null = null;
    let parsedCount = 0;
    let multilineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Vérifier si la ligne commence par un timestamp
      const timestampMatch = line.match(this.TIMESTAMP_PATTERN);

      if (timestampMatch) {
        // C'est une nouvelle entrée de log
        console.log(`✅ Nouvelle entrée ligne ${i + 1}:`, line.substring(0, 100));

        // Sauvegarder l'entrée précédente si elle existe
        if (currentEntry) {
          entries.push(currentEntry);
          parsedCount++;
        }

        // Parser la nouvelle entrée
        currentEntry = this.parseLogLine(line);

      } else if (currentEntry && line.trim()) {
        // C'est une continuation du log précédent (ligne non vide)
        console.log(`📝 Continuation ligne ${i + 1}:`, line.substring(0, 120));

        // Ajouter la ligne au message et au raw
        currentEntry.message += '\n' + line;
        currentEntry.raw += '\n' + line;
        multilineCount++;

      } else if (currentEntry && !line.trim()) {
        // Ligne vide - l'ajouter aussi pour préserver le formatage
        currentEntry.message += '\n';
        currentEntry.raw += '\n';
      }
      // Si pas d'entrée courante et ligne vide, on ignore
    }

    // Ajouter la dernière entrée
    if (currentEntry) {
      entries.push(currentEntry);
      parsedCount++;
    }

    console.log('✅ Parsing terminé:');
    console.log('  - Entrées créées:', parsedCount);
    console.log('  - Lignes multi-ligne ajoutées:', multilineCount);
    console.log('  - Total lignes traitées:', lines.length);

    if (entries.length === 0) {
      console.error('❌ Aucune entrée créée');
      throw new Error('Aucun log valide trouvé dans le fichier. Vérifiez le format du fichier.');
    }

    // Nettoyer les messages
    entries.forEach(entry => {
      entry.message = entry.message.trim();
      entry.raw = entry.raw.trim();
    });

    console.log('🎯 Exemples d\'entrées parsées:');
    entries.slice(0, 3).forEach((entry, index) => {
      console.log(`Entrée ${index + 1}:`, {
        timestamp: entry.timestamp,
        level: entry.level,
        thread: entry.thread,
        className: entry.className,
        message: entry.message.substring(0, 100) + (entry.message.length > 100 ? '...' : '')
      });
    });

    // Créer l'index pour optimiser les filtres
    this.createLogIndex(entries);

    return entries;
  }

  private static createLogIndex(logs: LogEntry[]): void {
    console.log('📊 Création de l\'index des logs...');
    const startTime = performance.now();

    this.logIndex = {
      byLevel: new Map(),
      byThread: new Map(),
      byClassName: new Map(),
      all: logs
    };

    // Index par niveau
    logs.forEach(log => {
      // Par niveau
      if (!this.logIndex!.byLevel.has(log.level)) {
        this.logIndex!.byLevel.set(log.level, []);
      }
      this.logIndex!.byLevel.get(log.level)!.push(log);

      // Par thread
      if (!this.logIndex!.byThread.has(log.thread)) {
        this.logIndex!.byThread.set(log.thread, []);
      }
      this.logIndex!.byThread.get(log.thread)!.push(log);

      // Par classe
      if (!this.logIndex!.byClassName.has(log.className)) {
        this.logIndex!.byClassName.set(log.className, []);
      }
      this.logIndex!.byClassName.get(log.className)!.push(log);
    });

    const endTime = performance.now();
    console.log(`✅ Index créé en ${Math.round(endTime - startTime)}ms`);
    console.log('📈 Statistiques de l\'index:');
    console.log(`  - Niveaux: ${this.logIndex.byLevel.size}`);
    console.log(`  - Threads: ${this.logIndex.byThread.size}`);
    console.log(`  - Classes: ${this.logIndex.byClassName.size}`);
  }
  private static parseLogLine(line: string): LogEntry {
    // Extraire le timestamp
    const timestampMatch = line.match(this.TIMESTAMP_PATTERN);
    if (!timestampMatch) {
      return this.createFallbackEntry(line);
    }

    const timestamp = timestampMatch[1];
    let remaining = line.substring(timestamp.length).trim();

    // Extraire le niveau (premier mot après le timestamp)
    const levelMatch = remaining.match(/^(\w+)/);
    let level = 'INFO';
    if (levelMatch) {
      level = levelMatch[1];
      remaining = remaining.substring(level.length).trim();
    }

    // Chercher les crochets [xxx] pour classe et thread
    let className = 'Unknown';
    let thread = 'main';

    const bracketsMatches = remaining.match(/\[([^\]]+)\]/g);
    if (bracketsMatches && bracketsMatches.length >= 2) {
      // Premier [xxx] = classe, deuxième [xxx] = thread
      className = bracketsMatches[0].slice(1, -1); // Enlever les crochets
      thread = bracketsMatches[1].slice(1, -1);
    } else if (bracketsMatches && bracketsMatches.length === 1) {
      // Un seul crochet, on considère que c'est la classe
      className = bracketsMatches[0].slice(1, -1);
    }

    // Extraire le message après le premier ":"
    let message = remaining;
    const colonIndex = remaining.indexOf(':');
    if (colonIndex !== -1) {
      message = remaining.substring(colonIndex + 1).trim();
    }

    return {
      id: generateUUID(),
      timestamp: this.parseTimestamp(timestamp),
      level: this.normalizeLevel(level),
      thread: thread,
      className: className,
      message: message,
      raw: line
    };
  }

  private static createFallbackEntry(line: string): LogEntry {
    return {
      id: generateUUID(),
      timestamp: new Date(),
      level: 'INFO',
      thread: 'main',
      className: 'Unknown',
      message: line.trim(),
      raw: line
    };
  }

  private static parseTimestamp(timestampStr: string): Date {
    // Normaliser le timestamp pour le parsing
    let normalizedTimestamp = timestampStr;

    // Remplacer l'espace par T si nécessaire
    if (normalizedTimestamp.includes(' ')) {
      normalizedTimestamp = normalizedTimestamp.replace(' ', 'T');
    }

    // Remplacer la virgule par un point pour les millisecondes
    if (normalizedTimestamp.includes(',')) {
      normalizedTimestamp = normalizedTimestamp.replace(',', '.');
    }

    // Ajouter Z à la fin si pas présent
    if (!normalizedTimestamp.endsWith('Z')) {
      normalizedTimestamp += 'Z';
    }

    try {
      const date = new Date(normalizedTimestamp);
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Timestamp invalide:', timestampStr);
        return new Date();
      }
      return date;
    } catch (error) {
      console.warn('⚠️ Impossible de parser le timestamp:', timestampStr);
      return new Date();
    }
  }

  private static normalizeLevel(level: string): LogEntry['level'] {
    const upperLevel = level.toUpperCase();
    switch (upperLevel) {
      case 'ERROR':
      case 'ERR':
        return 'ERROR';
      case 'WARN':
      case 'WARNING':
        return 'WARN';
      case 'INFO':
      case 'INFORMATION':
        return 'INFO';
      case 'DEBUG':
      case 'DBG':
        return 'DEBUG';
      case 'TRACE':
      case 'TRC':
        return 'TRACE';
      default:
        return 'INFO';
    }
  }

  static filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
    const startTime = performance.now();

    // Si on a un index et qu'on filtre juste par niveau, utiliser l'index
    if (this.logIndex && filter.level && filter.level !== 'ALL' &&
        !filter.search && !filter.dateFrom && !filter.dateTo) {
      const result = this.logIndex.byLevel.get(filter.level) || [];
      const endTime = performance.now();
      console.log(`⚡ Filtrage optimisé par niveau en ${Math.round(endTime - startTime)}ms (${result.length} résultats)`);
      return result;
    }

    // Sinon, utiliser le filtrage classique mais optimisé
    let baseList = logs;

    // Si on a un index et un filtre de niveau, commencer par là
    if (this.logIndex && filter.level && filter.level !== 'ALL') {
      baseList = this.logIndex.byLevel.get(filter.level) || [];
    }

    return logs.filter(log => {
      // Search filter
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        const searchFields = [
          log.message,
          log.className,
          log.thread,
          log.level
        ].join(' ').toLowerCase();

        if (!searchFields.includes(searchTerm)) {
          return false;
        }
      }

      // Level filter (seulement si pas déjà appliqué par l'index)
      if (filter.level && filter.level !== 'ALL' && baseList === logs) {
        if (log.level !== filter.level) {
          return false;
        }
      }

      // Date filters
      if (filter.dateFrom) {
        const fromDate = new Date(filter.dateFrom);
        if (log.timestamp < fromDate) {
          return false;
        }
      }

      if (filter.dateTo) {
        const toDate = new Date(filter.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (log.timestamp > toDate) {
          return false;
        }
      }

      return true;
    });
  }

  static getLogStats(logs: LogEntry[]): LogStats {
    // Si on a un index, utiliser les statistiques pré-calculées
    if (this.logIndex && logs === this.logIndex.all) {
      const stats = {
        total: logs.length,
        info: this.logIndex.byLevel.get('INFO')?.length || 0,
        warn: this.logIndex.byLevel.get('WARN')?.length || 0,
        error: this.logIndex.byLevel.get('ERROR')?.length || 0,
        debug: this.logIndex.byLevel.get('DEBUG')?.length || 0,
        trace: this.logIndex.byLevel.get('TRACE')?.length || 0
      };
      console.log('📊 Statistiques depuis l\'index');
      return stats;
    }

    // Sinon, calculer normalement
    const stats = {
      total: logs.length,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      trace: 0
    };

    logs.forEach(log => {
      switch (log.level) {
        case 'INFO':
          stats.info++;
          break;
        case 'WARN':
          stats.warn++;
          break;
        case 'ERROR':
          stats.error++;
          break;
        case 'DEBUG':
          stats.debug++;
          break;
        case 'TRACE':
          stats.trace++;
          break;
      }
    });

    return stats;
  }

  // Méthode pour nettoyer l'index (optionnel)
  static clearIndex(): void {
    this.logIndex = null;
    console.log('🗑️ Index des logs nettoyé');
  }


}