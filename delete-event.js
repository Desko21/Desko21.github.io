document.addEventListener('DOMContentLoaded', () => {
    console.log('delete-event.js loaded.');

    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // Assicurati che questo sia il tuo ID del bin
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; 
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // Assicurati che questa sia la tua Master Key
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;
    const JSONBIN_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`; // URL per PUT/aggiornare l'intero bin

    const messageDiv = document.getElementById('message');
    const eventsTableBody = document.getElementById('eventsTableBody');

    let allEvents = []; // Array per memorizzare tutti gli eventi caricati

    async function loadEvents() {
        messageDiv.textContent = 'Loading events...';
        messageDiv.className = 'message info';
        try {
            const response = await fetch(JSONBIN_READ_URL, {
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
            allEvents = data.record || []; // Assumiamo che gli eventi siano nell'array 'record'
            console.log('Events loaded:', allEvents);
            displayEvents();
            messageDiv.textContent = ''; // Clear message on success
            messageDiv.className = 'message';
        } catch (error) {
            console.error('An unexpected error occurred:', error);
            messageDiv.textContent = 'An unexpected error occurred while loading events.';
            messageDiv.className = 'message error';
        }
    }

    function displayEvents() {
        eventsTableBody.innerHTML = ''; // Pulisce la tabella prima di riempirla

        if (allEvents.length === 0) {
            eventsTableBody.innerHTML = '<tr><td colspan="7">No events found.</td></tr>'; // Aggiornato colspan
            return;
        }

        // Ordina gli eventi per data, i featured prima
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

            // Cella per il toggle Featured
            const featuredCell = row.insertCell();
            const featuredToggle = document.createElement('input');
            featuredToggle.type = 'checkbox';
            featuredToggle.checked = event.featured || false; // Imposta lo stato iniziale
            featuredToggle.dataset.createdAt = event.createdAt; // Usa createdAt come ID univoco
            featuredToggle.addEventListener('change', toggleFeaturedStatus);
            featuredCell.appendChild(featuredToggle);

            // Cella per il pulsante Delete
            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-button';
            deleteButton.dataset.createdAt = event.createdAt; // Usa createdAt come ID univoco
            deleteButton.addEventListener('click', deleteEvent);
            deleteCell.appendChild(deleteButton);
        });
    }

    async function toggleFeaturedStatus(event) {
        const createdAt = event.target.dataset.createdAt;
        const newFeaturedStatus = event.target.checked;

        messageDiv.textContent = 'Updating featured status...';
        messageDiv.className = 'message info';

        try {
            // Trova l'evento nell'array locale e aggiorna il suo stato
            const eventIndex = allEvents.findIndex(e => e.createdAt === createdAt);
            if (eventIndex === -1) {
                throw new Error('Event not found for updating featured status.');
            }
            allEvents[eventIndex].featured = newFeaturedStatus;

            // Invia l'intero array aggiornato a JSONBin.io
            const response = await fetch(JSONBIN_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Non aggiornare i metadati del bin
                },
                body: JSON.stringify(allEvents)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update featured status: ${response.status} - ${errorText}`);
            }

            messageDiv.textContent = 'Featured status updated successfully!';
            messageDiv.className = 'message success';
            // Non ricaricare gli eventi, dato che allEvents è già aggiornato e displayEvents riordinerà
            displayEvents(); 

        } catch (error) {
            console.error('Error toggling featured status:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
            // Ripristina lo stato del checkbox se l'aggiornamento fallisce
            event.target.checked = !newFeaturedStatus; 
        }
    }

    async function deleteEvent(event) {
        const createdAt = event.target.dataset.createdAt;

        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }

        messageDiv.textContent = 'Deleting event...';
        messageDiv.className = 'message info';

        try {
            // Filtra l'evento da eliminare dall'array locale
            const updatedEvents = allEvents.filter(e => e.createdAt !== createdAt);

            // Invia l'array aggiornato (senza l'evento eliminato) a JSONBin.io
            const response = await fetch(JSONBIN_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Non aggiornare i metadati del bin
                },
                body: JSON.stringify(updatedEvents)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete event: ${response.status} - ${errorText}`);
            }

            allEvents = updatedEvents; // Aggiorna l'array globale degli eventi
            displayEvents(); // Ridisplay gli eventi aggiornati
            messageDiv.textContent = 'Event deleted successfully!';
            messageDiv.className = 'message success';

        } catch (error) {
            console.error('Error deleting event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }

    // Carica gli eventi all'avvio della pagina
    loadEvents();
});
