import * as pako from 'pako';

export class FileHandler {
  static async readFile(file: File): Promise<string> {
    console.log('📁 Lecture du fichier:', file.name, 'Taille:', this.formatFileSize(file.size));
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result as ArrayBuffer;
          console.log('📖 Fichier lu, taille du buffer:', result.byteLength);
          
          if (file.name.endsWith('.gz')) {
            console.log('🗜️ Décompression du fichier .gz...');
            try {
              const compressed = new Uint8Array(result);
              const decompressed = pako.inflate(compressed, { to: 'string' });
              console.log('✅ Décompression réussie, taille décompressée:', decompressed.length);
              resolve(decompressed);
            } catch (decompressError) {
              console.error('❌ Erreur de décompression:', decompressError);
              reject(new Error('Erreur lors de la décompression du fichier .gz'));
            }
          } else {
            // Lire comme texte
            try {
              const textContent = new TextDecoder('utf-8').decode(result);
              console.log('✅ Lecture texte réussie, longueur:', textContent.length);
              resolve(textContent);
            } catch (decodeError) {
              console.error('❌ Erreur de décodage:', decodeError);
              reject(new Error('Erreur lors du décodage du fichier texte'));
            }
          }
        } catch (error) {
          console.error('❌ Erreur générale lors de la lecture:', error);
          reject(new Error('Erreur lors de la lecture du fichier'));
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ Erreur du FileReader:', error);
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          console.log('📊 Progression de lecture:', Math.round(progress) + '%');
        }
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  static validateLogFile(file: File): boolean {
    const validExtensions = ['.log', '.gz', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    console.log('🔍 Validation du fichier:', file.name, 'Valide:', isValid);
    
    // Vérifier aussi la taille (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      console.warn('⚠️ Fichier trop volumineux:', this.formatFileSize(file.size));
      return false;
    }
    
    return isValid;
  }
  
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}