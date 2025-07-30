// manage-featured.js

import { 
    JSONBIN_MASTER_KEY,
    // Note: JSONBIN_READ_URL and JSONBIN_UPDATE_URL are defined locally
    // If you prefer, you can also import them from config.js
	JSONBIN_EVENTS_READ_URL,
	JSONBIN_LOGS_WRITE_URL // Make sure this is imported from config.js
} from './config.js'; // Ensure JSONBIN_LOGS_WRITE_URL is in config.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('manage-featured.js loaded.');

    // CONFIGURAZIONE PAYPAL
    const PAYPAL_BUSINESS_EMAIL_OR_ID = 'jakkolo@gmail.com'; // <--- INSERISCI QUI LA TUA EMAIL PAYPAL O ID COMMERCIANTE
    const PAYPAL_ITEM_NAME = 'Promozione Evento Featured LaxMap';
    const PAYPAL_AMOUNT = '1.00'; // Costo per essere Featured (1€)
    const PAYPAL_CURRENCY_CODE = 'EUR'; // Valuta (es. USD, EUR, GBP)
    const PAYPAL_RETURN_URL = 'https://tuodominio.com/grazie-paypal.html'; // URL dopo pagamento riuscito
    const PAYPAL_CANCEL_URL = 'https://tuodominio.com/annulla-pagamento.html'; // URL dopo pagamento annullata
    // NOTA: notify_url richiede un backend per IPN, non incluso in questo setup frontend
    // const PAYPAL_NOTIFY_URL = 'https://tuodominio.com/ipn-listener.php'; 

    const eventListDiv = document.getElementById('event-list-for-featured-management');
    const messageDiv = document.getElementById('message');

    let allEvents = []; // To store all events after fetching

    // --- NEW: Log Activity Function ---
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
                id: eventDetails.id, // Using eventDetails.id (which is createdAt in this context)
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
    // --- END NEW: Log Activity Function ---


    async function loadEventsForFeaturedManagement() {
        try {
            const response = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error reading bin:", response.status, errorText);
                eventListDiv.innerHTML = '<p class="error">Error loading events. Please check console.</p>';
                return;
            }

            const data = await response.json();
            allEvents = data.record || []; // Store events
            console.log('All events loaded for featured management:', allEvents);

            displayEventsForFeaturedManagement(allEvents);

        } catch (error) {
            console.error('An unexpected error occurred while loading events:', error);
            eventListDiv.innerHTML = '<p class="error">An unexpected error occurred. Please try again.</p>';
        }
    }

    function displayEventsForFeaturedManagement(events) {
        eventListDiv.innerHTML = ''; // Clear previous list

        if (events.length === 0) {
            eventListDiv.innerHTML = '<p>No events available to manage featured status.</p>';
            return;
        }

        // Sort events by creation date (newest first)
        events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item'; 
            
            let actionButtonHtml = '';
            let sixesIconHtml = '';

            // Aggiungi l'icona "6" se il formato è "sixes"
            if (event.format && event.format.toLowerCase() === 'sixes') {
                sixesIconHtml = '<span class="sixes-icon">6</span>';
            }

            // Mostra il pulsante "Make Featured" SOLO se l'evento NON è già featured
            if (!event.featured) {
                // Aggiungi la stellina al pulsante "Make Featured"
                actionButtonHtml = `
                    <button class="feature-button" data-id="${event.createdAt}" data-event-name="${event.name}" data-event-location="${event.location}">
                        Make Featured (1€) <span class="star-icon">★</span>
                    </button>
                `;
            } else {
                // Se l'evento è già featured, mostra un messaggio invece del pulsante
                actionButtonHtml = `<p style="color: green; font-weight: bold; margin-top: 10px;">This event is already Featured.</p>`;
            }

            eventItem.innerHTML = `
                <h3>${event.name}</h3>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <p>${event.description ? event.description.substring(0, 100) + '...' : ''}</p>
                <div class="event-actions">
                    ${actionButtonHtml}
                    ${sixesIconHtml} </div>
            `;
            eventListDiv.appendChild(eventItem);
        });

        // Add event listener for the "Make Featured" buttons
        document.querySelectorAll('.feature-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.id; // This is createdAt
                const eventName = e.target.dataset.eventName;
                const eventLocation = e.target.dataset.eventLocation; // Get location for logging
                
                // --- We can remove the previous log here since we are logging inside initiatePayPalPayment ---
                // No longer needed here as the more precise log happens inside initiatePayPalPayment
                // const selectedEvent = allEvents.find(event => event.createdAt === eventId);
                // if (selectedEvent) {
                //     logActivity('CLICK_MAKE_FEATURED_BUTTON', { 
                //         id: selectedEvent.id, 
                //         name: selectedEvent.name, 
                //         location: selectedEvent.location 
                //     });
                // } else {
                //     console.warn('Could not find event in allEvents for logging.');
                //     logActivity('CLICK_MAKE_FEATURED_BUTTON_FALLBACK', { 
                //         id: eventId, 
                //         name: eventName, 
                //         location: eventLocation 
                //     });
                // }
                // --- END removed NEW ---

                initiatePayPalPayment(eventId, eventName); // PayPal call
            });
        });
    }

    function initiatePayPalPayment(eventId, eventName) {
        // --- NUOVA RIGA: Logga l'inizio del pagamento PayPal ---
        const selectedEvent = allEvents.find(event => event.createdAt === eventId);
        if (selectedEvent) {
            logActivity('INITIATE_PAYPAL_PAYMENT', { 
                id: selectedEvent.id, 
                name: selectedEvent.name, 
                location: selectedEvent.location 
            });
        } else {
            console.warn('Could not find event in allEvents for logging PayPal initiation.');
            logActivity('INITIATE_PAYPAL_PAYMENT_FALLBACK', { 
                id: eventId, 
                name: eventName, 
                location: 'Unknown (from PayPal initiation)' 
            });
        }
        // --- Fine NUOVA RIGA ---

        const confirmation = confirm(`You are about to pay ${PAYPAL_AMOUNT} ${PAYPAL_CURRENCY_CODE} to make "${eventName}" a featured event. Continue to PayPal?`);
        if (!confirmation) {
            showMessage('PayPal payment cancelled by user.', 'warning');
            return;
        }

        const form = document.createElement('form');
        form.action = 'https://www.paypal.com/cgi-bin/webscr';
        form.method = 'post';
        form.target = '_top'; 

        const fields = {
            cmd: '_xclick',
            business: PAYPAL_BUSINESS_EMAIL_OR_ID,
            item_name: `${PAYPAL_ITEM_NAME} - ${eventName}`, 
            amount: PAYPAL_AMOUNT,
            currency_code: PAYPAL_CURRENCY_CODE,
            no_shipping: '1',
            return: PAYPAL_RETURN_URL,
            cancel_return: PAYPAL_CANCEL_URL,
            custom: eventId 
        };

        for (const key in fields) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = fields[key];
            form.appendChild(input);
        }

        const pixel = document.createElement('img');
        pixel.alt = '';
        pixel.border = '0';
        pixel.src = 'https://www.paypalobjects.com/en_US/i/scr/pixel.gif';
        pixel.width = '1';
        pixel.height = '1';
        form.appendChild(pixel);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form); 
    }

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000); 
    }

    // Initial load of events when the page loads
    loadEventsForFeaturedManagement();
});