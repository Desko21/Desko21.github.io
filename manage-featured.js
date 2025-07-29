document.addEventListener('DOMContentLoaded', () => {
    console.log('manage-featured.js loaded.');

    // JSONBin.io configuration
    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; // Your actual Bin ID
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;
    const JSONBIN_UPDATE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

    // CONFIGURAZIONE PAYPAL
    const PAYPAL_BUSINESS_EMAIL_OR_ID = 'TUA_EMAIL_PAYPAL_O_ID_COMMERCIANTE'; // <--- INSERISCI QUI LA TUA EMAIL PAYPAL O ID COMMERCIANTE
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

    async function loadEventsForFeaturedManagement() {
        try {
            const response = await fetch(JSONBIN_READ_URL, {
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
                    <button class="feature-button" data-id="${event.createdAt}" data-event-name="${event.name}">
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
                <p>${event.description.substring(0, 100)}...</p>
                <div class="event-actions">
                    ${actionButtonHtml}
                    ${sixesIconHtml} </div>
            `;
            eventListDiv.appendChild(eventItem);
        });

        // Add event listener for the "Make Featured" buttons
        document.querySelectorAll('.feature-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.id;
                const eventName = e.target.dataset.eventName;
                initiatePayPalPayment(eventId, eventName); // PayPal call
            });
        });
    }

    function initiatePayPalPayment(eventId, eventName) {
        const confirmation = confirm(`Stai per pagare ${PAYPAL_AMOUNT} ${PAYPAL_CURRENCY_CODE} per rendere "${eventName}" un Evento in Evidenza. Continuare su PayPal?`);
        if (!confirmation) {
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