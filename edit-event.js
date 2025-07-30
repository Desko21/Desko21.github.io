// edit-event.js

// Importa le costanti dal file config.js
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
    const geolocationMessageDiv = document.getElementById('geolocationMessage'); // Riferimento al div per i messaggi di geolocalizzazione
    const searchEventIdInput = document.getElementById('searchEventId');
    const searchButton = document.getElementById('searchButton');
    const eventEditFormContainer = document.getElementById('eventEditFormContainer');
    const editEventForm = document.getElementById('editEventForm');
    const editEventLocationInput = document.getElementById('editEventLocation');

    // Edit form fields
    const eventIdInput = document.getElementById('eventId'); // Hidden field for the event ID
    const editEventNameInput = document.getElementById('editEventName');
    const editEventStartDateInput = document.getElementById('editEventStartDate'); // Riferimento aggiornato
    const editEventEndDateInput = document.getElementById('editEventEndDate');     // Nuovo riferimento
    // const editEventTimeInput = document.getElementById('editEventTime'); // RIMOSSO
    const editEventDescriptionInput = document.getElementById('editEventDescription');
    const editLatitudeInput = document.getElementById('editLatitude');
    const editLongitudeInput = document.getElementById('editLongitude');
    const editEventTypeInput = document.getElementById('editEventType');     // Sarà Game Type
    const editEventGenderInput = document.getElementById('editEventGender'); // Nuovo riferimento
    const editEventLinkInput = document.getElementById('editEventLink');     // Nuovo riferimento
    // const editEventImageInput = document.getElementById('editEventImage'); // RIMOSSO
    // const editIsFeaturedInput = document.getElementById('editIsFeatured'); // RIMOSSO

    const saveChangesButton = document.getElementById('saveChangesButton'); // Pulsante per salvare
    const deleteEventButton = document.getElementById('deleteEventButton'); // Nuovo pulsante per eliminare

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

    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            editLatitudeInput.value = '';
            editLongitudeInput.value = '';
            geolocationMessageDiv.textContent = ''; // Clear message
            geolocationMessageDiv.className = 'message';
            return;
        }

        geolocationMessageDiv.textContent = 'Searching for coordinates for the location...';
        geolocationMessageDiv.className = 'message info';

        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': NOMINATIM_USER_AGENT // Usa la costante importata
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
        eventEditFormContainer.style.display = 'none'; // Hide form until event is found
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
                editEventDescriptionInput.value = foundEvent.description || ''; // Può essere vuoto
                editLatitudeInput.value = foundEvent.latitude;
                editLongitudeInput.value = foundEvent.longitude;
                editEventTypeInput.value = foundEvent.type || 'other'; // 'type' è ora Game Type
                editEventGenderInput.value = foundEvent.gender || 'other'; // Nuovo campo
                editEventLinkInput.value = foundEvent.link || ''; // Nuovo campo, può essere vuoto

                eventEditFormContainer.style.display = 'block'; // Show the edit form
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

    // Event listener for auto-geocoding in the edit form
    editEventLocationInput.addEventListener('blur', () => {
        getCoordinatesFromLocation(editEventLocationInput.value);
    });

    // Event listener for saving event modifications
    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload

        messageDiv.textContent = 'Saving changes...';
        messageDiv.className = 'message info';

        const eventIdToUpdate = eventIdInput.value;

        const updatedEventData = {
            id: eventIdToUpdate,
            name: editEventNameInput.value,
            startDate: editEventStartDateInput.value, // Data di inizio
            endDate: editEventEndDateInput.value,     // Data di fine
            location: editEventLocationInput.value,
            latitude: parseFloat(editLatitudeInput.value), // Assicurati che siano numeri
            longitude: parseFloat(editLongitudeInput.value),
            type: editEventTypeInput.value,           // Game Type
            gender: editEventGenderInput.value,       // Gender
            description: editEventDescriptionInput.value,
            link: editEventLinkInput.value,
            featured: false // 'featured' è rimosso dal form, impostalo sempre a false qui se non lo gestisci altrove
        };

        // Gestione di campi opzionali che potrebbero essere vuoti
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
                // Aggiorna l'evento con i nuovi dati
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

    // Event listener for deleting an event
    deleteEventButton.addEventListener('click', async () => {
        const eventIdToDelete = eventIdInput.value; // L'ID dell'evento attualmente caricato nel form

        if (!eventIdToDelete) {
            messageDiv.textContent = 'No event loaded to delete.';
            messageDiv.className = 'message error';
            return;
        }

        if (!confirm(`Are you sure you want to delete event with ID: ${eventIdToDelete}? This action cannot be undone.`)) {
            return; // L'utente ha annullato l'operazione
        }

        messageDiv.textContent = 'Deleting event...';
        messageDiv.className = 'message info';

        try {
            // STEP 1: Load all existing events
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events for deletion: ${readResponse.status} - ${await readResponse.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];
            
            // Trova l'evento da eliminare e rimuovilo dall'array
            const initialEventCount = events.length;
            const eventToDelete = events.find(event => event.id === eventIdToDelete); // Salva l'evento prima di rimuoverlo per il log
            events = events.filter(event => event.id !== eventIdToDelete);

            if (events.length < initialEventCount) { // Se un evento è stato effettivamente rimosso
                // STEP 2: Write the updated array (without the deleted event) back to the bin
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
                    throw new Error(`Error deleting event: ${writeResponse.status} - ${errorText}`);
                }

                messageDiv.textContent = `Event (ID: ${eventIdToDelete}) deleted successfully!`;
                messageDiv.className = 'message success';
                
                // Nascondi il form e pulisci il campo di ricerca
                eventEditFormContainer.style.display = 'none';
                searchEventIdInput.value = '';

                // Logga l'azione di eliminazione
                if (eventToDelete) {
                    logActivity('DELETE_EVENT', eventToDelete);
                }

            } else {
                messageDiv.textContent = 'Error: Event not found for deletion (ID mismatch).';
                messageDiv.className = 'message error';
            }

        } catch (error) {
            console.error('Error during event deletion:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        }
    });

});