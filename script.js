// script.js

// Importa le costanti dal file config.js
import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    // JSONBIN_EVENTS_BIN_ID, // Non più usato direttamente qui
    NOMINATIM_USER_AGENT 
} from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Script.js is loaded and DOM is ready. Starting map initialization...');

    const DEFAULT_LATITUDE = 41.9028;
    const DEFAULT_LONGITUDE = 12.4964;
    const DEFAULT_ZOOM = 5;

    const map = L.map('map', {
        minZoom: 3
    }).setView([DEFAULT_LATITUDE, DEFAULT_LONGITUDE], DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (navigator.geolocation) {
        console.log("Geolocation is supported by this browser.");
        map.locate({
            setView: true,
            maxZoom: 5, // Potrebbe essere troppo basso per una posizione precisa
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        console.log("Geolocation is not supported by this browser. Using default map view.");
    }

    const eventListDiv = document.getElementById('event-list');
    const messageDiv = document.getElementById('message');

    const gameTypeFilter = document.getElementById('gameTypeFilter');
    const genderFilter = document.getElementById('genderFilter');

    let markers = L.featureGroup().addTo(map);
    let allEvents = []; // Contiene tutti gli eventi caricati

    // --- AGGIUNTA: Popola i filtri Game Type e Gender con le stesse opzioni di add/edit-event.js ---
    // Queste liste DEVONO CORRISPONDERE a quelle in add-event.js e edit-event.js per coerenza
    const gameTypes = ['All', 'Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const genders = ['All', 'Men', 'Women', 'Both', 'Mixed', 'Other'];

    function populateFilterDropdown(selectElement, options) {
        selectElement.innerHTML = '';
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase();
            option.textContent = optionText;
            selectElement.appendChild(option);
        });
    }

    // Popola i dropdown dei filtri all'inizio
    populateFilterDropdown(gameTypeFilter, gameTypes);
    populateFilterDropdown(genderFilter, genders);


    function createCustomMarkerIcon() { // Non abbiamo più bisogno del parametro eventType
    const iconClass = 'fas fa-map-marker-alt'; // Icona standard per tutti i marker
    const iconColor = '#22454C'; // Colore uniforme per tutti

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="color: ${iconColor}; font-size: 28px;"><i class="${iconClass}"></i></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });
}

    async function loadEvents() {
        try {
            const response = await fetch(JSONBIN_EVENTS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error reading bin:", response.status, errorText);
                messageDiv.textContent = 'Error loading events. Please check your JSONBin.io Master Key and Bin ID.';
                messageDiv.className = 'message error';
                return;
            }

            const data = await response.json();
            // Assicurati che 'record' esista e sia un array, altrimenti usa un array vuoto
            allEvents = Array.isArray(data.record) ? data.record : [];
            console.log('All events loaded:', allEvents);

            filterAndDisplayEvents(); // Ricrea la mappa e la lista con i dati caricati

        } catch (error) {
            console.error('An unexpected error occurred:', error);
            messageDiv.textContent = 'An unexpected error occurred. Please try again.';
            messageDiv.className = 'message error';
        }
    }

    function updateMapMarkers(eventsToMap) {
        markers.clearLayers();

        // Il filtro qui è corretto e necessario.
        // Assicurati che i dati in JSONBin.io abbiano latitude/longitude come numeri o null.
        // Se sono null, typeof null è 'object', quindi il filtro li escluderebbe.
        // Se sono stringhe vuote, parseFloat le rende NaN.
        // Le modifiche recenti a edit-event.js dovrebbero garantire che siano numeri o null.
        const validEvents = eventsToMap.filter(event =>
            (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
            !isNaN(event.latitude) && !isNaN(event.longitude))
        );

        if (validEvents.length === 0) {
            console.warn("No valid events with numerical coordinates to display on map.");
            return;
        }

        validEvents.forEach(event => {
            const customIcon = createCustomMarkerIcon(event.type);
            
            const marker = L.marker([event.latitude, event.longitude], { icon: customIcon }).addTo(markers);

            const eventType = event.type && typeof event.type === 'string' ? event.type : 'N/A';
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A';

            let gameTypeIcon = '';
            switch (eventType.toLowerCase()) {
                case 'field': gameTypeIcon = '<i class="fa-solid fa-seedling icon-margin-right"></i>'; break;
                case 'box': gameTypeIcon = '<i class="fas fa-cube icon-margin-right"></i>'; break;
                case 'sixes': gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>'; break;
                case 'clinic': gameTypeIcon = '<i class="fas fa-book icon-margin-right"></i>'; break;
                default: gameTypeIcon = '<i class="fas fa-gamepad icon-margin-right"></i>'; break;
            }

            let genderIcon = '';
            switch (gender.toLowerCase()) {
                case 'men': genderIcon = '<i class="fas fa-mars icon-margin-right"></i>'; break;
                case 'women': genderIcon = '<i class="fas fa-venus icon-margin-right"></i>'; break;
                case 'both': genderIcon = '<i class="fas fa-venus-mars icon-margin-right"></i>'; break;
                default: genderIcon = '<i class="fas fa-user icon-margin-right"></i>'; break;
            }

            let popupContent = `<h3>${event.name}</h3>`;
            popupContent += `<p><i class="fas fa-calendar-alt icon-margin-right"></i><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}`;
            if (event.endDate && event.endDate !== event.startDate) {
                popupContent += ` - ${new Date(event.endDate).toLocaleDateString()}`;
            }
            popupContent += `</p>`;
            
            popupContent += `<p><i class="fas fa-map-marker-alt icon-margin-right"></i><strong>Location:</strong> ${event.location}</p>`;
            popupContent += `<p>${gameTypeIcon}<strong>Game Type:</strong> ${eventType}</p>`;
            popupContent += `<p>${genderIcon}<strong>Gender:</strong> ${gender}</p>`;
            popupContent += `<p><i class="fas fa-info-circle icon-margin-right"></i>${event.description || 'No description available.'}</p>`; // Default per descrizione vuota

            if (event.link && typeof event.link === 'string') {
                popupContent += `<p><a href="${event.link}" target="_blank" class="more-info-link"><i class="fas fa-external-link-alt icon-margin-right"></i>More Info</a></p>`;
            }

            marker.bindPopup(popupContent, { autoPan: false });
        });
    }

    function filterAndDisplayEvents() {
        const bounds = map.getBounds();

        const selectedGameType = gameTypeFilter.value;
        const selectedGender = genderFilter.value;

        // Filtra tutti gli eventi (featured e non) in base ai filtri di tipo e genere
        const filteredByDropdowns = allEvents.filter(event => {
            const eventTypeLower = event.type ? event.type.toLowerCase() : '';
            const eventGenderLower = event.gender ? event.gender.toLowerCase() : '';

            const matchesGameType = (selectedGameType === 'all' || eventTypeLower === selectedGameType);
            
            let matchesGender = (selectedGender === 'all' || eventGenderLower === selectedGender);
            // Logica per "Both" per il filtro di genere
            if (selectedGender === 'both' && (eventGenderLower === 'men' || eventGenderLower === 'women')) {
                matchesGender = true;
            }

            return matchesGameType && matchesGender;
        });

        // Eventi da visualizzare nella lista HTML (filtrati per dropdown E all'interno dei limiti della mappa)
        const eventsForHtmlList = filteredByDropdowns.filter(event => {
            // Assicurati che l'evento abbia coordinate valide prima di controllare i limiti
            return (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
                    !isNaN(event.latitude) && !isNaN(event.longitude) &&
                    bounds.contains(L.latLng(event.latitude, event.longitude)));
        });

        // Eventi per i marker sulla mappa (solo filtrati per dropdown, indipendentemente dai limiti della mappa)
        // Questo è cruciale per permettere ai marker di apparire quando si sposta la mappa
        const eventsForMapMarkers = filteredByDropdowns;

        displayEventsListHtml(eventsForHtmlList);
        updateMapMarkers(eventsForMapMarkers);
    }

    function zoomToEvent(latitude, longitude, zoomLevel = 6) {
        if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
            map.setView([latitude, longitude], zoomLevel, {
                animate: true,
                duration: 0.5
            });
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    function displayEventsListHtml(eventsToDisplay) {
        eventListDiv.innerHTML = '';

        if (eventsToDisplay.length === 0) {
            eventListDiv.innerHTML = '<p>No events found matching your criteria in this map area. Try adjusting filters or moving the map!</p>';
            return;
        }

        // Ordina prima per 'featured', poi per data
        eventsToDisplay.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return new Date(a.startDate) - new Date(b.startDate); 
        });

        eventsToDisplay.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item';

            let featuredIconHtml = event.featured ? '<span class="star-icon event-list-icon">★</span>' : '';
            let sixesTitleIconHtml = (event.type && event.type.toLowerCase() === 'sixes') ? '' : '';

            const formattedDate = new Date(event.startDate).toLocaleDateString();
            let dateRange = formattedDate;
            if (event.endDate && event.endDate !== event.startDate) {
                dateRange += ` - ${new Date(event.endDate).toLocaleDateString()}`;
            }

            const locationText = event.location;
            const descriptionText = event.description || '';
            const eventType = event.type && typeof event.type === 'string' ? event.type : 'N/A';
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A';

            let gameTypeIcon = '';
            switch (eventType.toLowerCase()) {
                case 'field': gameTypeIcon = '<i class="fa-solid fa-seedling icon-margin-right"></i>'; break;
                case 'box': gameTypeIcon = '<i class="fas fa-cube icon-margin-right"></i>'; break;
                case 'sixes': gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>'; break;
                case 'clinic': gameTypeIcon = '<i class="fas fa-book icon-margin-right"></i>'; break;
                default: gameTypeIcon = '<i class="fas fa-gamepad icon-margin-right"></i>'; break;
            }

            let genderIcon = '';
            switch (gender.toLowerCase()) {
                case 'men': genderIcon = '<i class="fas fa-mars icon-margin-right"></i>'; break;
                case 'women': genderIcon = '<i class="fas fa-venus icon-margin-right"></i>'; break;
                case 'both': genderIcon = '<i class="fas fa-venus-mars icon-margin-right"></i>'; break;
                default: genderIcon = '<i class="fas fa-user icon-margin-right"></i>'; break;
            }

            eventItem.innerHTML = `
                <h3 class="event-title-clickable">
                    ${event.name}
                    <span class="event-title-icons">
                        ${featuredIconHtml}
                        ${sixesTitleIconHtml}
                    </span>
                </h3>
                <p><i class="fas fa-calendar-alt icon-margin-right"></i><strong>Date:</strong> ${dateRange}</p>
                <p><i class="fas fa-map-marker-alt icon-margin-right"></i><strong>Location:</strong> ${locationText}</p>
                <p>${gameTypeIcon}<strong>Game Type:</strong> ${eventType}</p>
                <p>${genderIcon}<strong>Gender:</strong> ${gender}</p>
                <p><i class="fas fa-info-circle icon-margin-right"></i>${descriptionText}</p>
            `;

            if (event.link && typeof event.link === 'string') {
                const moreInfoParagraph = document.createElement('p');
                moreInfoParagraph.innerHTML = `<a href="${event.link}" target="_blank" class="more-info-link"><i class="fas fa-external-link-alt icon-margin-right"></i>More Info</a>`;
                eventItem.appendChild(moreInfoParagraph);
            }

            eventListDiv.appendChild(eventItem);

            const clickableTitle = eventItem.querySelector('.event-title-clickable');
            if (clickableTitle) {
                clickableTitle.style.cursor = 'pointer';
                clickableTitle.title = 'Click to view on map';
                clickableTitle.addEventListener('click', () => {
                    zoomToEvent(event.latitude, event.longitude);
                });
            }
        });
    }

    // Event listeners per i filtri e il movimento della mappa
    map.on('moveend', filterAndDisplayEvents);
    gameTypeFilter.addEventListener('change', filterAndDisplayEvents);
    genderFilter.addEventListener('change', filterAndDisplayEvents);

    // Carica gli eventi all'avvio
    loadEvents();
});