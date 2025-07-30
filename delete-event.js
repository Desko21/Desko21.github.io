// delete-event.js

// Importa le costanti dal file di configurazione
import {
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    JSONBIN_EVENTS_WRITE_URL, // Necessario per scrivere i dati aggiornati (es. dopo delete o featured toggle)
    JSONBIN_LOGS_WRITE_URL
} from './config.js';

// Attendi che il DOM sia completamente caricato prima di eseguire lo script
document.addEventListener('DOMContentLoaded', () => {
    console.log('delete-event.js loaded.');

    // Riferimenti agli elementi HTML
    const eventsListDiv = document.getElementById('eventsList');
    const messageDiv = document.getElementById('message');

    // --- Funzioni Utility ---

    // Funzione per loggare le attività (come in add-event.js)
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
                // Aggiungi qui dettagli specifici per il log di 'featured'
                featuredStatus: action === 'TOGGLE_FEATURED' ? eventDetails.featuredStatus : undefined 
            }
        };

        try {
            // Leggi i log esistenti (se ci sono)
            const readLogResponse = await fetch(JSONBIN_LOGS_WRITE_URL + '/latest', {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });
            let existingLogs = [];
            if (readLogResponse.ok) {
                const logData = await readLogResponse.json();
                existingLogs = logData.record || [];
            } else {
                console.warn("Could not read existing logs or bin does not exist, starting fresh for logs.");
            }

            // Aggiungi la nuova entry di log
            existingLogs.push(logEntry);

            // Scrivi l'array aggiornato dei log nel bin
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

     async function toggleFeaturedStatus(eventId, newFeaturedStatus) {
        console.log('toggleFeaturedStatus chiamata.');
        console.log('  ID Evento da trovare (passato dall\'HTML):', eventId);
        console.log('  Nuovo stato featured:', newFeaturedStatus);

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

            console.log('  Totale eventi caricati da JSONBin.io:', events.length);

            // Trova l'indice dell'evento da aggiornare
            const eventIndex = events.findIndex(event => event.id === eventId);

            if (eventIndex === -1) {
                console.error(`  ERRORE: Evento con ID "${eventId}" non trovato nei dati caricati.`);
                throw new Error('Evento non trovato per l\'aggiornamento dello stato featured.');
            }

            // Salva il vecchio stato featured per il log
            const oldFeaturedStatus = events[eventIndex].featured;

            // Aggiorna lo stato 'featured' dell'evento
            events[eventIndex].featured = newFeaturedStatus;

            // Salva l'array aggiornato di eventi nel bin
            const writeResponse = await fetch(JSONBIN_EVENTS_WRITE_URL, {
                method: 'PUT', // Usa PUT per sovrascrivere l'intero bin
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(events)
            });

            if (!writeResponse.ok) {
                throw new Error(`Errore nel salvataggio dello stato featured nel bin: ${writeResponse.status} - ${await writeResponse.text()}`);
            }

            console.log(`Stato 'featured' per l'evento ${eventId} aggiornato a ${newFeaturedStatus}.`);
            
            // --- LOGGING SPECIFICO AGGIUNTO QUI ---
            const actionType = newFeaturedStatus ? 'FEATURED_ADDED' : 'FEATURED_REMOVED';
            logActivity(actionType, { 
                id: eventId, 
                name: events[eventIndex].name, 
                location: events[eventIndex].location, 
                // Puoi anche aggiungere oldFeaturedStatus e newFeaturedStatus se vuoi più dettagli nel log
                oldStatus: oldFeaturedStatus, 
                newStatus: newFeaturedStatus 
            });
            // --- FINE LOGGING SPECIFICO ---

            return true; // Operazione riuscita
        } catch (error) {
            console.error('Errore durante l\'aggiornamento dello stato featured:', error);
            messageDiv.textContent = `Errore nell'aggiornamento dello stato featured: ${error.message}`;
            messageDiv.className = 'message error';
            throw error; // Rilancia l'errore per gestione esterna
        }
    }


    // --- Funzione per eliminare un evento ---
    async function deleteEvent(eventId, eventName) { // Passiamo eventName per il log
        if (!confirm(`Sei sicuro di voler eliminare l'evento "${eventName}" (ID: ${eventId})?`)) {
            return; // L'utente ha annullato
        }

        messageDiv.textContent = `Eliminazione di "${eventName}"...`;
        messageDiv.className = 'message info';

        try {
            // Leggi tutti gli eventi
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });

            if (!readResponse.ok) {
                throw new Error(`Errore nella lettura degli eventi per l'eliminazione: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const data = await readResponse.json();
            let events = data.record || [];

            // Filtra per rimuovere l'evento con l'ID specificato
            const initialLength = events.length;
            const eventToDelete = events.find(event => event.id === eventId); // Trova l'evento per i dettagli di log
            events = events.filter(event => event.id !== eventId);

            if (events.length === initialLength) {
                throw new Error('Evento non trovato per l\'eliminazione.');
            }

            // Scrivi l'array filtrato (senza l'evento eliminato) nel bin
            const writeResponse = await fetch(JSONBIN_EVENTS_WRITE_URL, {
                method: 'PUT', // Usa PUT per sovrascrivere l'intero bin
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(events)
            });

            if (!writeResponse.ok) {
                throw new Error(`Errore nell'eliminazione dell'evento dal bin: ${writeResponse.status} - ${await writeResponse.text()}`);
            }

            messageDiv.textContent = `Evento "${eventName}" eliminato con successo!`;
            messageDiv.className = 'message success';
            
            // Logga l'azione di eliminazione
            if (eventToDelete) {
                logActivity('DELETE_EVENT', { id: eventToDelete.id, name: eventToDelete.name, location: eventToDelete.location });
            } else {
                logActivity('DELETE_EVENT', { id: eventId, name: eventName || 'Unknown Event' }); // Fallback
            }
            
            // Ricarica la lista per riflettere le modifiche
            loadEvents();

        } catch (error) {
            console.error('Errore durante l\'eliminazione dell\'evento:', error);
            messageDiv.textContent = `Errore: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }

    // --- Funzione per caricare e visualizzare gli eventi ---
    async function loadEvents() {
        messageDiv.textContent = 'Caricamento eventi...';
        messageDiv.className = 'message info';
        eventsListDiv.innerHTML = ''; // Pulisci la lista precedente

        try {
            const response = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                // Se il bin è vuoto o non esiste, potremmo ottenere un 404
                if (response.status === 404) {
                    messageDiv.textContent = 'Nessun evento trovato nel database.';
                    messageDiv.className = 'message warning';
                    return [];
                }
                throw new Error(`Errore nel caricamento degli eventi: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            const events = data.record || [];

            if (events.length === 0) {
                messageDiv.textContent = 'Nessun evento disponibile.';
                messageDiv.className = 'message warning';
            } else {
                messageDiv.textContent = ''; // Pulisci il messaggio
                displayEventsList(events);
            }
            return events; // Ritorna gli eventi caricati
        } catch (error) {
            console.error('Errore nel caricamento degli eventi:', error);
            messageDiv.textContent = `Errore nel caricamento degli eventi: ${error.message}`;
            messageDiv.className = 'message error';
            return [];
        }
    }

    // --- Funzione per visualizzare gli eventi in una lista ---
    function displayEventsList(events) {
        eventsListDiv.innerHTML = ''; // Pulisci la lista

        // Ordina gli eventi per data di inizio (dal più recente al più vecchio)
        // Se la data di fine è presente, ordina prima per quella, poi per data di inizio
        events.sort((a, b) => {
            const dateA = a.endDate ? new Date(a.endDate) : new Date(a.startDate);
            const dateB = b.endDate ? new Date(b.endDate) : new Date(b.startDate);
            return dateB - dateA; // Dal più recente al più vecchio
        });

        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = `
                <h3>${event.name}</h3>
                <p><strong>Località:</strong> ${event.location}</p>
                <p><strong>ID Evento:</strong> ${event.id}</p> <p><strong>Periodo:</strong> ${event.startDate} ${event.endDate ? ' - ' + event.endDate : ''}</p>
                <p><strong>Tipo:</strong> ${event.type || 'N/A'} | <strong>Genere:</strong> ${event.gender || 'N/A'}</p>
                <p><strong>Descrizione:</strong> ${event.description || 'N/A'}</p>
                ${event.link ? `<p><a href="${event.link}" target="_blank">Link Evento</a></p>` : ''}
                <div class="actions">
                    <label>
                        <input type="checkbox" class="feature-toggle" data-event-id="${event.id}" ${event.featured ? 'checked' : ''}> Featured
                    </label>
                    <button class="delete-button" data-event-id="${event.id}" data-event-name="${event.name}">Elimina</button>
                </div>
            `;
            eventsListDiv.appendChild(eventItem);

            // Aggiungi event listener per il toggle "featured"
            const featureToggle = eventItem.querySelector(`.feature-toggle[data-event-id="${event.id}"]`);
            if (featureToggle) {
                featureToggle.addEventListener('change', async (e) => {
                    const eventId = e.target.dataset.eventId;
                    const newFeaturedStatus = e.target.checked;
                    console.log('  Checkbox cliccata. ID dell\'elemento HTML:', eventId, 'Nuovo stato:', newFeaturedStatus);
                    try {
                        await toggleFeaturedStatus(eventId, newFeaturedStatus);
                        messageDiv.textContent = `Stato 'featured' per '${event.name}' aggiornato!`;
                        messageDiv.className = 'message success';
                    } catch (error) {
                        // Il messaggio di errore è già gestito all'interno di toggleFeaturedStatus
                    }
                });
            }

            // Aggiungi event listener per il pulsante Elimina
            const deleteButton = eventItem.querySelector(`.delete-button[data-event-id="${event.id}"]`);
            if (deleteButton) {
                deleteButton.addEventListener('click', async (e) => {
                    const eventId = e.target.dataset.eventId;
                    const eventName = e.target.dataset.eventName; // Recupera il nome per la conferma
                    await deleteEvent(eventId, eventName);
                });
            }
        });
    }

    // --- Carica gli eventi all'avvio della pagina ---
    loadEvents();
});