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
    // Elementi del FORM DI RICERCA EVENTO
    const searchEventIdInput = document.getElementById('searchEventId');
    const searchButton = document.getElementById('searchButton');
    const eventEditFormContainer = document.getElementById('eventEditFormContainer'); // Contenitore del form di modifica

    const messageDiv = document.getElementById('message');
    const geolocationMessageDiv = document.getElementById('geolocationMessage');

    // Elementi del FORM DI MODIFICA EVENTO
    // Ho corretto tutti gli ID qui per corrispondere a quelli nel tuo edit-event.html (con prefisso "edit")
    const editEventForm = document.getElementById('editEventForm');
    const eventIdHiddenInput = document.getElementById('eventId'); // L'ID nascosto dentro il form

    const eventNameInput = document.getElementById('editEventName');
    const eventLocationInput = document.getElementById('editEventLocation');
    const latitudeInput = document.getElementById('editLatitude');
    const longitudeInput = document.getElementById('editLongitude');
    const eventStartDateInput = document.getElementById('editEventStartDate');
    const eventEndDateInput = document.getElementById('editEventEndDate');
    const eventDescriptionInput = document.getElementById('editEventDescription');
    const eventLinkInput = document.getElementById('editEventLink');
    const contactEmailInput = document.getElementById('editContactEmail');

    const eventTypeInput = document.getElementById('editEventType');
    const eventGenderInput = document.getElementById('editEventGender');

    // Assicurati che questi ID siano corretti nel tuo HTML per il costo
    const eventCostInput = document.getElementById('editEventCost'); // Aggiunto "edit" qui, per coerenza
    const costTypeSelect = document.getElementById('costType'); // Questo ID sembra corretto dal tuo HTML

    const saveChangesButton = document.getElementById('saveChangesButton');


    // --- Data for Select Options (MUST MATCH add-event.js and script.js) ---
    const gameTypesOptions = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const gendersOptions = ['Men', 'Women', 'Both', 'Mixed', 'Other'];
    const costTypeOptions = ['Not Specified', 'Per Person', 'Per Team'];

    let currentEventId = null; // To store the ID of the event being edited

    // --- Function to populate dropdowns ---
    function populateDropdown(selectElement, options, placeholderText = "Select an option") {
        if (!selectElement) {
            console.error(`Error: The provided selectElement is null or undefined. Cannot populate dropdown. Check if ID exists in HTML.`);
            return;
        }
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
            option.value = optionText.toLowerCase().replace(/\s/g, ''); // Normalizza per matchare il valore del database
            option.textContent = optionText;
            selectElement.appendChild(option);
        });
    }

    // Populate dropdowns on page load for the edit form
    populateDropdown(eventTypeInput, gameTypesOptions, "Select Game Type");
    populateDropdown(eventGenderInput, gendersOptions, "Select Gender");
    // Aggiungi un controllo per costTypeSelect, dato che è l'unico senza prefisso "edit"
    if (costTypeSelect) {
        populateDropdown(costTypeSelect, costTypeOptions, "Not Specified");
    } else {
        console.warn("Element with ID 'costType' not found. Cost Type dropdown will not be populated.");
    }

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
            messageDiv.textContent = 'Loading event data...';
            messageDiv.className = 'message info';
            eventEditFormContainer.style.display = 'none'; // Nascondi il form durante il caricamento

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
                // Popola i campi del form con i dati dell'evento
                eventIdHiddenInput.value = event.id; // Imposta l'ID nascosto
                eventNameInput.value = event.name || '';
                eventLocationInput.value = event.location || '';
                latitudeInput.value = event.latitude !== null ? event.latitude.toFixed(6) : '';
                longitudeInput.value = event.longitude !== null ? event.longitude.toFixed(6) : '';
                eventStartDateInput.value = event.startDate || '';
                eventEndDateInput.value = event.endDate || '';
                eventDescriptionInput.value = event.description || '';
                eventLinkInput.value = event.link || '';
                contactEmailInput.value = event.contactEmail || '';

                // Imposta le dropdown, assicurandoti che il valore corrisponda alle opzioni (normalizzato)
                eventTypeInput.value = (event.type || '').toLowerCase().replace(/\s/g, '');
                eventGenderInput.value = (event.gender || '').toLowerCase().replace(/\s/g, '');

                // Carica i campi del costo
                eventCostInput.value = event.cost !== null ? event.cost : '';
                if (costTypeSelect) {
                    costTypeSelect.value = (event.costType || '').toLowerCase().replace(/\s/g, '');
                }

                messageDiv.textContent = 'Event loaded successfully. You can now edit its details.';
                messageDiv.className = 'message success';
                geolocationMessageDiv.textContent = '';
                geolocationMessageDiv.className = 'message';

                eventEditFormContainer.style.display = 'block'; // Mostra il form di modifica
            } else {
                messageDiv.textContent = 'Event not found with this ID. Please check the ID and try again.';
                messageDiv.className = 'message error';
                console.error('Event not found for ID:', eventId);
                eventEditFormContainer.style.display = 'none'; // Nasconde il form se l'evento non viene trovato
            }
        } catch (error) {
            console.error('Error loading event for edit:', error);
            messageDiv.textContent = `Error loading event: ${error.message}`;
            messageDiv.className = 'message error';
            eventEditFormContainer.style.display = 'none'; // Nasconde il form in caso di errore
        }
    }

    // --- Main execution flow for edit page ---

    // Listener per il pulsante di ricerca
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            const idToSearch = searchEventIdInput.value.trim();
            if (idToSearch) {
                currentEventId = idToSearch; // Imposta l'ID corrente
                await loadEventForEdit(currentEventId);
            } else {
                messageDiv.textContent = 'Please enter an Event ID to search.';
                messageDiv.className = 'message warning';
                eventEditFormContainer.style.display = 'none'; // Nasconde il form se non c'è ID
            }
        });
    } else {
        console.error("The 'searchButton' element was not found.");
    }


    // Gestione dell'ID dalla URL (se l'utente arriva con un ID già in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const initialEventId = urlParams.get('id');
    if (initialEventId) {
        searchEventIdInput.value = initialEventId; // Precompila il campo di ricerca
        currentEventId = initialEventId;
        await loadEventForEdit(currentEventId);
    }


    // --- Event Listeners for the edit form ---
    // Questi listener vengono aggiunti solo se il form di modifica esiste
    if (editEventForm) {
        // Listener per la ricerca coordinate quando l'utente lascia il campo location
        eventLocationInput.addEventListener('blur', () => {
            getCoordinatesFromLocation(eventLocationInput.value);
        });

        // Listener per l'invio del form (salva modifiche)
        editEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            saveChangesButton.disabled = true;
            saveChangesButton.textContent = 'Saving...';
            messageDiv.textContent = 'Saving changes...';
            messageDiv.className = 'message info';

            try {
                // Recupera i valori dai campi del form (ID sono già corretti sopra)
                const eventName = eventNameInput.value;
                const eventLocation = eventLocationInput.value;
                const eventStartDate = eventStartDateInput.value;
                const eventEndDate = eventEndDateInput.value;
                const eventDescription = eventDescriptionInput.value;
                const eventLink = eventLinkInput.value;
                const contactEmail = contactEmailInput.value;
                const eventType = eventTypeInput.value;
                const eventGender = eventGenderInput.value;

                // Recupera i valori dei campi del costo
                const eventCost = eventCostInput.value === '' ? null : parseFloat(eventCostInput.value);
                const costType = costTypeSelect.value === '' ? 'not_specified' : costTypeSelect.value;

                let latitude = parseFloat(latitudeInput.value);
                let longitude = parseFloat(longitudeInput.value);

                if (isNaN(latitude)) latitude = null;
                if (isNaN(longitude)) longitude = null;

                // Validazione di base per le dropdown
                if (eventType === '' || eventGender === '') {
                    messageDiv.textContent = 'Please select a Game Type and a Gender.';
                    messageDiv.className = 'message error';
                    saveChangesButton.disabled = false;
                    saveChangesButton.textContent = 'Save Changes';
                    return;
                }
                // Validazione per costo e tipo di costo
                if (eventCost !== null && (costType === 'not_specified' || costType === '')) {
                    messageDiv.textContent = 'Please specify the Cost Type (e.g., Per Person, Per Team) if you enter a cost.';
                    messageDiv.className = 'message error';
                    saveChangesButton.disabled = false;
                    saveChangesButton.textContent = 'Save Changes';
                    return;
                }
                if (eventCost === null && costType !== 'not_specified' && costType !== '') {
                    messageDiv.textContent = 'You have selected a Cost Type but not entered a Cost. Please enter a cost or select "Not Specified".';
                    messageDiv.className = 'message error';
                    saveChangesButton.disabled = false;
                    saveChangesButton.textContent = 'Save Changes';
                    return;
                }

                const updatedEvent = {
                    id: currentEventId, // L'ID dell'evento corrente
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
                    featured: false, // Assumendo che 'featured' non sia modificabile qui
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

                // Trova e sostituisci l'evento
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
    } else {
        console.error("The 'editEventForm' element was not found in the DOM. Ensure its ID is correct in edit-event.html.");
    }
});