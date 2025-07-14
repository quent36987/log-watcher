const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT ||  3001;


// Configuration - CHANGEZ CE CHEMIN VERS VOTRE DOSSIER DE LOGS
const LOGS_DIRECTORY = process.env.LOGS_DIRECTORY || '/mnt/logs'; // ← MODIFIEZ CE CHEMIN

app.use(cors());
app.use(express.json());

// sert les fichiers statiques générés par Vite
app.use(express.static(path.join(__dirname, 'public')));



// Route pour lister les fichiers
app.get('/api/files', async (req, res) => {
  try {
    console.log('📁 Lecture du dossier:', LOGS_DIRECTORY);

    // Vérifier que le dossier existe
    try {
      await fs.access(LOGS_DIRECTORY);
    } catch (error) {
      return res.status(404).json({
        error: `Dossier non trouvé: ${LOGS_DIRECTORY}`,
        help: 'Modifiez la variable LOGS_DIRECTORY dans server/index.js'
      });
    }

    const files = await fs.readdir(LOGS_DIRECTORY);

    // Filtrer les fichiers de logs et récupérer les infos
    const logFiles = [];

    for (const file of files) {
      const filePath = path.join(LOGS_DIRECTORY, file);

      // Vérifier que c'est un fichier (pas un dossier)
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;

      // Filtrer par extension
      const ext = path.extname(file).toLowerCase();
      // if (!['.log', '.txt', '.gz'].includes(ext)) continue;

      logFiles.push({
        name: file,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      });
    }

    // Trier par date de modification (plus récent en premier)
    logFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    console.log(`✅ ${logFiles.length} fichiers de logs trouvés`);
    res.json({ files: logFiles });

  } catch (error) {
    console.error('❌ Erreur lors de la lecture du dossier:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer le contenu d'un fichier
app.get('/api/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(LOGS_DIRECTORY, filename);

    console.log('📖 Lecture du fichier:', filePath);

    // Vérifier que le fichier existe et est dans le bon dossier (sécurité)
    const resolvedPath = path.resolve(filePath);
    const resolvedLogsDir = path.resolve(LOGS_DIRECTORY);

    if (!resolvedPath.startsWith(resolvedLogsDir)) {
      return res.status(403).json({ error: 'Accès non autorisé au fichier' });
    }

    // Lire le fichier
    const content = await fs.readFile(filePath, 'utf8');

    console.log(`✅ Fichier lu: ${filename} (${content.length} caractères)`);
    res.json({
      content,
      fileName: filename,
      size: content.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Fichier non trouvé' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    logsDirectory: LOGS_DIRECTORY,
    timestamp: new Date().toISOString()
  });
});

// route "catch-all" pour le SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de logs démarré sur http://localhost:${PORT}`);
  console.log(`📁 Dossier surveillé: ${LOGS_DIRECTORY}`);
  console.log(`🔗 API disponible sur:`);
  console.log(`   - GET /api/files (liste des fichiers)`);
  console.log(`   - GET /api/file/:filename (contenu d'un fichier)`);
  console.log(`   - GET /api/health (test de santé)`);
  console.log(`🌐 Interface web: http://localhost:${PORT}`);
});