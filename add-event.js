// add-event.js

// Importa le costanti dal file config.js
import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_WRITE_URL,
    NOMINATIM_USER_AGENT 
} from './config.js'; // Il percorso è relativo a questo file .js

document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    // --- Riferimenti agli elementi HTML ---
    const messageDiv = document.getElementById('message'); // Div per i messaggi generali del form
    const geolocationMessageDiv = document.getElementById('geolocationMessage'); // Div per i messaggi specifici di geolocalizzazione
    const eventForm = document.getElementById('eventForm'); // Il form principale
    const eventLocationInput = document.getElementById('eventLocation'); // Campo località
    const latitudeInput = document.getElementById('latitude'); // Campo latitudine
    const longitudeInput = document.getElementById('longitude'); // Campo longitudine
    const submitButton = eventForm.querySelector('button[type="submit"]'); // Il bottone di submit

    // --- Funzioni di Utilità ---

    /**
     * Genera un UUID v4 (Identificatore Univoco Universale).
     * Utilizzato per assegnare un ID robusto e controllabile a ogni nuovo evento.
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Registra un'attività nel bin dei log.
     * Include il timestamp, l'azione, l'indirizzo IP dell'utente e dettagli sull'evento.
     * @param {string} action - L'azione eseguita (es. 'ADD_EVENT').
     * @param {object} eventDetails - Un oggetto con i dettagli dell'evento (id, name, location).
     */
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
                console.warn("Could not retrieve IP:", await ipResponse.text());
            }
        } catch (ipError) {
            console.error("Error retrieving IP:", ipError);
        }

        const logEntry = {
            timestamp: timestamp,
            action: action,
            ipAddress: userIp, // Aggiungi l'indirizzo IP al log
            event: {
                id: eventDetails.id, // ID generato per l'evento
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
                console.warn("Could not read existing logs or bin does not exist, starting fresh.");
            }

            // Aggiungi il nuovo log
            existingLogs.push(logEntry);

            // Scrivi l'intero array di log aggiornato
            const writeLogResponse = await fetch(JSONBIN_LOGS_WRITE_URL, {
                method: 'PUT', // PUT sovrascrive il contenuto del bin
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Non aggiornare i metadati del bin, solo il suo contenuto
                },
                body: JSON.stringify(existingLogs)
            });

            if (!writeLogResponse.ok) {
                console.error("Failed to save activity log:", await writeLogResponse.text());
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    /**
     * Esegue il geocoding da un nome di località a coordinate (latitudine/longitudine)
     * utilizzando OpenStreetMap Nominatim.
     * I risultati vengono popolati nei campi latitudeInput e longitudeInput.
     * @param {string} locationName - Il nome della località da cercare.
     */
    async function getCoordinatesFromLocation(locationName) {
        // Pulisci i messaggi di geolocalizzazione ogni volta che inizia una nuova ricerca
        geolocationMessageDiv.textContent = '';
        geolocationMessageDiv.className = 'message';

        if (locationName.trim() === '') {
            latitudeInput.value = '';
            longitudeInput.value = '';
            return;
        }

        geolocationMessageDiv.textContent = 'Searching for coordinates for the location...';
        geolocationMessageDiv.className = 'message info';

        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': NOMINATIM_USER_AGENT // Usa la costante importata da config.js
                }
            });

            if (!response.ok) {
                throw new Error(`Error searching for coordinates: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                latitudeInput.value = parseFloat(firstResult.lat).toFixed(6); // Formatta a 6 cifre decimali
                longitudeInput.value = parseFloat(firstResult.lon).toFixed(6); // Formatta a 6 cifre decimali
                geolocationMessageDiv.textContent = 'Coordinates found!';
                geolocationMessageDiv.className = 'message success';
            } else {
                latitudeInput.value = '';
                longitudeInput.value = '';
                geolocationMessageDiv.textContent = 'Location not found, please enter coordinates manually.';
                geolocationMessageDiv.className = 'message warning';
            }
        } catch (error) {
            console.error('Error during geocoding:', error);
            geolocationMessageDiv.textContent = `Geocoding error: ${error.message}. Please enter coordinates manually.`;
            geolocationMessageDiv.className = 'message error';
        }
    }

    // --- Event Listeners ---

    // Attiva il geocoding quando il campo "Location" perde il focus
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Gestione dell'invio del modulo
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene il ricaricamento della pagina
        await saveEvent();
    });

    // --- Funzioni Principali ---

    /**
     * Salva un nuovo evento nel bin di JSONBin.io.
     * Legge tutti i dati dal modulo, genera un ID univoco e aggiorna il bin.
     */
    async function saveEvent() {
        // Disabilita il bottone subito all'inizio della funzione per prevenire doppi click
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Adding Event...'; // Cambia il testo del bottone
        }

        messageDiv.textContent = 'Saving event...';
        messageDiv.className = 'message info';

        const newEventId = generateUUID(); // GENERA UN ID UNIVOCO PER IL NUOVO EVENTO

        // Raccogli tutti i dati del modulo, inclusi i nuovi campi
        const eventData = {
            id: newEventId, // Includi l'ID univoco nell'oggetto evento
            name: document.getElementById('eventName').value,
            location: document.getElementById('eventLocation').value,
            latitude: latitudeInput.value,
            longitude: longitudeInput.value,
            type: document.getElementById('eventType').value, // Game Type
            gender: document.getElementById('eventGender').value, // Campo: Gender
            startDate: document.getElementById('eventStartDate').value, // Campo: Start Date
            endDate: document.getElementById('eventEndDate').value, // Campo: End Date
            description: document.getElementById('eventDescription').value,
            link: document.getElementById('eventLink').value, // Campo: More Info Link
            // Se hai un campo "isFeatured" (checkbox) nel tuo HTML, decommenta la riga sotto:
            // featured: document.getElementById('isFeatured') ? document.getElementById('isFeatured').checked : false 
        };

        try {
            // PASSO 1: Carica tutti gli eventi esistenti dal bin
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || []; // Assicurati che sia un array, anche se vuoto

            // Aggiungi il nuovo evento all'array
            events.push(eventData);

            // PASSO 2: Scrivi l'intero array aggiornato nel bin di JSONBin.io
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
                throw new Error(`Error saving the event: ${writeResponse.status} - ${errorText}`);
            }

            // A questo punto, l'evento è stato salvato con successo.
            // L'ID da mostrare è quello che abbiamo generato noi.
            messageDiv.textContent = `Event '${eventData.name}' added successfully!\nPlease make a note of the Event ID: ${newEventId}, as you will need it to modify the event in the future.`;
            messageDiv.className = 'message success';
            eventForm.reset(); // Resetta il modulo per permettere l'inserimento di un nuovo evento

            // Logga l'azione di aggiunta evento, passando l'oggetto eventData con il nuovo ID
            logActivity('ADD_EVENT', eventData); 

        } catch (error) {
            console.error('Error:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        } finally {
            // Riabilita il bottone alla fine, sia in caso di successo che di errore
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Add Event'; // Riporta il testo originale
            }
        }
    }
});