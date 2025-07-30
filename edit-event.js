// edit-event.js

// Importa le costanti dal file config.js
import { JSONBIN_MASTER_KEY, JSONBIN_EVENTS_READ_URL, JSONBIN_EVENTS_WRITE_URL, NOMINATIM_USER_AGENT } from './config.js';

// Riferimenti agli elementi del DOM
const searchEventIdInput = document.getElementById('searchEventId');
const searchButton = document.getElementById('searchButton');
const messageDiv = document.getElementById('message');
const eventEditFormContainer = document.getElementById('eventEditFormContainer');
const editEventForm = document.getElementById('editEventForm');

const eventIdInput = document.getElementById('eventId'); // Campo hidden per l'ID
const editEventNameInput = document.getElementById('editEventName');
const editEventLocationInput = document.getElementById('editEventLocation');
const editLatitudeInput = document.getElementById('editLatitude');
const editLongitudeInput = document.getElementById('editLongitude');
const geolocationMessageDiv = document.getElementById('geolocationMessage');
const editEventTypeSelect = document.getElementById('editEventType');
const editEventGenderSelect = document.getElementById('editEventGender');
const editEventStartDateInput = document.getElementById('editEventStartDate');
const editEventEndDateInput = document.getElementById('editEventEndDate');
const editEventDescriptionTextarea = document.getElementById('editEventDescription');
const editEventLinkInput = document.getElementById('editEventLink');
const editContactEmailInput = document.getElementById('editContactEmail');
const editEventCostInput = document.getElementById('editEventCost');
const currencyTypeSelect = document.getElementById('currencyType');
const costTypeSelect = document.getElementById('costType');
const saveChangesButton = document.getElementById('saveChangesButton');

// Definizione delle opzioni per i select
const gameTypes = ['Field', 'Box', 'Sixes', 'Clinic', 'Other'];
const genders = ['Men', 'Women', 'Both', 'Mixed', 'Other'];
const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
const costTypes = ['Not Specified', 'Per Person', 'Per Team'];


// Funzione per mostrare messaggi all'utente
function showMessage(msg, type = 'info') {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    // Rimuovi il messaggio dopo un certo tempo, se non è un errore persistente
    if (type !== 'error') {
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }
}

// Funzione per popolare un dropdown select
function populateSelectOptions(selectElement, optionsArray) {
    if (!selectElement) return;
    selectElement.innerHTML = ''; // Pulisci le opzioni esistenti

    // Aggiungi un'opzione vuota o di default solo se è un campo non richiesto o per la selezione iniziale
    if (selectElement.id === 'currencyType' || selectElement.id === 'costType') {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select...';
        selectElement.appendChild(defaultOption);
    }


    optionsArray.forEach(optionText => {
        const option = document.createElement('option');
        // Importante: il valore dell'opzione è in minuscolo per il confronto con i dati dell'API
        option.value = optionText.toLowerCase().replace(/\s/g, ''); // Rimuove spazi per cost types
        option.textContent = optionText;
        selectElement.appendChild(option);
    });
}

// Popola tutti i dropdown all'avvio
function initializeFormOptions() {
    populateSelectOptions(editEventTypeSelect, gameTypes);
    populateSelectOptions(editEventGenderSelect, genders);
    populateSelectOptions(currencyTypeSelect, currencies);
    populateSelectOptions(costTypeSelect, costTypes);
}


// Funzione per geocodificare una posizione (da add-event.js)
async function geocodeLocation(locationString) {
    if (!locationString) {
        geolocationMessageDiv.textContent = 'Please enter a location.';
        geolocationMessageDiv.className = 'message info';
        return null;
    }

    try {
        geolocationMessageDiv.textContent = 'Searching for location...';
        geolocationMessageDiv.className = 'message info';

        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationString)}&format=json&limit=1`, {
            headers: {
                'User-Agent': NOMINATIM_USER_AGENT
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            editLatitudeInput.value = lat;
            editLongitudeInput.value = lon;
            geolocationMessageDiv.textContent = `Coordinates found for ${data[0].display_name}.`;
            geolocationMessageDiv.className = 'message success';
            return { lat, lon };
        } else {
            geolocationMessageDiv.textContent = 'Location not found. Please try a more specific address (e.g., "Rome, Italy").';
            geolocationMessageDiv.className = 'message error';
            editLatitudeInput.value = '';
            editLongitudeInput.value = '';
            return null;
        }
    } catch (error) {
        console.error('Error during geocoding:', error);
        geolocationMessageDiv.textContent = 'Error finding location. Please try again.';
        geolocationMessageDiv.className = 'message error';
        editLatitudeInput.value = '';
        editLongitudeInput.value = '';
        return null;
    }
}


// Funzione per caricare un evento specifico dal JSONBin
async function loadEventDetails(id) {
    showMessage('Loading event details...', 'info');
    try {
        const response = await fetch(JSONBIN_EVENTS_READ_URL, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const allEvents = Array.isArray(data.record) ? data.record : [];

        const eventToEdit = allEvents.find(event => event.id === id);

        if (eventToEdit) {
            console.log('Event found for editing:', eventToEdit);
            populateForm(eventToEdit);
            showMessage('Event loaded successfully!', 'success');
        } else {
            console.error(`Event with ID ${id} not found.`);
            showMessage(`Error: Event with ID ${id} not found. Please check the ID.`, 'error');
            eventEditFormContainer.style.display = 'none'; // Nascondi il form se l'evento non è trovato
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showMessage('Error loading event data. Please check your JSONBin.io Master Key and Bin ID.', 'error');
        eventEditFormContainer.style.display = 'none';
    }
}

// Funzione per popolare il form con i dettagli dell'evento
function populateForm(event) {
    eventIdInput.value = event.id || '';
    editEventNameInput.value = event.name || '';
    editEventLocationInput.value = event.location || '';
    editLatitudeInput.value = event.latitude || '';
    editLongitudeInput.value = event.longitude || '';

    // Formatta le date per il campo input type="date"
    editEventStartDateInput.value = event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '';
    editEventEndDateInput.value = event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '';

    editEventDescriptionTextarea.value = event.description || '';
    editEventLinkInput.value = event.link || '';
    editContactEmailInput.value = event.contactEmail || '';
    editEventCostInput.value = event.cost !== null && event.cost !== undefined ? event.cost : ''; // Gestisce 0 come valore valido

    // Popola i select per Game Type, Gender, Currency, Cost Type
    // Importante: i valori salvati nel bin potrebbero non essere esattamente in minuscolo
    // o avere spazi diversi. Assicurati che il .toLowerCase() e .replace()
    // corrispondano alla logica con cui hai popolato le opzioni.
    editEventTypeSelect.value = (event.type || '').toLowerCase();
    editEventGenderSelect.value = (event.gender || '').toLowerCase();
    currencyTypeSelect.value = (event.currency || '').toLowerCase();
    // Per costType, rimuoviamo anche gli spazi per il confronto
    costTypeSelect.value = (event.costType || '').toLowerCase().replace(/\s/g, '');


    eventEditFormContainer.style.display = 'block'; // Mostra il form
}

// Funzione per aggiornare l'evento su JSONBin
async function updateEvent(eventData) {
    showMessage('Saving changes...', 'info');
    try {
        const response = await fetch(JSONBIN_EVENTS_UPDATE_URL, {
            method: 'PUT', // Usa PUT per aggiornare l'intero bin
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Update successful:', result);
        showMessage('Event updated successfully!', 'success');

        // Reindirizza o ricarica la pagina dopo l'aggiornamento se necessario
        // setTimeout(() => window.location.href = 'index.html', 2000);

    } catch (error) {
        console.error('Error updating event:', error);
        showMessage(`Error saving changes: ${error.message}`, 'error');
    }
}


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza le opzioni dei dropdown una volta che il DOM è pronto
    initializeFormOptions();

    // Gestione dell'ID dall'URL (se presente all'avvio della pagina)
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdFromUrl = urlParams.get('id');
    if (eventIdFromUrl) {
        searchEventIdInput.value = eventIdFromUrl; // Precompila il campo di ricerca
        loadEventDetails(eventIdFromUrl); // Carica i dettagli dell'evento
    }
});


// Listener per il pulsante di ricerca
searchButton.addEventListener('click', () => {
    const id = searchEventIdInput.value.trim();
    if (id) {
        loadEventDetails(id);
    } else {
        showMessage('Please enter an Event ID to search.', 'warning');
    }
});

// Listener per la geocodifica quando si esce dal campo Location
editEventLocationInput.addEventListener('blur', () => {
    geocodeLocation(editEventLocationInput.value);
});


// Listener per il salvataggio delle modifiche
editEventForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Previene il ricaricamento della pagina

    const id = eventIdInput.value.trim();
    if (!id) {
        showMessage('No event ID found for saving.', 'error');
        return;
    }

    // Costruisci l'oggetto evento aggiornato
    const updatedEvent = {
        id: id,
        name: editEventNameInput.value.trim(),
        location: editEventLocationInput.value.trim(),
        latitude: parseFloat(editLatitudeInput.value) || null, // Assicurati che sia un numero o null
        longitude: parseFloat(editLongitudeInput.value) || null, // Assicurati che sia un numero o null
        type: editEventTypeSelect.value,
        gender: editEventGenderSelect.value,
        startDate: editEventStartDateInput.value,
        endDate: editEventEndDateInput.value || null, // Può essere null
        description: editEventDescriptionTextarea.value.trim(),
        link: editEventLinkInput.value.trim() || null, // Può essere null
        contactEmail: editContactEmailInput.value.trim() || null, // Può essere null
        cost: parseFloat(editEventCostInput.value) || null, // Può essere null/0, controlla `cost !== null && cost !== undefined` prima di salvare
        currency: currencyTypeSelect.value || null,
        costType: costTypeSelect.value || null,
        // Mantieni lo stato "featured" se esiste (dovrai recuperarlo dall'evento originale se non lo gestisci nel form)
        // featured: true/false (dovresti caricarlo dall'evento originale)
    };

    // Aggiungi un campo 'featured' all'oggetto aggiornato
    // Per fare ciò in modo sicuro, dovresti recuperare lo stato 'featured' dall'evento
    // originale quando lo carichi, e poi includerlo qui.
    // Per ora, lo lascio fuori, ma è un punto importante da considerare per un'implementazione completa.
    // Alternativa: aggiorni solo i campi che hai nel form, e mantieni gli altri.

    // Carica tutti gli eventi, trova quello da aggiornare, e poi invia l'intero array aggiornato
    try {
        const response = await fetch(JSONBIN_EVENTS_READ_URL, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        let allEvents = Array.isArray(data.record) ? data.record : [];

        // Trova l'indice dell'evento da aggiornare
        const eventIndex = allEvents.findIndex(event => event.id === id);

        if (eventIndex !== -1) {
            // Aggiorna solo i campi che sono nel form
            // **IMPORTANTE**: Questo mantiene i campi non inclusi nel form (es. 'featured')
            // Se vuoi sovrascrivere tutto, puoi fare allEvents[eventIndex] = updatedEvent;
            // Ma è più sicuro aggiornare campo per campo se il form non mostra tutto
            allEvents[eventIndex] = { ...allEvents[eventIndex], ...updatedEvent };

            // Esegui l'aggiornamento
            await updateEvent(allEvents);
        } else {
            showMessage('Error: Event not found in the database for update.', 'error');
        }

    } catch (error) {
        console.error('Error preparing update:', error);
        showMessage('Error preparing update: ' + error.message, 'error');
    }
});