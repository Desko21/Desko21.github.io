document.addEventListener('DOMContentLoaded', () => {
    console.log('edit-event.js loaded.');

    // --- JSONBin.io Configuration ---
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // YOUR MASTER KEY!
    const JSONBIN_EVENTS_READ_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66/latest'; // Events Bin ID
    const JSONBIN_EVENTS_WRITE_URL = 'https://api.jsonbin.io/v3/b/66923497e41b4d34e40e6c66';
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Logs Bin ID
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    // --- HTML Element References ---
    const messageDiv = document.getElementById('message');
    const searchEventIdInput = document.getElementById('searchEventId');
    const searchButton = document.getElementById('searchButton');
    const eventEditFormContainer = document.getElementById('eventEditFormContainer');
    const editEventForm = document.getElementById('editEventForm');
    const editEventLocationInput = document.getElementById('editEventLocation'); // Location field in edit form

    // Edit form fields
    const eventIdInput = document.getElementById('eventId'); // Hidden field for the event ID
    const editEventNameInput = document.getElementById('editEventName');
    const editEventDateInput = document.getElementById('editEventDate');
    const editEventTimeInput = document.getElementById('editEventTime');
    const editEventDescriptionInput = document.getElementById('editEventDescription');
    const editLatitudeInput = document.getElementById('editLatitude');
    const editLongitudeInput = document.getElementById('editLongitude');
    const editEventTypeInput = document.getElementById('editEventType');
    const editEventImageInput = document.getElementById('editEventImage');
    const editIsFeaturedInput = document.getElementById('editIsFeatured');

    // --- Utility Functions ---

    // Function to log activities (copied from add-event.js, ensure consistency)
    async function logActivity(action, eventDetails) {
        const timestamp = new Date().toISOString();
        let userIp = 'N/A'; // Default value in case fetching fails

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
                id: eventDetails.id, // Use the generated ID
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
    // You might want to copy this from add-event.js if you need auto-fill on location change
    // in the edit form as well. Remember to update the User-Agent.
    async function getCoordinatesFromLocation(locationName) {
        if (locationName.trim() === '') {
            editLatitudeInput.value = ''; // Use edit form's lat/long inputs
            editLongitudeInput.value = '';
            return;
        }

        messageDiv.textContent = 'Searching for coordinates for the location...';
        messageDiv.className = 'message info';

        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`;
            
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': 'EventApp/1.0 (your-email@example.com)' // CHANGE THIS
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
                messageDiv.textContent = 'Coordinates found!';
                messageDiv.className = 'message success';
            } else {
                editLatitudeInput.value = '';
                editLongitudeInput.value = '';
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

    // Event listener for the search button
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
            // Find the event by its unique 'id' property
            const foundEvent = events.find(event => event.id === eventIdToSearch);

            if (foundEvent) {
                // Populate the form with the found event's data
                eventIdInput.value = foundEvent.id; // Store the ID in the hidden input
                editEventNameInput.value = foundEvent.name;
                editEventDateInput.value = foundEvent.date;
                editEventTimeInput.value = foundEvent.time;
                editEventLocationInput.value = foundEvent.location;
                editEventDescriptionInput.value = foundEvent.description;
                editLatitudeInput.value = foundEvent.latitude;
                editLongitudeInput.value = foundEvent.longitude;
                editEventTypeInput.value = foundEvent.type;
                editEventImageInput.value = foundEvent.image;
                editIsFeaturedInput.checked = foundEvent.featured;

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

        const eventIdToUpdate = eventIdInput.value; // The ID of the event being modified

        const updatedEventData = {
            id: eventIdToUpdate, // Keep the original ID
            name: editEventNameInput.value,
            date: editEventDateInput.value,
            time: editEventTimeInput.value,
            location: editEventLocationInput.value,
            description: editEventDescriptionInput.value,
            latitude: editLatitudeInput.value,
            longitude: editLongitudeInput.value,
            type: editEventTypeInput.value,
            image: editEventImageInput.value,
            featured: editIsFeaturedInput.checked
        };

        try {
            // STEP 1: Load all existing events
            const readResponse = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!readResponse.ok) {
                throw new Error(`Error reading existing events for modification: ${response.status} - ${await response.text()}`);
            }

            const existingData = await readResponse.json();
            let events = existingData.record || [];

            // Find the index of the event to update in the array
            const eventIndex = events.findIndex(event => event.id === eventIdToUpdate);

            if (eventIndex !== -1) {
                // Update the event with the new data
                events[eventIndex] = updatedEventData;

                // STEP 2: Write the entire updated array back to the bin
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
                
                // Hide the form after success
                eventEditFormContainer.style.display = 'none';
                searchEventIdInput.value = ''; // Clear the search field

                // Log the edit action
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
});