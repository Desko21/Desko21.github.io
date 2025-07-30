// script.js

// Importa le costanti dal file config.js
import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
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
            maxZoom: 5, 
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

    // Popola i filtri Game Type e Gender
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


    function createCustomMarkerIcon() {
        const iconClass = 'fas fa-map-marker-alt'; 
        const iconColor = '#22454C'; 

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

        const validEvents = eventsToMap.filter(event =>
            (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
            !isNaN(event.latitude) && !isNaN(event.longitude))
        );

        if (validEvents.length === 0) {
            console.warn("No valid events with numerical coordinates to display on map.");
            // Non fare 'return' qui se vogliamo che la mappa mostri i marker anche senza eventi filtrati in vista
            // Ma è una scelta di design: vogliamo solo i marker filtrati o tutti i marker validi?
            // Per ora, solo i filtrati. Se l'utente si sposta, i marker verranno ricaricati.
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
            popupContent += `<p><i class="fas fa-info-circle icon-margin-right"></i>${event.description || 'No description available.'}</p>`; 

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

        // Filtra tutti gli eventi in base ai filtri a discesa (tipo di gioco e genere)
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

        // --- MODIFICA INIZIO ---

        // Eventi da visualizzare nella lista HTML:
        // Inizialmente, include solo gli eventi che sono nei limiti della mappa E filtrati dai dropdown.
        let eventsForHtmlList = filteredByDropdowns.filter(event => {
            return (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
                    !isNaN(event.latitude) && !isNaN(event.longitude) &&
                    bounds.contains(L.latLng(event.latitude, event.longitude)));
        });

        // Raccogli tutti gli eventi featured dall'array completo 'allEvents'
        const allFeaturedEvents = allEvents.filter(event => event.featured);

        // Combina gli eventi filtrati con tutti gli eventi featured, evitando duplicati
        const finalEventsToDisplayInList = new Map(); // Usa Map per deduplicare per ID

        // Aggiungi prima gli eventi filtrati normalmente
        eventsForHtmlList.forEach(event => {
            finalEventsToDisplayInList.set(event.id, event);
        });

        // Poi aggiungi tutti gli eventi featured. Se un featured è già presente, verrà sovrascritto (nessun duplicato)
        allFeaturedEvents.forEach(event => {
            finalEventsToDisplayInList.set(event.id, event);
        });

        // Converte la Map in un array
        const finalEventsArray = Array.from(finalEventsToDisplayInList.values());

        // --- MODIFICA FINE ---

        // Eventi per i marker sulla mappa (solo filtrati per dropdown, indipendentemente dai limiti della mappa)
        const eventsForMapMarkers = filteredByDropdowns;

        // Passa la lista finale alla funzione di visualizzazione HTML
        displayEventsListHtml(finalEventsArray); // Modificato qui
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
            // Messaggio aggiornato per riflettere che i featured sono sempre inclusi
            eventListDiv.innerHTML = '<p>Nessun torneo trovato con i filtri selezionati o nessun evento in evidenza.</p>';
            return;
        }

        // Ordina prima per 'featured', poi per data
        eventsToDisplay.sort((a, b) => {
            // Gli eventi featured vanno prima (true = 1, false = 0, quindi true - false = 1, false - true = -1)
            // Se 'a' è featured e 'b' non lo è, 'a' viene prima (-1)
            // Se 'b' è featured e 'a' non lo è, 'b' viene prima (1)
            // Se entrambi o nessuno sono featured, ordina per data.
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            
            // Ordina per data di inizio se non c'è differenza di featured status
            return new Date(a.startDate) - new Date(b.startDate); 
        });

        eventsToDisplay.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item';

            // Aggiungi la classe 'featured' all'elemento del torneo se è featured
            if (event.featured) {
                eventItem.classList.add('featured');
            }

            let featuredIconHtml = event.featured ? '<span class="star-icon event-list-icon">★</span>' : '';
            // sixesTitleIconHtml non viene usato per l'icona "6" accanto al titolo,
            // ma l'icona "6" è inclusa nel popup e nella lista separatamente.
            // L'icona Sixes nella lista è generata dallo switch case del gameTypeIcon
            // Questo è stato rimosso per evitare duplicati o confusione.
            let sixesTitleIconHtml = ''; // Lasciamo vuoto per coerenza con il nuovo template

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
                case 'sixes': gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>'; break; // Usiamo lo span per il "6"
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