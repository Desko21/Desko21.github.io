document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    // --- Configurazione JSONBin.io ---
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY!
    const JSONBIN_EVENTS_READ_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66/latest'; // Bin ID degli eventi
    const JSONBIN_EVENTS_WRITE_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66';
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Bin ID dei log
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    // --- Riferimenti agli elementi HTML ---
    const messageDiv = document.getElementById('message');
    const eventForm = document.getElementById('eventForm');
    const eventLocationInput = document.getElementById('eventLocation'); // Campo città/località
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // --- Funzioni di Utilità ---

    // Funzione per generare un UUID v4 (identificatore univoco universale)
    // Usato per dare un ID robusto e controllabile ai tuoi eventi.
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Funzione per loggare le attività
    // Ora include il recupero dell'indirizzo IP e l'ID dell'evento.
    async function logActivity(action, eventDetails) {
        const timestamp = new Date().toISOString();
        let userIp = 'N/A'; // Valore di default in caso di fallimento

        try {
            // Tentativo di recuperare l'indirizzo IP pubblico dell'utente
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                userIp = ipData.ip || 'N/A';
            } else {
                console.warn("Impossibile recuperare l'IP:", await ipResponse.text());
            }
        } catch (ipError) {
            console.error("Errore nel recupero dell'IP:", ipError);
        }

        const logEntry = {
            timestamp: timestamp,
            action: action,
            ipAddress: userIp, // Aggiungi l'indirizzo IP al log
            event: {
                id: eventDetails.id, // Ora usiamo l'ID generato da noi
                name: eventDetails.name,
                location: eventDetails.location,
            }
        };

        try {
            // Carica i log esistenti
            const readLogResponse = await fetch(JSONBIN_LOGS_WRITE_URL + '/latest', {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });
            let existingLogs = [];
            if (readLogResponse.ok) {
                const logData = await readLogResponse.json();
                existingLogs = logData.record || [];
            } else {
                console.warn("Non è stato possibile leggere i log esistenti o il bin non esiste, inizio da zero.");
            }

            // Aggiungi il nuovo log
            existingLogs.push(logEntry);

            // Scrivi l'intero array di log aggiornato
            const writeLogResponse = await fetch(JSONBIN_LOGS_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(existingLogs)
            });

            if (!writeLogResponse.ok) {
                console.error("Errore durante il salvataggio del log attività:", await writeLogResponse.text());
            }
        } catch (error) {
            console.error('Errore durante il logging dell\'attività:', error);
        }
    }

    // Funzione per il geocoding da località a coordinate (latitudine/longitudine)
    // Utilizza OpenStreetMap Nominatim.
    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            latitudeInput.value = '';
            longitudeInput.value = '';
            return;
        }

        messageDiv.textContent = 'Ricerca coordinate per la località...';
        messageDiv.className = 'message info';

        try {
            // encodeURIComponent è fondamentale per gestire spazi e caratteri speciali nell'URL
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    // È buona pratica includere un User-Agent identificativo
                    // CAMBIA QUESTO CON IL NOME DELLA TUA APP E UNA TUA EMAIL!
                    'User-Agent': 'EventApp/1.0 (your-email@example.com)' 
                }
            });

            if (!response.ok) {
                throw new Error(`Errore nella ricerca delle coordinate: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                latitudeInput.value = parseFloat(firstResult.lat).toFixed(6); // Formatta a 6 cifre decimali
                longitudeInput.value = parseFloat(firstResult.lon).toFixed(6); // Formatta a 6 cifre decimali
                messageDiv.textContent = 'Coordinate trovate!';
                messageDiv.className = 'message success';
            } else {
                latitudeInput.value = '';
                longitudeInput.value = '';
                messageDiv.textContent = 'Località non trovata, inserisci le coordinate manualmente.';
                messageDiv.className = 'message warning';
            }
        } catch (error) {
            console.error('Errore durante il geocoding:', error);
            messageDiv.textContent = `Errore geocoding: ${error.message}. Inserisci le coordinate manualmente.`;
            messageDiv.className = 'message error';
        }
    }

    // --- Event Listeners ---

    // Attiva il geocoding quando il campo "Località" perde il focus
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Gestione dell'invio del modulo
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene il ricaricamento della pagina
        await saveEvent();
    });

    // --- Funzioni Principali ---

    // Funzione per salvare un nuovo evento
    async function saveEvent() {
        messageDiv.textContent = 'Salvataggio evento...';
        messageDiv.className = 'message info';

        const newEventId = generateUUID(); // GENERA UN ID UNIVOCO PER IL NUOVO EVENTO

        const eventData = {
            id: newEventId, // Includi il tuo ID univoco nell'oggetto evento
            name: document.getElementById('eventName').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            location: document.getElementById('eventLocation').value,
            description: document.getElementById('eventDescription').value,
            latitude: latitudeInput.value,
            longitude: longitudeInput.value,
            type: document.getElementById('eventType').value,
            image: document.getElementById('eventImage').value,
            featured: document.getElementById('isFeatured').checked
            // Il campo 'createdAt' sarà aggiunto automaticamente da JSONBin.io ma non sarà l'ID primario usato da te
        };

        try {
            // PRIMO PASSO: Carica tutti gli eventi esistenti dal bin
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Errore nel leggere gli eventi esistenti: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || []; // Assicurati che sia un array, anche se vuoto

            // Aggiungi il nuovo evento all'array
            events.push(eventData);

            // SECONDO PASSO: Scrivi l'intero array aggiornato nel bin di JSONBin.io
            const writeResponse = await fetch(JSONBIN_EVENTS_WRITE_URL, {
                method: 'PUT', // PUT sovrascrive il contenuto del bin
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Non aggiornare i metadati del bin, solo il suo contenuto
                },
                body: JSON.stringify(events) // Invia l'intero array di eventi aggiornato
            });

            if (!writeResponse.ok) {
                const errorText = await writeResponse.text();
                throw new Error(`Errore durante il salvataggio dell'evento: ${writeResponse.status} - ${errorText}`);
            }

            // A questo punto, l'evento è stato salvato con successo.
            // L'ID da mostrare è quello che abbiamo generato noi.
            messageDiv.textContent = `Evento '${eventData.name}' aggiunto con successo! ID Evento: ${newEventId}`;
            messageDiv.className = 'message success';
            eventForm.reset(); // Resetta il modulo per permettere l'inserimento di un nuovo evento

            // Logga l'azione di aggiunta evento, passando l'oggetto eventData con il nuovo ID
            logActivity('ADD_EVENT', eventData); 

        } catch (error) {
            console.error('Errore:', error);
            messageDiv.textContent = `Errore: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }
});