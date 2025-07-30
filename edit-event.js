document.addEventListener('DOMContentLoaded', () => {
    console.log('edit-event.js loaded.');

    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // La tua Master Key
    const JSONBIN_EVENTS_READ_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66/latest'; // Bin ID degli eventi
    const JSONBIN_EVENTS_WRITE_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66';
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Bin ID dei log
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    const messageDiv = document.getElementById('message');
    const searchEventIdInput = document.getElementById('searchEventId');
    const searchButton = document.getElementById('searchButton');
    const eventEditFormContainer = document.getElementById('eventEditFormContainer');
    const editEventForm = document.getElementById('editEventForm');

    // Campi del modulo di modifica
    const eventIdInput = document.getElementById('eventId'); // Campo nascosto per l'ID
    const editEventNameInput = document.getElementById('editEventName');
    const editEventDateInput = document.getElementById('editEventDate');
    const editEventTimeInput = document.getElementById('editEventTime');
    const editEventLocationInput = document.getElementById('editEventLocation');
    const editEventDescriptionInput = document.getElementById('editEventDescription');
    const editLatitudeInput = document.getElementById('editLatitude');
    const editLongitudeInput = document.getElementById('editLongitude');
    const editEventTypeInput = document.getElementById('editEventType');
    const editEventImageInput = document.getElementById('editEventImage');
    const editIsFeaturedInput = document.getElementById('editIsFeatured');

    // Funzione per loggare le attività (copiata da add-event.js, assicurati che sia la stessa versione)
    async function logActivity(action, eventDetails) {
        const timestamp = new Date().toISOString();
        let userIp = 'N/A';

        try {
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
            ipAddress: userIp,
            event: {
                id: eventDetails.id, // Ora usiamo l'ID generato da noi
                name: eventDetails.name,
                location: eventDetails.location,
                // createdAt: eventDetails.createdAt // Non serve più se l'ID è 'id'
            }
        };

        try {
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

            existingLogs.push(logEntry);

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


    // Funzione per cercare l'evento
    searchButton.addEventListener('click', async () => {
        const eventIdToSearch = searchEventIdInput.value.trim();
        if (!eventIdToSearch) {
            messageDiv.textContent = 'Per favore, inserisci un ID evento.';
            messageDiv.className = 'message error';
            eventEditFormContainer.style.display = 'none';
            return;
        }

        messageDiv.textContent = 'Ricerca evento...';
        messageDiv.className = 'message info';
        eventEditFormContainer.style.display = 'none';

        try {
            const response = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Errore durante la lettura degli eventi: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            const events = data.record || [];
            const foundEvent = events.find(event => event.id === eventIdToSearch); // Cerca l'evento per l'ID

            if (foundEvent) {
                // Popola il modulo con i dati dell'evento trovato
                eventIdInput.value = foundEvent.id; // Salva l'ID nell'input nascosto
                editEventNameInput.value = foundEvent.name;
                editEventDateInput.value = foundEvent.date;
                editEventTimeInput.value = foundEvent.time;
                editEventLocationInput.value = foundEvent.location;
                editEventDescriptionInput.value = foundEvent.description;
                editLatitudeInput.value = foundEvent.latitude;
                editLongitudeInput.value = foundEvent.longitude;
                editEventTypeInput.value = foundEvent.type;
                editEventImageInput.value = foundEvent.image;
                editIsFeaturedInput.checked = foundEvent.featured;

                eventEditFormContainer.style.display = 'block'; // Mostra il modulo
                messageDiv.textContent = `Evento '${foundEvent.name}' trovato! Modifica i valori.`;
                messageDiv.className = 'message success';
                
                // Opzionale: Geolocalizzazione inversa se i campi lat/long sono vuoti o da aggiornare
                // getCoordinatesFromLocation(editEventLocationInput.value); 

            } else {
                messageDiv.textContent = 'Nessun evento trovato con l\'ID specificato.';
                messageDiv.className = 'message warning';
                eventEditFormContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Errore durante la ricerca dell\'evento:', error);
            messageDiv.textContent = `Errore: ${error.message}`;
            messageDiv.className = 'message error';
        }
    });

    // Funzione per salvare le modifiche all'evento
    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene il ricaricamento della pagina

        messageDiv.textContent = 'Salvataggio modifiche...';
        messageDiv.className = 'message info';

        const eventIdToUpdate = eventIdInput.value; // L'ID dell'evento che stiamo modificando

        const updatedEventData = {
            id: eventIdToUpdate, // Mantieni l'ID originale
            name: editEventNameInput.value,
            date: editEventDateInput.value,
            time: editEventTimeInput.value,
            location: editEventLocationInput.value,
            description: editEventDescriptionInput.value,
            latitude: editLatitudeInput.value,
            longitude: editLongitudeInput.value,
            type: editEventTypeInput.value,
            image: editEventImageInput.value,
            featured: editIsFeaturedInput.checked
        };

        try {
            // PRIMO PASSO: Carica tutti gli eventi esistenti
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Errore nel leggere gli eventi esistenti per la modifica: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];

            // Trova l'indice dell'evento da aggiornare nell'array
            const eventIndex = events.findIndex(event => event.id === eventIdToUpdate);

            if (eventIndex !== -1) {
                // Aggiorna l'evento con i nuovi dati
                events[eventIndex] = updatedEventData;

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
                    throw new Error(`Errore durante il salvataggio delle modifiche all'evento: ${writeResponse.status} - ${errorText}`);
                }

                messageDiv.textContent = `Evento '${updatedEventData.name}' (ID: ${eventIdToUpdate}) modificato con successo!`;
                messageDiv.className = 'message success';
                
                // Nascondi il modulo dopo il successo
                eventEditFormContainer.style.display = 'none';
                searchEventIdInput.value = ''; // Pulisci il campo di ricerca

                // Logga l'azione di modifica
                logActivity('EDIT_EVENT', updatedEventData);

            } else {
                messageDiv.textContent = 'Errore: Evento non trovato per la modifica (ID non corrispondente).';
                messageDiv.className = 'message error';
            }

        } catch (error) {
            console.error('Errore durante la modifica dell\'evento:', error);
            messageDiv.textContent = `Errore: ${error.message}`;
            messageDiv.className = 'message error';
        }
    });

    // Opzionale: Geocoding della località in tempo reale nel modulo di modifica (simil add-event.js)
    // Se vuoi che anche nella pagina di modifica lat/long vengano calcolate automaticamente
    // quando l'utente cambia la località, devi aggiungere una funzione simile a getCoordinatesFromLocation
    // e un event listener su editEventLocationInput.
    // Per brevità non la includo qui, ma puoi copiarla e adattarla da add-event.js
});