document.addEventListener('DOMContentLoaded', () => {
    console.log('logs.js loaded.');

    // SOSTITUISCI CON LA TUA MASTER KEY EFFETTIVA DI JSONBIN.IO
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; 
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Il BIN ID dei tuoi log
    const JSONBIN_LOGS_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}/latest`;
    // L'URL di scrittura non è più necessario visto che non cancelliamo i log
    // const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`; 

    const messageDiv = document.getElementById('message');
    const logsTableBody = document.getElementById('logsTableBody');
    // Il pulsante clearLogsButton e il suo event listener sono stati rimossi.

    let allLogs = []; // Array per memorizzare tutti i log caricati

    /**
     * Carica i log dal bin di JSONBin.io.
     */
    async function loadLogs() {
        messageDiv.textContent = 'Caricamento log...';
        messageDiv.className = 'message info';
        try {
            const response = await fetch(JSONBIN_LOGS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Errore durante la lettura del bin dei log:", response.status, errorText);
                messageDiv.textContent = `Errore durante il caricamento dei log: ${response.status} - ${errorText}`;
                messageDiv.className = 'message error';
                return;
            }

            const data = await response.json();
            // Assumiamo che i log siano nell'array 'record'
            allLogs = data.record || []; 
            console.log('Log caricati:', allLogs);
            displayLogs(); // Visualizza i log caricati
            messageDiv.textContent = ''; // Pulisce il messaggio di stato in caso di successo
            messageDiv.className = 'message';
        } catch (error) {
            console.error('Si è verificato un errore imprevisto durante il caricamento dei log:', error);
            messageDiv.textContent = 'Si è verificato un errore imprevisto durante il caricamento dei log.';
            messageDiv.className = 'message error';
        }
    }

    /**
     * Visualizza i log nell'interfaccia utente, ordinandoli dal più recente.
     */
    function displayLogs() {
        logsTableBody.innerHTML = ''; // Pulisce la tabella prima di riempirla

        if (allLogs.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="5">Nessun log attività trovato.</td></tr>'; // colspan è ora 5
            return;
        }

        // Ordina i log dal più recente al più vecchio in base al timestamp
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        allLogs.forEach(log => {
            const row = logsTableBody.insertRow();
            
            const dateObj = new Date(log.timestamp);

            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false, 
                timeZone: 'Europe/Rome',
                timeZoneName: 'short' 
            };

            const formattedTimestamp = dateObj.toLocaleString('it-IT', options); 

            row.insertCell().textContent = formattedTimestamp;
            row.insertCell().textContent = log.action;
            row.insertCell().textContent = log.event ? log.event.name : 'N/A';
            // row.insertCell().textContent = log.event ? (log.event.createdAt ? log.event.createdAt.substring(0, 8) + '...' : 'N/A') : 'N/A'; // QUESTA RIGA E' STATA RIMOSSA
            row.insertCell().textContent = log.event ? log.event.location : 'N/A';
            row.insertCell().textContent = log.ipAddress || 'N/A'; 
        });
    }

    // La funzione clearAllLogs e il suo event listener sono stati rimossi in quanto il pulsante non è più presente.

    // Carica i log all'avvio della pagina
    loadLogs();
});