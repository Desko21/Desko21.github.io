// edit-event.js

import {
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_WRITE_URL,
    NOMINATIM_USER_AGENT
} from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('edit-event.js loaded.');

    // --- HTML Element References ---
    const editEventForm = document.getElementById('editEventForm');
    const messageDiv = document.getElementById('message');
    const geolocationMessageDiv = document.getElementById('geolocationMessage');
    const eventLocationInput = document.getElementById('eventLocation');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const saveChangesButton = document.getElementById('saveChangesButton');

    const eventNameInput = document.getElementById('eventName');
    const eventStartDateInput = document.getElementById('eventStartDate');
    const eventEndDateInput = document.getElementById('eventEndDate');
    const eventDescriptionInput = document.getElementById('eventDescription');
    const eventLinkInput = document.getElementById('eventLink');
    const contactEmailInput = document.getElementById('contactEmail');

    const eventTypeInput = document.getElementById('eventType');
    const eventGenderInput = document.getElementById('eventGender');

    // --- NEW REFERENCES FOR COST ---
    const eventCostInput = document.getElementById('eventCost');
    const costTypeSelect = document.getElementById('costType');


    // --- Data for Select Options (MUST MATCH add-event.js and script.js) ---
    const gameTypesOptions = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const gendersOptions = ['Men', 'Women', 'Both', 'Mixed', 'Other'];
    // --- NEW DATA FOR COST TYPE ---
    const costTypeOptions = ['Not Specified', 'Per Person', 'Per Team'];

    let currentEventId = null; // To store the ID of the event being edited

    // --- Function to populate dropdowns ---
    function populateDropdown(selectElement, options, placeholderText = "Select an option") {
        selectElement.innerHTML = ''; // Clear existing options

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholderText;
        if (placeholderText.includes("Select")) { // Only for initial placeholders (Game Type, Gender)
            placeholderOption.disabled = true;
        }
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);

        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase().replace(/\s/g, '');
            option.textContent = optionText;
            selectElement.appendChild(option);
        });
    }

    // Populate dropdowns on page load
    populateDropdown(eventTypeInput, gameTypesOptions, "Select Game Type");
    populateDropdown(eventGenderInput, gendersOptions, "Select Gender");
    // --- POPULATE THE NEW COST TYPE DROPDOWN ---
    populateDropdown(costTypeSelect, costTypeOptions, "Not Specified");


    // --- Utility Functions ---

    async function logActivity(action, eventDetails) {
        // ... (same logActivity function as in add-event.js, no changes needed here) ...
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

    async function getCoordinatesFromLocation(locationName) {
        // ... (same getCoordinatesFromLocation function as in add-event.js, no changes needed here) ...
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

    // --- Function to load event data into the form ---
    async function loadEventForEdit(eventId) {
        try {
            const response = await fetch(JSONBIN_EVENTS_WRITE_URL + '/latest', {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });

            if (!response.ok) {
                throw new Error(`Failed to load events: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            const events = data.record || [];
            const event = events.find(e => e.id === eventId);

            if (event) {
                eventNameInput.value = event.name || '';
                eventLocationInput.value = event.location || '';
                latitudeInput.value = event.latitude !== null ? event.latitude.toFixed(6) : '';
                longitudeInput.value = event.longitude !== null ? event.longitude.toFixed(6) : '';
                eventStartDateInput.value = event.startDate || '';
                eventEndDateInput.value = event.endDate || '';
                eventDescriptionInput.value = event.description || '';
                eventLinkInput.value = event.link || '';
                contactEmailInput.value = event.contactEmail || '';

                // Set dropdowns
                eventTypeInput.value = event.type || '';
                eventGenderInput.value = event.gender || '';

                // --- LOAD NEW COST FIELDS ---
                eventCostInput.value = event.cost !== null ? event.cost : '';
                costTypeSelect.value = event.costType || ''; // Select based on saved value, default to empty/placeholder if null/undefined

                messageDiv.textContent = '';
                messageDiv.className = 'message';
                geolocationMessageDiv.textContent = ''; // Clear geo message on load
                geolocationMessageDiv.className = 'message';

            } else {
                messageDiv.textContent = 'Event not found.';
                messageDiv.className = 'message error';
                console.error('Event not found for ID:', eventId);
            }
        } catch (error) {
            console.error('Error loading event for edit:', error);
            messageDiv.textContent = `Error loading event: ${error.message}`;
            messageDiv.className = 'message error';
        }
    }

    // --- Main execution flow for edit page ---
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (currentEventId) {
        await loadEventForEdit(currentEventId);
    } else {
        messageDiv.textContent = 'No event ID provided in the URL.';
        messageDiv.className = 'message error';
    }


    // --- Event Listeners ---

    // Listener for coordinate lookup when the user leaves the location field
    eventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(eventLocationInput.value);
    });

    // Listener for form submission (save changes)
    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        saveChangesButton.disabled = true;
        saveChangesButton.textContent = 'Saving...';
        messageDiv.textContent = 'Saving changes...';
        messageDiv.className = 'message info';

        try {
            const eventName = eventNameInput.value;
            const eventLocation = eventLocationInput.value;
            const eventStartDate = eventStartDateInput.value;
            const eventEndDate = eventEndDateInput.value;
            const eventDescription = eventDescriptionInput.value;
            const eventLink = eventLinkInput.value;
            const contactEmail = contactEmailInput.value;
            const eventType = eventTypeInput.value;
            const eventGender = eventGenderInput.value;

            // --- GET NEW COST FIELD VALUES ---
            const eventCost = eventCostInput.value === '' ? null : parseFloat(eventCostInput.value);
            const costType = costTypeSelect.value === '' ? 'not_specified' : costTypeSelect.value;


            let latitude = parseFloat(latitudeInput.value);
            let longitude = parseFloat(longitudeInput.value);

            if (isNaN(latitude)) latitude = null;
            if (isNaN(longitude)) longitude = null;

            // Basic validation for dropdowns
            if (eventType === '' || eventGender === '') {
                messageDiv.textContent = 'Please select a Game Type and a Gender.';
                messageDiv.className = 'message error';
                saveChangesButton.disabled = false;
                saveChangesButton.textContent = 'Save Changes';
                return;
            }
            // --- VALIDATION FOR COST AND COST TYPE ---
            if (eventCost !== null && costType === 'not_specified') {
                messageDiv.textContent = 'Please specify the Cost Type (e.g., Per Person, Per Team) if you enter a cost.';
                messageDiv.className = 'message error';
                saveChangesButton.disabled = false;
                saveChangesButton.textContent = 'Save Changes';
                return;
            }
            if (eventCost === null && costType !== 'not_specified') {
                messageDiv.textContent = 'You have selected a Cost Type but not entered a Cost. Please enter a cost or select "Not Specified".';
                messageDiv.className = 'message error';
                saveChangesButton.disabled = false;
                saveChangesButton.textContent = 'Save Changes';
                return;
            }


            const updatedEvent = {
                id: currentEventId, // Ensure the ID remains the same
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
                contactEmail: contactEmail === '' ? null : contactEmail,
                featured: false, // Assuming 'featured' status is not editable here
                // --- ADD NEW COST FIELDS TO UPDATED EVENT OBJECT ---
                cost: eventCost,
                costType: costType
            };

            const readResponse = await fetch(JSONBIN_EVENTS_WRITE_URL + '/latest', {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];

            // Find and replace the event
            const eventIndex = events.findIndex(e => e.id === currentEventId);
            if (eventIndex > -1) {
                events[eventIndex] = updatedEvent;
            } else {
                throw new Error('Event to update not found in existing data.');
            }

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
                throw new Error(`Error updating event: ${writeResponse.status} - ${errorText}`);
            }

            messageDiv.textContent = `Event '${eventName}' updated successfully!`;
            messageDiv.className = 'message success';

            logActivity('Event Updated', updatedEvent);

        } catch (error) {
            console.error('Error updating event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        } finally {
            saveChangesButton.disabled = false;
            saveChangesButton.textContent = 'Save Changes';
        }
    });
});