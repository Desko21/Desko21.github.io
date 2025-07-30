// Importa le costanti dal file config.js
import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_BIN_ID, // Potrebbe non essere necessario se usi solo JSONBIN_LOGS_WRITE_URL
    JSONBIN_LOGS_WRITE_URL,
	JSONBIN_LOGS_READ_URL,
    NOMINATIM_USER_AGENT 
} from './config.js'; // Il percorso è relativo a questo file .js

document.addEventListener('DOMContentLoaded', () => {
    console.log('delete-event.js loaded.');

    const messageDiv = document.getElementById('message');
    const eventsTableBody = document.getElementById('eventsTableBody');

    let allEvents = [];

    // Funzione per inviare i log
    async function logAction(action, eventDetails) {
        try {
            const responseRead = await fetch(`${JSONBIN_LOGS_WRITE_URL}/latest`, {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });
            let currentLogs = [];
            if (responseRead.ok) {
                const data = await responseRead.json();
                currentLogs = data.record || [];
            } else {
                console.warn('Could not read existing logs, starting new log array.');
            }

            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                event: eventDetails
            };
            currentLogs.push(logEntry);

            const responseWrite = await fetch(JSONBIN_LOGS_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(currentLogs)
            });

            if (!responseWrite.ok) {
                const errorText = await responseWrite.text();
                console.error(`Error logging action: ${responseWrite.status} - ${errorText}`);
            } else {
                console.log(`Action logged: ${action}`);
            }
        } catch (error) {
            console.error('An unexpected error occurred during logging:', error);
        }
    }

    async function loadEvents() {
        messageDiv.textContent = 'Loading events...';
        messageDiv.className = 'message info';
        try {
            const response = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error reading bin:", response.status, errorText);
                messageDiv.textContent = `Error loading events: ${response.status} - ${errorText}`;
                messageDiv.className = 'message error';
                return;
            }

            const data = await response.json();
            allEvents = data.record || [];
            console.log('Events loaded:', allEvents);
            displayEvents();
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        } catch (error) {
            console.error('An unexpected error occurred:', error);
            messageDiv.textContent = 'An unexpected error occurred while loading events.';
            messageDiv.className = 'message error';
        }
    }

    function displayEvents() {
        eventsTableBody.innerHTML = '';

        if (allEvents.length === 0) {
            eventsTableBody.innerHTML = '<tr><td colspan="7">No events found.</td></tr>';
            return;
        }

        allEvents.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return new Date(a.startDate) - new Date(b.startDate);
        });

        allEvents.forEach(event => {
            const row = eventsTableBody.insertRow();
            const formattedDate = new Date(event.startDate).toLocaleDateString();

            row.insertCell().textContent = event.name;
            row.insertCell().textContent = formattedDate;
            row.insertCell().textContent = event.location;
            row.insertCell().textContent = event.gameType || 'N/A';
            row.insertCell().textContent = event.gender || 'N/A';

            const featuredCell = row.insertCell();
            const featuredToggle = document.createElement('input');
            featuredToggle.type = 'checkbox';
            featuredToggle.checked = event.featured || false;
            featuredToggle.dataset.createdAt = event.createdAt;
            featuredToggle.addEventListener('change', toggleFeaturedStatus);
            featuredCell.appendChild(featuredToggle);

            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-button';
            deleteButton.dataset.createdAt = event.createdAt;
            deleteButton.addEventListener('click', deleteEvent);
            deleteCell.appendChild(deleteButton);
        });
    }

   // Funzione per aggiornare lo stato "featured" di un evento
async function toggleFeaturedStatus(eventId, isFeatured) {
    console.log('toggleFeaturedStatus chiamata.');
    console.log('  ID Evento da trovare (passato dall\'HTML):', eventId); // <<< AGGIUNGI QUESTO LOG
    console.log('  Nuovo stato featured:', isFeatured);             // <<< AGGIUNGI QUESTO LOG

    try {
        // Leggi gli eventi attuali dal bin
        const response = await fetch(JSONBIN_EVENTS_READ_URL, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
        });

        if (!response.ok) {
            throw new Error(`Errore nella lettura degli eventi per l'aggiornamento dello stato featured: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        let events = data.record || [];

        console.log('  Totale eventi caricati da JSONBin.io:', events.length); // <<< AGGIUNGI QUESTO LOG
        // Opzionale: Logga tutti gli ID degli eventi caricati per confrontare
        // console.log('  ID dagli eventi caricati:', events.map(event => event.id)); // <<< DECOMMENTA PER DEBUG PIÙ APPROFONDITO

        const eventIndex = events.findIndex(event => event.id === eventId);

        if (eventIndex === -1) {
            // Questa è la riga che attualmente genera l'errore (o simile)
            console.error(`  ERRORE: Evento con ID "${eventId}" non trovato nei dati caricati.`); // <<< AGGIUNGI QUESTO LOG
            throw new Error('Evento non trovato per l\'aggiornamento dello stato featured.');
        }

        // Aggiorna lo stato featured
        events[eventIndex].featured = isFeatured;

        // ... (il resto della tua logica di salvataggio) ...

    } catch (error) {
        console.error('Errore durante l\'aggiornamento dello stato featured:', error);
        // Non rilanciare qui se vuoi gestire il messaggio di errore nell'UI
        // throw error;
    }
}

// ... (resto di delete-event.js) ...

// IMPORTANTE: Assicurati che questa parte del tuo codice recuperi correttamente l'eventId
// quando imposti gli event listener per i toggle featured.
// Questo è tipicamente fatto all'interno di un ciclo dove visualizzi gli eventi.
function displayEventsList(events) { // Assumendo che tu abbia una funzione simile
    // ... (pulisci la lista precedente) ...
    events.forEach(event => {
        // ... (crea gli elementi HTML per l'evento) ...

        const featureToggle = eventItem.querySelector('.feature-toggle'); // O qualsiasi selettore per la tua checkbox/pulsante
        if (featureToggle) {
            // Assicurati che questo attributo data sia impostato correttamente durante la creazione dell'HTML!
            featureToggle.dataset.eventId = event.id; // <<< RIGA CRUCIALE
            featureToggle.checked = event.featured;

            featureToggle.addEventListener('change', async (e) => {
                const eventIdFromHtml = e.target.dataset.eventId; // Recupera l'ID dall'elemento HTML
                const newFeaturedStatus = e.target.checked;
                console.log('  Checkbox cliccata. ID dell\'elemento HTML:', eventIdFromHtml); // <<< AGGIUNGI QUESTO LOG

                try {
                    await toggleFeaturedStatus(eventIdFromHtml, newFeaturedStatus);
                    // ... (messaggio di successo e loadEvents) ...
                } catch (error) {
                    // ... (messaggio di errore) ...
                }
            });
        }
        // ... (resto della creazione dell'elemento evento) ...
    });
}