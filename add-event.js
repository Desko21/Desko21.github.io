document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // IL TUO BIN ID PRINCIPALE DEGLI EVENTI
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;
    const JSONBIN_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    // DETTAGLI PER IL BIN DI LOG - AGGIORNATO CON IL TUO ID
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b';
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    const addEventForm = document.getElementById('addEventForm');
    const addEventMessageDiv = document.getElementById('addEventMessage');

    // Funzione per inviare i log
    async function logAction(action, eventDetails) {
        try {
            // Ottieni i log attuali
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

            // Aggiungi il nuovo log
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                event: eventDetails
            };
            currentLogs.push(logEntry);

            // Scrivi l'array di log aggiornato
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


    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        addEventMessageDiv.textContent = 'Adding event...';
        addEventMessageDiv.className = 'message info';

        const newEvent = {
            name: document.getElementById('eventName').value,
            description: document.getElementById('eventDescription').value,
            location: document.getElementById('eventLocation').value,
            latitude: parseFloat(document.getElementById('eventLatitude').value),
            longitude: parseFloat(document.getElementById('eventLongitude').value),
            startDate: document.getElementById('eventStartDate').value,
            gameType: document.getElementById('gameType').value,
            gender: document.getElementById('gender').value,
            featured: document.getElementById('isFeatured').checked,
            link: document.getElementById('eventLink').value,
            createdAt: new Date().toISOString() // Data di creazione per ID univoco
        };

        try {
            // Ottieni gli eventi attuali
            const responseRead = await fetch(JSONBIN_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            let currentEvents = [];
            if (responseRead.ok) {
                const data = await responseRead.json();
                currentEvents = data.record || [];
            } else {
                console.warn('Could not read existing events, starting new events array.');
            }

            currentEvents.push(newEvent);

            // Invia l'array di eventi aggiornato
            const responseWrite = await fetch(JSONBIN_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(currentEvents)
            });

            if (!responseWrite.ok) {
                const errorText = await responseWrite.text();
                throw new Error(`Failed to add event: ${responseWrite.status} - ${errorText}`);
            }

            addEventMessageDiv.textContent = 'Event added successfully!';
            addEventMessageDiv.className = 'message success';
            addEventForm.reset(); // Pulisce il modulo

            // Log dell'azione
            await logAction('Event Added', { 
                name: newEvent.name, 
                createdAt: newEvent.createdAt, 
                location: newEvent.location 
            });

        } catch (error) {
            console.error('Error adding event:', error);
            addEventMessageDiv.textContent = `Error: ${error.message}`;
            addEventMessageDiv.className = 'message error';
        }
    });
});
