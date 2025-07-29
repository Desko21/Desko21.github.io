document.addEventListener('DOMContentLoaded', () => {
    console.log('delete-event.js loaded.');

    // JSONBin.io configuration
    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // Your actual Bin ID
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;
    const JSONBIN_UPDATE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    const eventListDiv = document.getElementById('event-list');
    const messageDiv = document.getElementById('message');

    let allEvents = []; // To store all events after fetching

    async function loadEvents() {
        try {
            const response = await fetch(JSONBIN_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error reading bin:", response.status, errorText);
                eventListDiv.innerHTML = '<p class="error">Error loading events. Please check console.</p>';
                return;
            }

            const data = await response.json();
            allEvents = data.record || []; // Store events
            console.log('All events loaded:', allEvents);

            displayEvents(allEvents);

        } catch (error) {
            console.error('An unexpected error occurred while loading events:', error);
            eventListDiv.innerHTML = '<p class="error">An unexpected error occurred. Please try again.</p>';
        }
    }

    function displayEvents(events) {
        eventListDiv.innerHTML = ''; // Clear previous list

        if (events.length === 0) {
            eventListDiv.innerHTML = '<p>No events available to manage.</p>';
            return;
        }

        // Sort events by creation date (newest first)
        events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item'; 

            const featuredStatus = event.featured ? '<span style="color: green; font-weight: bold;">(Featured)</span>' : '';
            
            let featuredButton = '';
            // Aggiungi la stellina al pulsante "Remove Featured"
            if (event.featured) {
                featuredButton = `<button class="unfeature-button" data-id="${event.createdAt}">Remove Featured <span class="star-icon">★</span></button>`;
            } else {
                featuredButton = `<button class="feature-placeholder-button" disabled>Not Featured</button>`;
            }

            let sixesIconHtml = '';
            // Aggiungi l'icona "6" se il formato è "sixes"
            if (event.format && event.format.toLowerCase() === 'sixes') {
                sixesIconHtml = '<span class="sixes-icon">6</span>';
            }

            eventItem.innerHTML = `
                <h3>${event.name} ${featuredStatus}</h3>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <p>${event.description.substring(0, 100)}...</p>
                <div class="event-actions">
                    <button class="delete-button" data-id="${event.createdAt}">Delete Event</button>
                    ${featuredButton}
                    ${sixesIconHtml} </div>
            `;
            eventListDiv.appendChild(eventItem);
        });

        // Add event listeners
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.id;
                deleteEvent(eventId);
            });
        });

        document.querySelectorAll('.unfeature-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.id;
                updateEventFeaturedStatus(eventId, false); // Set featured to false
            });
        });
    }

    async function deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }

        const eventIndex = allEvents.findIndex(e => e.createdAt === eventId);
        if (eventIndex > -1) {
            allEvents.splice(eventIndex, 1); // Remove from local array
            await updateBin(allEvents); // Update JSONBin.io
            showMessage('Event deleted successfully!', 'success');
            displayEvents(allEvents); // Re-display events
        } else {
            showMessage('Event not found.', 'error');
        }
    }

    async function updateEventFeaturedStatus(eventId, isFeatured) {
        const eventIndex = allEvents.findIndex(e => e.createdAt === eventId);
        if (eventIndex > -1) {
            allEvents[eventIndex].featured = isFeatured; // Update featured status
            await updateBin(allEvents); // Update JSONBin.io
            showMessage(`Event featured status updated to ${isFeatured}.`, 'success');
            displayEvents(allEvents); // Re-display events
        } else {
            showMessage('Event not found for featured status update.', 'error');
        }
    }

    async function updateBin(data) {
        try {
            const response = await fetch(JSONBIN_UPDATE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error updating bin:", response.status, errorText);
                throw new Error(`Failed to update bin: ${response.statusText}`);
            }
            console.log('Bin updated successfully.');
        } catch (error) {
            console.error('Error in updateBin:', error);
            showMessage('Failed to save changes to the server.', 'error');
            throw error; // Re-throw to be caught by calling function if needed
        }
    }

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000); 
    }

    // Initial load of events when the page loads
    loadEvents();
});