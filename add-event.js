document.addEventListener('DOMContentLoaded', () => {
    // JSONBin.io configuration
    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // Your actual Bin ID
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // Replace with your actual Master Key
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;
    const JSONBIN_UPDATE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    // Get form elements
    const form = document.getElementById('addEventForm');
    const eventNameInput = document.getElementById('eventName');
    const eventLocationInput = document.getElementById('eventLocation');
    const eventLatitudeInput = document.getElementById('eventLatitude');
    const eventLongitudeInput = document.getElementById('eventLongitude');
    const eventGameTypeInput = document.getElementById('eventGameType');
    const eventGenderInput = document.getElementById('eventGender');
    const eventStartDateInput = document.getElementById('eventStartDate');
    const eventEndDateInput = document.getElementById('eventEndDate');
    const eventDescriptionInput = document.getElementById('eventDescription');
    const eventLinkInput = document.getElementById('eventLink');
    const messageDiv = document.getElementById('message');

    // Reference to the form's submit button
    // Make sure your submit button inside 'addEventForm' has the ID 'submitEventButton'
    // For example in your HTML: <button type="submit" id="submitEventButton">Add Event</button>
    const submitEventButton = form.querySelector('button[type="submit"]'); 


    // Nominatim API endpoint for geocoding
    const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=json&limit=1';

    // Geocode location when the location input loses focus
    eventLocationInput.addEventListener('blur', () => {
        geocodeLocation(eventLocationInput.value);
    });

    // Function to geocode the location (unchanged)
    async function geocodeLocation(locationString) {
        if (!locationString) {
            eventLatitudeInput.value = '';
            eventLongitudeInput.value = '';
            return;
        }

        try {
            const response = await fetch(`${NOMINATIM_URL}&q=${encodeURIComponent(locationString)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                eventLatitudeInput.value = parseFloat(lat).toFixed(6);
                eventLongitudeInput.value = parseFloat(lon).toFixed(6);
            } else {
                alert('Location not found. Please try a more specific address or enter coordinates manually.');
                eventLatitudeInput.value = '';
                eventLongitudeInput.value = '';
            }
        } catch (error) {
            console.error('Error geocoding location:', error);
            alert('Error geocoding location. Please try again or enter coordinates manually.');
            eventLatitudeInput.value = '';
            eventLongitudeInput.value = '';
        }
    }

    // Handle form submission
    form.addEventListener('submit', async (eventSubmit) => { 
        eventSubmit.preventDefault(); 

        // Disable button and change text for feedback
        if (submitEventButton) {
            submitEventButton.disabled = true;
            submitEventButton.textContent = 'Adding...';
            // Optional: add a CSS class for a spinner
            // submitEventButton.classList.add('loading'); 
        }

        // Get current form values
        const newEvent = {
            name: eventNameInput.value,
            location: eventLocationInput.value,
            latitude: parseFloat(eventLatitudeInput.value),
            longitude: parseFloat(eventLongitudeInput.value),
            gameType: eventGameTypeInput.value,
            gender: eventGenderInput.value,
            startDate: eventStartDateInput.value,
            endDate: eventEndDateInput.value || null,
            description: eventDescriptionInput.value,
            link: eventLinkInput.value || null,
            featured: false, // ALWAYS FALSE ON EVENT CREATION
            createdAt: new Date().toISOString()
        };

        // Basic validation for coordinates
        if (isNaN(newEvent.latitude) || isNaN(newEvent.longitude)) {
            showMessage('Please ensure Latitude and Longitude are valid numbers. Use the geocoding feature or enter them manually.', 'error');
            // Re-enable button if validation fails
            if (submitEventButton) {
                submitEventButton.disabled = false;
                submitEventButton.textContent = 'Add Event'; // Restore original text
                // submitEventButton.classList.remove('loading');
            }
            return;
        }

        try {
            // Fetch existing events
            const responseRead = await fetch(JSONBIN_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!responseRead.ok) {
                const errorText = await responseRead.text();
                console.error("Error reading bin:", responseRead.status, errorText);
                showMessage(`Error reading existing events: ${responseRead.status}. Check console.`, 'error');
                return; 
            }

            const existingData = await responseRead.json();
            const events = existingData.record || []; // Assumes your bin is { "record": [...] }

            // Add new event to the array
            events.push(newEvent);

            // Update the bin with the new array of events
            const responseUpdate = await fetch(JSONBIN_UPDATE_URL, {
                method: 'PUT', // 'PUT' to update an existing bin
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_MASTER_KEY,
                    'X-Bin-Versioning': 'false' 
                },
                body: JSON.stringify(events) // Sends the entire updated array
                // If your bin is an object with a "record" key, send:
                // body: JSON.stringify({ record: events })
            });

            if (!responseUpdate.ok) {
                const errorText = await responseUpdate.text();
                console.error("Error updating bin:", responseUpdate.status, errorText);
                showMessage(`Error adding event: ${responseUpdate.status}. Check console.`, 'error');
                return; 
            }

            const updatedData = await responseUpdate.json();
            console.log('Event added successfully:', updatedData);
            showMessage('Event added successfully!', 'success');
            form.reset(); // Clear the form
            eventLatitudeInput.value = ''; 
            eventLongitudeInput.value = '';

        } catch (error) {
            console.error('An unexpected error occurred:', error);
            showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            // Re-enable button and restore original text
            if (submitEventButton) {
                submitEventButton.disabled = false;
                submitEventButton.textContent = 'Add Event'; // Restore original text
                // submitEventButton.classList.remove('loading');
            }
        }
    });

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }
});