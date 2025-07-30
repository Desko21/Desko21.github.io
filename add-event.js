
// Importa le costanti dal file config.js
import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_BIN_ID, // Potrebbe non essere necessario se usi solo JSONBIN_LOGS_WRITE_URL
    JSONBIN_LOGS_WRITE_URL,
    NOMINATIM_USER_AGENT 
} from './config.js'; // Il percorso è relativo a questo file .js

document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    // --- JSONBin.io Configuration ---
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // YOUR MASTER KEY!
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Logs Bin ID
	const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // Your actual Bin ID
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;
	const JSONBIN_EVENTS_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`; // Events Bin ID
    const JSONBIN_EVENTS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
	

    // --- HTML Element References ---
    const messageDiv = document.getElementById('message');
    const eventForm = document.getElementById('eventForm'); // Make sure this ID exists in HTML
    const eventLocationInput = document.getElementById('eventLocation'); // Location field
    const latitudeInput = document.getElementById('latitude'); // Latitude field
    const longitudeInput = document.getElementById('longitude'); // Longitude field

    // --- Utility Functions ---

    // Function to generate a UUID v4 (Universally Unique Identifier)
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Function to log activities
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

    // Function for geocoding from location to coordinates (latitude/longitude)
    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            latitudeInput.value = ''; // Ensure latitudeInput is correctly referenced
            longitudeInput.value = ''; // Ensure longitudeInput is correctly referenced
            return;
        }

        messageDiv.textContent = 'Searching for coordinates for the location...';
        messageDiv.className = 'message info';

        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': 'LacrosseEventApp/1.0 (your-email@example.com)' // CHANGE THIS TO YOUR APP NAME AND YOUR EMAIL!
                }
            });

            if (!response.ok) {
                throw new Error(`Error searching for coordinates: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                latitudeInput.value = parseFloat(firstResult.lat).toFixed(6);
                longitudeInput.value = parseFloat(firstResult.lon).toFixed(6);
                messageDiv.textContent = 'Coordinates found!';
                messageDiv.className = 'message success';
            } else {
                latitudeInput.value = '';
                longitudeInput.value = '';
                messageDiv.textContent = 'Location not found, please enter coordinates manually.';
                messageDiv.className = 'message warning';
            }
        } catch (error) {
            console.error('Error during geocoding:', error);
            messageDiv.textContent = `Geocoding error: ${error.message}. Please enter coordinates manually.`;
            messageDiv.className = 'message error';
        }
    }

    // --- Event Listeners ---

    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEvent();
    });

    // --- Main Functions ---

    async function saveEvent() {
        messageDiv.textContent = 'Saving event...';
        messageDiv.className = 'message info';

        const newEventId = generateUUID();

        // COLLECT ALL FORM DATA, INCLUDING NEW FIELDS
        const eventData = {
            id: newEventId,
            name: document.getElementById('eventName').value,
            location: document.getElementById('eventLocation').value,
            latitude: latitudeInput.value,
            longitude: longitudeInput.value,
            type: document.getElementById('eventType').value, // Game Type
            gender: document.getElementById('eventGender').value, // NEW FIELD: Gender
            startDate: document.getElementById('eventStartDate').value, // NEW FIELD: Start Date
            endDate: document.getElementById('eventEndDate').value, // NEW FIELD: End Date
            description: document.getElementById('eventDescription').value,
            link: document.getElementById('eventLink').value, // NEW FIELD: More Info Link
            // Ensure 'isFeatured' exists in your HTML if you uncomment this line
            // featured: document.getElementById('isFeatured') ? document.getElementById('isFeatured').checked : false 
        };

        try {
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];

            events.push(eventData);

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
                throw new Error(`Error saving the event: ${writeResponse.status} - ${errorText}`);
            }

            messageDiv.textContent = `Event '${eventData.name}' added successfully! Event ID: ${newEventId}`;
            messageDiv.className = 'message success';
            eventForm.reset();

            logActivity('ADD_EVENT', eventData); 

        } catch (error) {
            console.error('Error:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }
});