// add-event.js

import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_WRITE_URL,
    NOMINATIM_USER_AGENT 
} from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    // --- Riferimenti agli elementi HTML ---
    const addEventForm = document.getElementById('addEventForm');
    const messageDiv = document.getElementById('message');
    const geolocationMessageDiv = document.getElementById('geolocationMessage');
    const eventLocationInput = document.getElementById('eventLocation');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // Dropdown per Game Type e Gender
    const eventTypeInput = document.getElementById('eventType');
    const eventGenderInput = document.getElementById('eventGender');

    // --- Data per le opzioni dei Select (DEVE CORRISPONDERE A edit-event.js e script.js) ---
    const gameTypes = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const genders = ['Men', 'Women', 'Both', 'Mixed', 'Other'];

    // --- Funzione per popolare i dropdown ---
    function populateDropdown(selectElement, options) {
        selectElement.innerHTML = ''; // Pulisce le opzioni esistenti
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase(); // Il valore sarà in minuscolo
            option.textContent = optionText;         // Il testo visualizzato sarà con la maiuscola iniziale
            selectElement.appendChild(option);
        });
    }

    // Popola i dropdown all'avvio della pagina
    populateDropdown(eventTypeInput, gameTypes);
    populateDropdown(eventGenderInput, genders);

    // --- Funzioni Utility ---

    async function logActivity(action, eventDetails) {
        const timestamp = new Date().toISOString();
        let userIp = 'N/A';

        try {
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
            ipAddress: userIp,
            event: {
                id: eventDetails.id,
                name: eventDetails.name,
                location: eventDetails.location,
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
                console.warn("Could not read existing logs or bin does not exist, starting fresh.");
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
                console.error("Failed to save activity log:", await writeLogResponse.text());
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Funzione per generare un ID unico
    function generateUniqueId() {
        return 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Funzione per ottenere le coordinate dalla località
    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            latitudeInput.value = '';
            longitudeInput.value = '';
            geolocationMessageDiv.textContent = '';
            geolocationMessageDiv.className = 'message';
            return;
        }

        geolocationMessageDiv.textContent = 'Searching for coordinates for the location...';
        geolocationMessageDiv.className = 'message info';

        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': NOMINATIM_USER_AGENT
                }
            });

            if (!response.ok) {
                throw new Error(`Error searching for coordinates: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                // Converti in float e formatta per evitare troppe decimali
                latitudeInput.value = parseFloat(firstResult.lat).toFixed(6); 
                longitudeInput.value = parseFloat(firstResult.lon).toFixed(6);
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

    // Listener per la ricerca delle coordinate quando l'utente esce dal campo località
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Listener per la sottomissione del form
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        messageDiv.textContent = 'Adding event...';
        messageDiv.className = 'message info';

        const eventId = generateUniqueId();
        const eventName = document.getElementById('eventName').value;
        const eventLocation = eventLocationInput.value;
        const eventStartDate = document.getElementById('eventStartDate').value;
        const eventEndDate = document.getElementById('eventEndDate').value;
        const eventDescription = document.getElementById('eventDescription').value;
        const eventLink = document.getElementById('eventLink').value;
        const eventType = eventTypeInput.value; // Valore selezionato dal dropdown
        const eventGender = eventGenderInput.value; // Valore selezionato dal dropdown

        // ***** PUNTO CRUCIALE: Conversione di Latitude e Longitude in numero *****
        let latitude = parseFloat(latitudeInput.value);
        let longitude = parseFloat(longitudeInput.value);

        // Se parseFloat restituisce NaN (es. il campo era vuoto o non un numero valido), imposta a null
        if (isNaN(latitude)) latitude = null;
        if (isNaN(longitude)) longitude = null;
        // *************************************************************************

        const newEvent = {
            id: eventId,
            name: eventName,
            startDate: eventStartDate,
            endDate: eventEndDate === '' ? null : eventEndDate, // Salva null se la data di fine è vuota
            location: eventLocation,
            latitude: latitude, // Ora è garantito essere un numero o null
            longitude: longitude, // Ora è garantito essere un numero o null
            type: eventType,
            gender: eventGender,
            description: eventDescription === '' ? null : eventDescription, // Salva null se la descrizione è vuota
            link: eventLink === '' ? null : eventLink, // Salva null se il link è vuoto
            featured: false // Default a false per i nuovi eventi
        };

        try {
            // Primo, leggi il bin esistente
            const readResponse = await fetch(JSONBIN_EVENTS_WRITE_URL + '/latest', {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                // Se il bin non esiste o c'è un errore di lettura, prova a creare un nuovo bin
                // Questo è utile per la prima volta che si aggiunge un evento
                console.warn("Existing bin not found or error reading, attempting to create a new one.");
                // Potrebbe essere un 404 se il bin è vuoto o non esiste
                if (readResponse.status === 404) {
                     // Inizializza con il nuovo evento e prova a creare
                     await createNewBin([newEvent]);
                     messageDiv.textContent = 'Event added successfully! (New bin created)';
                     messageDiv.className = 'message success';
                     addEventForm.reset();
                     logActivity('ADD_EVENT', newEvent);
                     return;
                } else {
                    throw new Error(`Error reading existing events: ${readResponse.status} - ${await readResponse.text()}`);
                }
            }

            // Se la lettura ha successo, ottieni i dati esistenti
            const existingData = await readResponse.json();
            let events = existingData.record || [];

            // Aggiungi il nuovo evento all'array esistente
            events.push(newEvent);

            // Scrivi l'array aggiornato nel bin (sovrascrivendo)
            const writeResponse = await fetch(JSONBIN_EVENTS_WRITE_URL, {
                method: 'PUT', // Usa PUT per sovrascrivere l'intero bin
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Non aggiornare i metadati del bin
                },
                body: JSON.stringify(events)
            });

            if (!writeResponse.ok) {
                const errorText = await writeResponse.text();
                throw new Error(`Error adding event: ${writeResponse.status} - ${errorText}`);
            }

            messageDiv.textContent = `Event '${eventName}' added successfully! ID: ${eventId}`;
            messageDiv.className = 'message success';
            addEventForm.reset(); // Resetta il form dopo l'aggiunta
            geolocationMessageDiv.textContent = ''; // Pulisci anche il messaggio di geolocalizzazione
            latitudeInput.value = ''; // Pulisci i campi lat/lon
            longitudeInput.value = '';

            logActivity('ADD_EVENT', newEvent);

        } catch (error) {
            console.error('Error adding event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    });

    // Funzione per creare un nuovo bin (utile se non esiste ancora)
    async function createNewBin(dataToSave) {
        const createResponse = await fetch('https://api.jsonbin.io/v3/b', { // Endpoint per creare un nuovo bin
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY,
                'X-Bin-Name': 'laxmap_events_bin', // Nome per il nuovo bin
                'private': false // Imposta a true se vuoi che sia privato
            },
            body: JSON.stringify(dataToSave)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create new bin: ${createResponse.status} - ${errorText}`);
        }

        const newBinData = await createResponse.json();
        console.log('New bin created with ID:', newBinData.metadata.id);
        // Potresti voler salvare il nuovo ID del bin nel tuo config.js o gestirlo in altro modo
        // Per ora, assumiamo che JSONBIN_EVENTS_WRITE_URL punti sempre al bin corretto.
        // Questa funzione è più un fallback per il primo evento.
    }
});