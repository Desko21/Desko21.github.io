// add-event.js

import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_WRITE_URL,
    NOMINATIM_USER_AGENT 
} from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('add-event.js loaded.');

    // --- HTML Element References ---
    const addEventForm = document.getElementById('addEventForm');
    const messageDiv = document.getElementById('message');
    const geolocationMessageDiv = document.getElementById('geolocationMessage');
    const eventLocationInput = document.getElementById('eventLocation');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const submitButton = document.getElementById('addEventButton'); 

    // Dropdowns for Game Type and Gender
    const eventTypeInput = document.getElementById('eventType');
    const eventGenderInput = document.getElementById('eventGender');

    // --- Data for Select Options (MUST MATCH edit-event.js and script.js) ---
    const gameTypes = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const genders = ['Men', 'Women', 'Both', 'Mixed', 'Other'];

    // --- Function to populate dropdowns ---
    function populateDropdown(selectElement, options) {
        selectElement.innerHTML = ''; // Clear existing options
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase(); // Value will be lowercase
            option.textContent = optionText;         // Displayed text will be title case
            selectElement.appendChild(option);
        });
    }

    // Populate dropdowns on page load
    populateDropdown(eventTypeInput, gameTypes);
    populateDropdown(eventGenderInput, genders);

    // --- Utility Functions ---

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

    // Function to generate a unique ID
    function generateUniqueId() {
        return 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Function to get coordinates from location
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

    // Function to create a new bin (useful if it doesn't exist yet)
    async function createNewBin(dataToSave) {
        const createResponse = await fetch('https://api.jsonbin.io/v3/b', { // Endpoint to create a new bin
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY,
                'X-Bin-Name': 'laxmap_events_bin', // Name for the new bin
                'private': false // Set to true if you want it to be private
            },
            body: JSON.stringify(dataToSave)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create new bin: ${createResponse.status} - ${errorText}`);
        }

        const newBinData = await createResponse.json();
        console.log('New bin created with ID:', newBinData.metadata.id);
    }

    // --- Event Listeners ---

    // Listener for coordinate lookup when the user leaves the location field
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Listener for form submission
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable button and show loading message
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
        messageDiv.textContent = 'Adding event...';
        messageDiv.className = 'message info';

        try {
            const eventId = generateUniqueId();
            const eventName = document.getElementById('eventName').value;
            const eventLocation = eventLocationInput.value;
            const eventStartDate = document.getElementById('eventStartDate').value;
            const eventEndDate = document.getElementById('eventEndDate').value;
            const eventDescription = document.getElementById('eventDescription').value;
            const eventLink = document.getElementById('eventLink').value;
            const eventType = eventTypeInput.value;
            const eventGender = eventGenderInput.value;
            // --- MODIFICATION START ---
            // Get the value from the new contact email input field
            const contactEmail = document.getElementById('contactEmail').value;
            // --- MODIFICATION END ---


            let latitude = parseFloat(latitudeInput.value);
            let longitude = parseFloat(longitudeInput.value);

            if (isNaN(latitude)) latitude = null;
            if (isNaN(longitude)) longitude = null;

            const newEvent = {
                id: eventId,
                name: eventName,
                startDate: eventStartDate,
                endDate: eventEndDate === '' ? null : eventEndDate,
                location: eventLocation,
                latitude: latitude,
                longitude: longitude,
                type: eventType,
                gender: eventGender,
                description: eventDescription === '' ? null : eventDescription,
                link: eventLink === '' ? null : eventLink,
                featured: false,
                // --- MODIFICATION START ---
                // Add the contactEmail to the new event object
                contactEmail: contactEmail === '' ? null : contactEmail // Save as null if empty
                // --- MODIFICATION END ---
            };

            const readResponse = await fetch(JSONBIN_EVENTS_WRITE_URL + '/latest', {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });

            if (!readResponse.ok) {
                if (readResponse.status === 404) {
                    await createNewBin([newEvent]);
                    messageDiv.textContent = 'Event added successfully! (New bin created)';
                    messageDiv.className = 'message success';
                } else {
                    throw new Error(`Error reading existing events: ${readResponse.status} - ${await readResponse.text()}`);
                }
            } else {
                const existingData = await readResponse.json();
                let events = existingData.record || [];
                events.push(newEvent);

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
                    throw new Error(`Error adding event: ${writeResponse.status} - ${errorText}`);
                }

                messageDiv.textContent = `Event '${eventName}' added successfully! ID: ${eventId}`;
                messageDiv.className = 'message success';
            }

            addEventForm.reset();
            geolocationMessageDiv.textContent = '';
            latitudeInput.value = '';
            longitudeInput.value = '';

            logActivity('Event Added', newEvent);

        } catch (error) {
            console.error('Error adding event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        } finally {
            // Re-enable the button and restore text, regardless of success or error
            submitButton.disabled = false;
            submitButton.textContent = 'Add Event';
        }
    });
});