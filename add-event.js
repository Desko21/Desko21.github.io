document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    // --- JSONBin.io Configuration ---
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // YOUR MASTER KEY!
    const JSONBIN_EVENTS_READ_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66/latest'; // Events Bin ID
    const JSONBIN_EVENTS_WRITE_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66';
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Logs Bin ID
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    // --- HTML Element References ---
    const messageDiv = document.getElementById('message');
    const eventForm = document.getElementById('eventForm');
    const eventLocationInput = document.getElementById('eventLocation'); // City/Location field
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // --- Utility Functions ---

    // Function to generate a UUID v4 (Universally Unique Identifier)
    // This is a common and robust method to create unique IDs on the client side.
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Function to log activities
    // Now includes IP address retrieval and event ID.
    async function logActivity(action, eventDetails) {
        const timestamp = new Date().toISOString();
        let userIp = 'N/A'; // Default value in case fetching fails

        try {
            // Attempt to retrieve the user's public IP address
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
            ipAddress: userIp, // Add the IP address to the log
            event: {
                id: eventDetails.id, // Now we use our generated ID
                name: eventDetails.name,
                location: eventDetails.location,
            }
        };

        try {
            // Load existing logs
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

            // Add the new log
            existingLogs.push(logEntry);

            // Write the entire updated log array
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
    // Uses OpenStreetMap Nominatim.
    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            latitudeInput.value = '';
            longitudeInput.value = '';
            return;
        }

        messageDiv.textContent = 'Searching for coordinates for the location...';
        messageDiv.className = 'message info';

        try {
            // encodeURIComponent is crucial for handling spaces and special characters in the URL
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    // It's good practice to include an identifying User-Agent
                    // CHANGE THIS TO YOUR APP NAME AND YOUR EMAIL!
                    'User-Agent': 'EventApp/1.0 (your-email@example.com)' 
                }
            });

            if (!response.ok) {
                throw new Error(`Error searching for coordinates: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                latitudeInput.value = parseFloat(firstResult.lat).toFixed(6); // Format to 6 decimal places
                longitudeInput.value = parseFloat(firstResult.lon).toFixed(6); // Format to 6 decimal places
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

    // Trigger geocoding when the "Location" field loses focus
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Handle form submission
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        await saveEvent();
    });

    // --- Main Functions ---

    // Function to save a new event
    async function saveEvent() {
        messageDiv.textContent = 'Saving event...';
        messageDiv.className = 'message info';

        const newEventId = generateUUID(); // GENERATE A UNIQUE ID FOR THE NEW EVENT

        const eventData = {
            id: newEventId, // Include your unique ID in the event object
            name: document.getElementById('eventName').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            location: document.getElementById('eventLocation').value,
            description: document.getElementById('eventDescription').value,
            latitude: latitudeInput.value,
            longitude: longitudeInput.value,
            type: document.getElementById('eventType').value,
            image: document.getElementById('eventImage').value,
            featured: document.getElementById('isFeatured').checked
            // The 'createdAt' field will be automatically added by JSONBin.io but will not be your primary ID.
        };

        try {
            // STEP 1: Load all existing events from the bin
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || []; // Ensure it's an array, even if empty

            // Add the new event to the array
            events.push(eventData);

            // STEP 2: Write the entire updated array back to the JSONBin.io bin
            const writeResponse = await fetch(JSONBIN_EVENTS_WRITE_URL, {
                method: 'PUT', // PUT overwrites the bin content
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Meta': 'false' // Do not update bin metadata, only its content
                },
                body: JSON.stringify(events) // Send the entire updated events array
            });

            if (!writeResponse.ok) {
                const errorText = await writeResponse.text();
                throw new Error(`Error saving the event: ${writeResponse.status} - ${errorText}`);
            }

            // At this point, the event has been successfully saved.
            // The ID to display is the one we generated.
            messageDiv.textContent = `Event '${eventData.name}' added successfully! Event ID: ${newEventId}`;
            messageDiv.className = 'message success';
            eventForm.reset(); // Reset the form to allow entering a new event

            // Log the event addition action, passing the eventData object with the new ID
            logActivity('ADD_EVENT', eventData); 

        } catch (error) {
            console.error('Error:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }
});