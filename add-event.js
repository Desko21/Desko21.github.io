document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // La tua Master Key
    const JSONBIN_EVENTS_READ_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66/latest'; // Bin ID degli eventi
    const JSONBIN_EVENTS_WRITE_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66';
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Bin ID dei log
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    const messageDiv = document.getElementById('message');
    const eventForm = document.getElementById('eventForm');
    const eventLocationInput = document.getElementById('eventLocation'); // Il campo città/località
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // Funzione per loggare le attività
    async function logActivity(action, eventDetails) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp: timestamp,
            action: action,
            event: {
                name: eventDetails.name,
                location: eventDetails.location,
                // Assicurati che l'ID sia passato correttamente dall'evento salvato
                createdAt: eventDetails.createdAt // Questo è l'ID di JSONBin.io
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
                console.warn("Could not read existing logs, starting fresh or creating bin if not exists.");
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
                console.error("Failed to log activity:", await writeLogResponse.text());
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // NUOVA FUNZIONE PER IL GEOCODING
    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            latitudeInput.value = '';
            longitudeInput.value = '';
            return;
        }

        messageDiv.textContent = 'Ricerca coordinate per la località...';
        messageDiv.className = 'message info';

        try {
            // EncodeURIComponent è fondamentale per gestire spazi e caratteri speciali nell'URL
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    // È buona pratica includere un User-Agent identificativo
                    'User-Agent': 'YourAppName/1.0 (your-email@example.com)' 
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

    // Aggiungi un event listener al campo 'eventLocationInput'
    // 'blur' si attiva quando il campo perde il focus (l'utente ha finito di digitare e clicca altrove)
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Puoi anche aggiungere un listener per 'keypress' o 'keyup' se vuoi un aggiornamento più "live",
    // ma blur è più semplice e meno intensivo per Nominatim.
    // eventLocationInput.addEventListener('keypress', (e) => {
    //     if (e.key === 'Enter') {
    //         e.preventDefault(); // Evita che il form si invii
    //         getCoordinatesFromLocation(eventLocationInput.value);
    //     }
    // });


    // Funzione per salvare l'evento (la stessa di prima, ma l'ho inclusa per completezza)
    async function saveEvent() {
        messageDiv.textContent = 'Salvataggio evento...';
        messageDiv.className = 'message info';

        const eventData = {
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
        };

        try {
            // PRIMO PASSO: Carica gli eventi esistenti
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Errore nel leggere gli eventi esistenti: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];

            // Aggiungi il nuovo evento
            events.push(eventData);

            // SECONDO PASSO: Scrivi l'intero array aggiornato nel bin
            const writeResponse = await fetch(JSONBIN_EVENTS_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(events)
            });

            if (!writeResponse.ok) {
                const errorText = await writeResponse.text();
                throw new Error(`Errore durante il salvataggio dell'evento: ${writeResponse.status} - ${errorText}`);
            }

            const updatedRecord = await writeResponse.json();
            const savedEvent = updatedRecord.record[updatedRecord.record.length - 1]; // L'ultimo elemento dell'array

            const eventId = savedEvent.createdAt;
            
            messageDiv.textContent = `Evento '${eventData.name}' aggiunto con successo! ID Evento: ${eventId}`;
            messageDiv.className = 'message success';
            eventForm.reset();

            logActivity('ADD_EVENT', savedEvent); 

        } catch (error) {
            console.error('Errore:', error);
            messageDiv.textContent = `Errore: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }

    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene il ricaricamento della pagina
        await saveEvent();
    });
});