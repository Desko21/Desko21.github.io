document.addEventListener('DOMContentLoaded', () => {
    console.log('delete-event.js loaded.');

    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // IL TUO BIN ID PRINCIPALE DEGLI EVENTI
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;
    const JSONBIN_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    // DETTAGLI PER IL BIN DI LOG - AGGIORNATO CON IL TUO ID
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b';
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

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

    async function toggleFeaturedStatus(event) {
        const createdAt = event.target.dataset.createdAt;
        const newFeaturedStatus = event.target.checked;
        
        // Trova l'evento originale per i dettagli nel log
        const originalEvent = allEvents.find(e => e.createdAt === createdAt);

        messageDiv.textContent = 'Updating featured status...';
        messageDiv.className = 'message info';

        try {
            const eventIndex = allEvents.findIndex(e => e.createdAt === createdAt);
            if (eventIndex === -1) {
                throw new Error('Event not found for updating featured status.');
            }
            allEvents[eventIndex].featured = newFeaturedStatus;

            const response = await fetch(JSONBIN_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(allEvents)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update featured status: ${response.status} - ${errorText}`);
            }

            messageDiv.textContent = 'Featured status updated successfully!';
            messageDiv.className = 'message success';
            displayEvents();

            // Log dell'azione
            await logAction(
                newFeaturedStatus ? 'Event Featured' : 'Event Unfeatured', 
                { 
                    name: originalEvent.name, 
                    createdAt: originalEvent.createdAt, 
                    location: originalEvent.location 
                }
            );

        } catch (error) {
            console.error('Error toggling featured status:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
            event.target.checked = !newFeaturedStatus;
        }
    }

    async function deleteEvent(event) {
        const createdAt = event.target.dataset.createdAt;

        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }
        
        // Trova l'evento originale per i dettagli nel log prima di eliminarlo
        const originalEvent = allEvents.find(e => e.createdAt === createdAt);

        messageDiv.textContent = 'Deleting event...';
        messageDiv.className = 'message info';

        try {
            const updatedEvents = allEvents.filter(e => e.createdAt !== createdAt);

            const response = await fetch(JSONBIN_WRITE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false'
                },
                body: JSON.stringify(updatedEvents)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete event: ${response.status} - ${errorText}`);
            }

            allEvents = updatedEvents;
            displayEvents();
            messageDiv.textContent = 'Event deleted successfully!';
            messageDiv.className = 'message success';

            // Log dell'azione
            await logAction('Event Removed', { 
                name: originalEvent.name, 
                createdAt: originalEvent.createdAt, 
                location: originalEvent.location 
            });


        } catch (error) {
            console.error('Error deleting event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }

    loadEvents();
});
