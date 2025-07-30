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

    // --- REFERENCES FOR COST AND CURRENCY ---
    const eventCostInput = document.getElementById('eventCost');
    const costTypeSelect = document.getElementById('costType');
    const eventCurrencySelect = document.getElementById('eventCurrency'); // NEW: Reference for currency dropdown


    // --- Data for Select Options (MUST MATCH edit-event.js and script.js) ---
    const gameTypesOptions = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const gendersOptions = ['Men', 'Women', 'Both', 'Mixed', 'Other'];
    const costTypeOptions = ['Not Specified', 'Per Person', 'Per Team'];
    // --- NEW DATA FOR CURRENCY ---
    // Value: ISO 4217 code, Text: Code - Symbol (Name)
    const currencyOptions = [
        { value: '', text: 'Select Currency' }, // Placeholder
        { value: 'usd', text: 'USD ($) - United States Dollar' },
        { value: 'eur', text: 'EUR (€) - Euro' },
        { value: 'gbp', text: 'GBP (£) - British Pound' },
        { value: 'jpy', text: 'JPY (¥) - Japanese Yen' },
        { value: 'cad', text: 'CAD (C$) - Canadian Dollar' },
        { value: 'aud', text: 'AUD (A$) - Australian Dollar' },
        { value: 'chf', text: 'CHF (CHF) - Swiss Franc' },
        { value: 'cny', text: 'CNY (¥) - Chinese Yuan' },
        { value: 'inr', text: 'INR (₹) - Indian Rupee' },
        { value: 'brl', text: 'BRL (R$) - Brazilian Real' }
    ];


    // --- Function to populate dropdowns ---
    // Modified to handle both simple string arrays and object arrays for currency
    function populateDropdown(selectElement, options, placeholderText = "Select an option", isCurrency = false) {
        selectElement.innerHTML = ''; // Clear existing options

        if (isCurrency) {
            options.forEach((optionData, index) => {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.text;
                if (index === 0) { // First option is the placeholder
                    option.disabled = true;
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        } else {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholderText;
            if (placeholderText.includes("Select")) {
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
    }

    // Populate dropdowns on page load with specific placeholder texts
    populateDropdown(eventTypeInput, gameTypesOptions, "Select Game Type");
    populateDropdown(eventGenderInput, gendersOptions, "Select Gender");
    populateDropdown(costTypeSelect, costTypeOptions, "Not Specified");
    populateDropdown(eventCurrencySelect, currencyOptions, null, true); // NEW: Populate currency dropdown


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
            const contactEmail = document.getElementById('contactEmail').value;

            const eventCost = eventCostInput.value === '' ? null : parseFloat(eventCostInput.value);
            const costType = costTypeSelect.value === '' ? 'not_specified' : costTypeSelect.value;
            const eventCurrency = eventCurrencySelect.value === '' ? null : eventCurrencySelect.value; // NEW: Get currency value


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
                contactEmail: contactEmail === '' ? null : contactEmail,
                cost: eventCost,
                costType: costType,
                currency: eventCurrency // NEW: Add currency to event object
            };

            // Basic validation for dropdowns (since they are required)
            if (eventType === '' || eventGender === '') {
                messageDiv.textContent = 'Please select a Game Type and a Gender.';
                messageDiv.className = 'message error';
                submitButton.disabled = false;
                submitButton.textContent = 'Add Event';
                return; // Stop form submission
            }
            // --- Validation for cost, cost type, and currency ---
            if (eventCost !== null) { // If a cost is entered...
                if (costType === 'not_specified') {
                    messageDiv.textContent = 'Please specify the Cost Type (e.g., Per Person, Per Team) if you enter a cost.';
                    messageDiv.className = 'message error';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Event';
                    return;
                }
                if (eventCurrency === null) { // ... and currency is not selected
                    messageDiv.textContent = 'Please select a Currency if you enter a cost.';
                    messageDiv.className = 'message error';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Event';
                    return;
                }
            } else { // If no cost is entered
                if (costType !== 'not_specified' && costType !== '') { // "" is the default for "Not Specified"
                    messageDiv.textContent = 'You have selected a Cost Type but not entered a Cost. Please enter a cost or set Cost Type to "Not Specified".';
                    messageDiv.className = 'message error';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Event';
                    return;
                }
                if (eventCurrency !== null && eventCurrency !== '') {
                    messageDiv.textContent = 'You have selected a Currency but not entered a Cost. Please enter a cost or set Currency to "Select Currency".';
                    messageDiv.className = 'message error';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Event';
                    return;
                }
            }


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

                messageDiv.textContent = `Event '${eventName}' added successfully! Remember your Event ID: ${eventId} for future edits.`;
                messageDiv.className = 'message success';
            }

            addEventForm.reset();
            // After reset, re-populate dropdowns to show placeholder
            populateDropdown(eventTypeInput, gameTypesOptions, "Select Game Type");
            populateDropdown(eventGenderInput, gendersOptions, "Select Gender");
            populateDropdown(costTypeSelect, costTypeOptions, "Not Specified");
            populateDropdown(eventCurrencySelect, currencyOptions, null, true); // NEW: Reset currency dropdown

            geolocationMessageDiv.textContent = '';
            latitudeInput.value = '';
            longitudeInput.value = '';

            logActivity('ADDED_EVENT', newEvent);

        } catch (error) {
            console.error('Error adding event:', error);
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.className = 'message error';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Add Event';
        }
    });
});