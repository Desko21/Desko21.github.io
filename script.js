// script.js

// Importa le costanti dal file config.js
import { 
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL, // Useremo questo per leggere gli eventi
    JSONBIN_EVENTS_BIN_ID, // Manteniamo questo per chiarezza, anche se non direttamente usato nella URL di lettura se usi /latest
    NOMINATIM_USER_AGENT // Potrebbe non essere usato qui, ma lo importiamo per consistenza
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

    // Le costanti di JSONBin.io vengono ora importate da config.js
    // JSONBIN_BIN_ID, JSONBIN_MASTER_KEY, JSONBIN_READ_URL sono importate!

    const eventListDiv = document.getElementById('event-list');
    const messageDiv = document.getElementById('message');

    const gameTypeFilter = document.getElementById('gameTypeFilter');
    const genderFilter = document.getElementById('genderFilter');

    let markers = L.featureGroup().addTo(map);
    let allEvents = []; // Contiene tutti gli eventi caricati

    // --- AGGIORNATO: Funzione per creare icone Font Awesome personalizzate per i marker ---
    // Ora usa 'eventType' come parametro
    function createCustomMarkerIcon(eventType) {
        let iconClass = 'fas fa-map-marker-alt'; // Icona predefinita
        const iconColor = '#22454C'; // Colore uniforme per tutti

        if (eventType && typeof eventType === 'string') {
            switch (eventType.toLowerCase()) { // Usiamo eventType per la logica
                case 'clinic':
                    iconClass = 'fas fa-book'; // Icona a forma di libro per le clinic
                    break;
                case 'field':
                    iconClass = 'fa-solid fa-seedling'; // Esempio per Field
                    break;
                case 'box':
                    iconClass = 'fas fa-cube'; // Esempio per Box
                    break;
                case 'sixes':
                    iconClass = 'fa-solid fa-dice-six'; // Esempio per Sixes (se hai l'icona)
                    break;
                default:
                    iconClass = 'fas fa-map-marker-alt';
            }
        }
        
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
            const response = await fetch(JSONBIN_EVENTS_READ_URL, { // Usa JSONBIN_EVENTS_READ_URL da config.js
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY // Usa JSONBIN_MASTER_KEY da config.js
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
            allEvents = data.record || [];
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

        // Filtra solo gli eventi con coordinate numeriche valide
        const validEvents = eventsToMap.filter(event =>
            typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
            !isNaN(event.latitude) && !isNaN(event.longitude) // Assicurati che non siano NaN
        );

        validEvents.forEach(event => {
            // Passiamo event.type (il campo corretto dal tuo JSON) alla funzione per l'icona
            const customIcon = createCustomMarkerIcon(event.type);
            
            // Crea il marker usando latitude e longitude
            const marker = L.marker([event.latitude, event.longitude], { icon: customIcon }).addTo(markers);

            // Pop-up content: usa event.type e event.gender
            const eventType = event.type && typeof event.type === 'string' ? event.type : 'N/A';
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A';

            let gameTypeIcon = '';
            if (eventType !== 'N/A') {
                switch (eventType.toLowerCase()) { // Usa eventType qui
                    case 'field':
                        gameTypeIcon = '<i class="fa-solid fa-seedling icon-margin-right"></i>';
                        break;
                    case 'box':
                        gameTypeIcon = '<i class="fas fa-cube icon-margin-right"></i>';
                        break;
                    case 'sixes':
                        gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>';
                        break;
                    case 'clinic':
                        gameTypeIcon = '<i class="fas fa-book icon-margin-right"></i>';
                        break;
                    default:
                        gameTypeIcon = '<i class="fas fa-gamepad icon-margin-right"></i>';
                }
            } else {
                gameTypeIcon = '<i class="fas fa-gamepad icon-margin-right"></i>';
            }

            let genderIcon = '';
            if (gender !== 'N/A') {
                switch (gender.toLowerCase()) {
                    case 'men':
                        genderIcon = '<i class="fas fa-mars icon-margin-right"></i>';
                        break;
                    case 'women':
                        genderIcon = '<i class="fas fa-venus icon-margin-right"></i>';
                        break;
                    case 'both':
                        genderIcon = '<i class="fas fa-venus-mars icon-margin-right"></i>';
                        break;
                    default:
                        genderIcon = '<i class="fas fa-user icon-margin-right"></i>';
                }
            } else {
                genderIcon = '<i class="fas fa-user icon-margin-right"></i>';
            }

            let popupContent = `<h3>${event.name}</h3>`;
            // Usa startDate e endDate dal tuo nuovo formato
            popupContent += `<p><i class="fas fa-calendar-alt icon-margin-right"></i><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}`;
            if (event.endDate && event.endDate !== event.startDate) {
                popupContent += ` - ${new Date(event.endDate).toLocaleDateString()}`;
            }
            popupContent += `</p>`;
            
            popupContent += `<p><i class="fas fa-map-marker-alt icon-margin-right"></i><strong>Location:</strong> ${event.location}</p>`;
            popupContent += `<p>${gameTypeIcon}<strong>Game Type:</strong> ${eventType}</p>`; // Usa eventType qui
            popupContent += `<p>${genderIcon}<strong>Gender:</strong> ${gender}</p>`;
            popupContent += `<p><i class="fas fa-info-circle icon-margin-right"></i>${event.description}</p>`;

            // Verifica se event.featured esiste e è true
            if (event.featured) {
                popupContent += `<p class="popup-icon-line"><span class="star-icon">★</span> Featured Event</p>`;
            }
            // Verifica se event.type è 'sixes' per l'icona
            if (eventType.toLowerCase() === 'sixes') {
                popupContent += `<p class="popup-icon-line"><span class="sixes-icon">6</span> Sixes Format</p>`;
            }

            // Verifica se event.link esiste e è una stringa
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

        let eventsToDisplay = []; // Eventi per la lista HTML
        let eventsForMap = [];    // Eventi per i marker sulla mappa

        // Prima, aggiungi tutti gli eventi "featured" a entrambi gli array
        const featuredEvents = allEvents.filter(event => event.featured);
        eventsToDisplay.push(...featuredEvents);
        eventsForMap.push(...featuredEvents); // Gli eventi featured sono sempre sulla mappa

        // Poi filtra i non featured
        const nonFeaturedFiltered = allEvents.filter(event => {
            if (event.featured) return false; // Escludi i featured (già aggiunti)

            // Usa event.type qui per il filtro del tipo di gioco
            const matchesGameType = (selectedGameType === 'all' ||
                                     (event.type && event.type.toLowerCase() === selectedGameType));

            const matchesGender = (selectedGender === 'all' ||
                                   (event.gender && event.gender.toLowerCase() === selectedGender) ||
                                   (selectedGender === 'both' && (event.gender.toLowerCase() === 'men' || event.gender.toLowerCase() === 'women')));

            return matchesGameType && matchesGender;
        });

        // Eventi per la lista HTML: quelli non-featured che sono anche all'interno dei limiti della mappa
        const nonFeaturedFilteredAndInBounds = nonFeaturedFiltered.filter(event => {
            return (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
                    !isNaN(event.latitude) && !isNaN(event.longitude) &&
                    bounds.contains(L.latLng(event.latitude, event.longitude)));
        });

        eventsToDisplay.push(...nonFeaturedFilteredAndInBounds);
        // Tutti i non-featured filtrati (indipendentemente dai limiti della mappa) vanno nei marker per poterli filtrare quando la mappa si muove
        eventsForMap.push(...nonFeaturedFiltered); 

        // Rimuovi duplicati basandoti sull'ID univoco che hai generato (event.id)
        const uniqueEventsListMap = new Map();
        eventsToDisplay.forEach(event => uniqueEventsListMap.set(event.id, event)); // Usa event.id
        const finalEventsList = Array.from(uniqueEventsListMap.values());

        const uniqueEventsMapMarkers = new Map();
        eventsForMap.forEach(event => uniqueEventsMapMarkers.set(event.id, event)); // Usa event.id
        const finalEventsForMap = Array.from(uniqueEventsMapMarkers.values());


        displayEventsListHtml(finalEventsList);
        updateMapMarkers(finalEventsForMap);
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
            // Ordina dalla data più recente (o più vicina al futuro) a quella più vecchia
            // Se startDate è una stringa, convertila in oggetto Date per il confronto
            return new Date(a.startDate) - new Date(b.startDate); 
        });

        eventsToDisplay.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item';

            let featuredIconHtml = event.featured ? '<span class="star-icon event-list-icon">★</span>' : '';
            // Usa event.type per Sixes
            let sixesTitleIconHtml = (event.type && event.type.toLowerCase() === 'sixes') ? '<span class="sixes-icon icon-margin-right">6</span>' : '';

            // Formatta le date, includendo endDate se presente e diversa da startDate
            const formattedDate = new Date(event.startDate).toLocaleDateString();
            let dateRange = formattedDate;
            if (event.endDate && event.endDate !== event.startDate) {
                dateRange += ` - ${new Date(event.endDate).toLocaleDateString()}`;
            }

            const locationText = event.location;
            const descriptionText = event.description;
            // Usa event.type per il tipo di gioco
            const eventType = event.type && typeof event.type === 'string' ? event.type : 'N/A';
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A';

            let gameTypeIcon = '';
            if (eventType !== 'N/A') {
                switch (eventType.toLowerCase()) { // Usa eventType qui
                    case 'field':
                        gameTypeIcon = '<i class="fa-solid fa-seedling icon-margin-right"></i>';
                        break;
                    case 'box':
                        gameTypeIcon = '<i class="fas fa-cube icon-margin-right"></i>';
                        break;
                    case 'sixes':
                        gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>';
                        break;
                    case 'clinic':
                        gameTypeIcon = '<i class="fas fa-book icon-margin-right"></i>';
                        break;
                    default:
                        gameTypeIcon = '<i class="fas fa-gamepad icon-margin-right"></i>';
                }
            } else {
                gameTypeIcon = '<i class="fas fa-gamepad icon-margin-right"></i>';
            }

            let genderIcon = '';
            if (gender !== 'N/A') {
                switch (gender.toLowerCase()) {
                    case 'men':
                        genderIcon = '<i class="fas fa-mars icon-margin-right"></i>';
                        break;
                    case 'women':
                        genderIcon = '<i class="fas fa-venus icon-margin-right"></i>';
                        break;
                    case 'both':
                        genderIcon = '<i class="fas fa-venus-mars icon-margin-right"></i>';
                        break;
                    default:
                        genderIcon = '<i class="fas fa-user icon-margin-right"></i>';
                }
            } else {
                genderIcon = '<i class="fas fa-user icon-margin-right"></i>';
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