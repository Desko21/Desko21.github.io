// edit-event.js

import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    JSONBIN_EVENTS_WRITE_URL,
    JSONBIN_LOGS_WRITE_URL,
    NOMINATIM_USER_AGENT 
} from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('edit-event.js loaded.');

    // --- HTML Element References ---
    const messageDiv = document.getElementById('message');
    const geolocationMessageDiv = document.getElementById('geolocationMessage');
    const searchEventIdInput = document.getElementById('searchEventId');
    const searchButton = document.getElementById('searchButton');
    const eventEditFormContainer = document.getElementById('eventEditFormContainer');
    const editEventForm = document.getElementById('editEventForm');
    const editEventLocationInput = document.getElementById('editEventLocation');

    // Edit form fields
    const eventIdInput = document.getElementById('eventId');
    const editEventNameInput = document.getElementById('editEventName');
    const editEventStartDateInput = document.getElementById('editEventStartDate');
    const editEventEndDateInput = document.getElementById('editEventEndDate');
    const editEventDescriptionInput = document.getElementById('editEventDescription');
    const editLatitudeInput = document.getElementById('editLatitude');
    const editLongitudeInput = document.getElementById('editLongitude');
    const editEventTypeInput = document.getElementById('editEventType');
    const editEventGenderInput = document.getElementById('editEventGender');
    const editEventLinkInput = document.getElementById('editEventLink');

    const saveChangesButton = document.getElementById('saveChangesButton');
    // const deleteEventButton = document.getElementById('deleteEventButton'); // RIMOSSO

    // --- Data for Select Options ---
    // Queste liste DEVONO CORRISPONDERE a quelle in add-event.js per coerenza
    const gameTypes = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const genders = ['Men', 'Women', 'Both', 'Mixed', 'Other'];

    // --- Utility Functions ---

    // Funzione per popolare i dropdown
    function populateDropdown(selectElement, options, selectedValue = '') {
        selectElement.innerHTML = ''; // Pulisce le opzioni esistenti
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase(); // Il valore sarà in minuscolo
            option.textContent = optionText;         // Il testo visualizzato sarà con la maiuscola iniziale
            if (option.value === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

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

    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            editLatitudeInput.value = '';
            editLongitudeInput.value = '';
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
                editLatitudeInput.value = parseFloat(firstResult.lat).toFixed(6); 
                editLongitudeInput.value = parseFloat(firstResult.lon).toFixed(6);
                geolocationMessageDiv.textContent = 'Coordinates found!';
                geolocationMessageDiv.className = 'message success';
            } else {
                editLatitudeInput.value = '';
                editLongitudeInput.value = '';
                geolocationMessageDiv.textContent = 'Location not found, please enter coordinates manually.';
                geolocationMessageDiv.className = 'message warning';
            }
        } catch (error) {
            console.error('Error during geocoding:', error);
            geolocationMessageDiv.textContent = `Geocoding error: ${error.message}. Please enter coordinates manually.`;
            geolocationMessageDiv.className = 'message error';
        }
    }

    // --- Initial setup: Populate dropdowns on page load ---
    populateDropdown(editEventTypeInput, gameTypes);
    populateDropdown(editEventGenderInput, genders);

    // --- Event Listeners ---

    searchButton.addEventListener('click', async () => {
        const eventIdToSearch = searchEventIdInput.value.trim();
        if (!eventIdToSearch) {
            messageDiv.textContent = 'Please enter an event ID.';
            messageDiv.className = 'message error';
            eventEditFormContainer.style.display = 'none';
            return;
        }

        messageDiv.textContent = 'Searching for event...';
        messageDiv.className = 'message info';
        eventEditFormContainer.style.display = 'none';
        geolocationMessageDiv.textContent = ''; // Clear geolocation message

        try {
            const response = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Error reading events: ${response.status} - ${await response.text()}`);
            }

            const data = await response.json();
            const events = data.record || [];
            
            const foundEvent = events.find(event => event.id === eventIdToSearch);

            if (foundEvent) {
                // Populate the form with the found event's data
                eventIdInput.value = foundEvent.id;
                editEventNameInput.value = foundEvent.name;
                
                // Pre-valorizza le date
                editEventStartDateInput.value = foundEvent.startDate ? new Date(foundEvent.startDate).toISOString().split('T')[0] : '';
                editEventEndDateInput.value = foundEvent.endDate ? new Date(foundEvent.endDate).toISOString().split('T')[0] : '';
                
                editEventLocationInput.value = foundEvent.location;
                editEventDescriptionInput.value = foundEvent.description || '';
                editLatitudeInput.value = foundEvent.latitude;
                editLongitudeInput.value = foundEvent.longitude;
                
                // Popola e seleziona i dropdown basandosi sui valori dell'evento
                populateDropdown(editEventTypeInput, gameTypes, foundEvent.type);
                populateDropdown(editEventGenderInput, genders, foundEvent.gender);
                
                editEventLinkInput.value = foundEvent.link || '';

                eventEditFormContainer.style.display = 'block';
                messageDiv.textContent = `Event '${foundEvent.name}' found! You can now modify its values.`;
                messageDiv.className = 'message success';
                
            } else {
                messageDiv.textContent = 'No event found with the specified ID.';
                messageDiv.className = 'message warning';
                eventEditFormContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching for the event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    });

    editEventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(editEventLocationInput.value);
    });

    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        messageDiv.textContent = 'Saving changes...';
        messageDiv.className = 'message info';

        const eventIdToUpdate = eventIdInput.value;

        const updatedEventData = {
            id: eventIdToUpdate,
            name: editEventNameInput.value,
            startDate: editEventStartDateInput.value,
            endDate: editEventEndDateInput.value,
            location: editEventLocationInput.value,
            latitude: parseFloat(editLatitudeInput.value),
            longitude: parseFloat(editLongitudeInput.value),
            type: editEventTypeInput.value,
            gender: editEventGenderInput.value,
            description: editEventDescriptionInput.value,
            link: editEventLinkInput.value,
            featured: false // Impostato a false in modo fisso dato che non c'è il campo nel form
        };

        // Gestione di campi opzionali che potrebbero essere vuoti o non validi
        if (isNaN(updatedEventData.latitude)) updatedEventData.latitude = null;
        if (isNaN(updatedEventData.longitude)) updatedEventData.longitude = null;
        if (updatedEventData.endDate === '') updatedEventData.endDate = null;
        if (updatedEventData.description === '') updatedEventData.description = null;
        if (updatedEventData.link === '') updatedEventData.link = null;

        try {
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events for modification: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];

            const eventIndex = events.findIndex(event => event.id === eventIdToUpdate);

            if (eventIndex !== -1) {
                events[eventIndex] = updatedEventData;

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
                    throw new Error(`Error saving event modifications: ${writeResponse.status} - ${errorText}`);
                }

                messageDiv.textContent = `Event '${updatedEventData.name}' (ID: ${eventIdToUpdate}) updated successfully!`;
                messageDiv.className = 'message success';
                
                eventEditFormContainer.style.display = 'none';
                searchEventIdInput.value = '';

                logActivity('EDIT_EVENT', updatedEventData);

            } else {
                messageDiv.textContent = 'Error: Event not found for modification (ID mismatch).';
                messageDiv.className = 'message error';
            }

        } catch (error) {
            console.error('Error during event modification:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    });

    // deleteEventButton.addEventListener('click', ...); // RIMOSSO IL LISTENER DEL PULSANTE DI ELIMINAZIONE
});