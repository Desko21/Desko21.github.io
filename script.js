// script.js

// Importa le costanti dal file config.js
import {
    JSONBIN_MASTER_KEY,
    JSONBIN_EVENTS_READ_URL,
    NOMINATIM_USER_AGENT
} from './config.js';

// NON importare loadHeader qui, dato che load-header.js gestisce già il DOMContentLoaded
// e la sua logica (inclusa la gestione dell'hamburger menu) viene eseguita lì.

document.addEventListener('DOMContentLoaded', () => { // NON più async
    console.log('Script.js is loaded and DOM is ready. Starting map initialization...');

    // ... (tutto il resto del tuo codice, dalla mappa ai filtri) ...

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
    let allEvents = []; // Contains all loaded events

    const gameTypes = ['All', 'Field', 'Box', 'Sixes', 'Clinic', 'Other'];
    const genders = ['All', 'Men', 'Women', 'Both', 'Mixed', 'Other'];

    const costTypeOptions = ['Not Specified', 'Per Person', 'Per Team'];
    const currencySymbols = {
        'usd': '$',
        'eur': '€',
        'gbp': '£',
        'jpy': '¥',
        'cad': 'C$',
        'aud': 'A$',
        'chf': 'CHF',
        'cny': '¥',
        'inr': '₹',
        'brl': 'R$'
    };

    const costTypeDisplayNames = {
        'not_specified': '',
        'perperson': 'per person',
        'perteam': 'per team'
    };

    function populateFilterDropdown(selectElement, options) {
        selectElement.innerHTML = '';
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText.toLowerCase();
            option.textContent = optionText;
            selectElement.appendChild(option);
        });
    }

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
            allEvents = Array.isArray(data.record) ? data.record : [];
            console.log('All events loaded:', allEvents);

            filterAndDisplayEvents();

        } catch (error) {
            console.error('An unexpected error occurred:', error);
            messageDiv.textContent = 'An unexpected error occurred. Please try again.';
            messageDiv.className = 'message error';
        }
    }

    function formatCostType(costTypeString) {
        return costTypeDisplayNames[costTypeString] || '';
    }

    function getCurrencySymbol(currencyCode) {
        return currencySymbols[currencyCode.toLowerCase()] || '';
    }


    function updateMapMarkers(eventsToMap) {
        markers.clearLayers();

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

            const marker = L.marker([event.latitude, event.longitude], {
                icon: customIcon
            }).addTo(markers);

            const eventType = event.type && typeof event.type === 'string' ? event.type : 'N/A';
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A';

            let gameTypeIcon = '';
            switch (eventType.toLowerCase()) {
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
                    break;
            }

            let genderIcon = '';
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
                    break;
            }

            let costPopup = '';
            if (event.cost !== null && event.cost !== undefined && typeof event.cost === 'number' && !isNaN(event.cost)) {
                const currencySym = event.currency ? getCurrencySymbol(event.currency) : '';
                const formattedCost = `${currencySym}${event.cost.toFixed(2)}`;
                const formattedCostType = event.costType && event.costType !== 'not_specified' ? formatCostType(event.costType) : '';
                costPopup = `<p><strong>Cost:</strong> ${formattedCost}${formattedCostType ? ' ' + formattedCostType : ''}</p>`;
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
            popupContent += costPopup;

            popupContent += `<p><a href="#event-${event.id}" class="more-info-link-popup" onclick="this.closest('.leaflet-popup').remove();"><i class="fas fa-external-link-alt icon-margin-right"></i>More Info</a></p>`;

            marker.bindPopup(popupContent, {
                autoPan: false
            });
        });
    }

    function filterAndDisplayEvents() {
        const bounds = map.getBounds();

        const selectedGameType = gameTypeFilter.value;
        const selectedGender = genderFilter.value;

        const filteredByDropdowns = allEvents.filter(event => {
            const eventTypeLower = event.type ? event.type.toLowerCase() : '';
            const eventGenderLower = event.gender ? event.gender.toLowerCase() : '';

            const matchesGameType = (selectedGameType === 'all' || eventTypeLower === selectedGameType);

            let matchesGender = (selectedGender === 'all' || eventGenderLower === selectedGender);
            if (selectedGender === 'both' && (eventGenderLower === 'men' || eventGenderLower === 'women')) {
                matchesGender = true;
            }

            return matchesGameType && matchesGender;
        });

        let eventsForHtmlList = filteredByDropdowns.filter(event => {
            return (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
                !isNaN(event.latitude) && !isNaN(event.longitude) &&
                bounds.contains(L.latLng(event.latitude, event.longitude)));
        });

        const allFeaturedEvents = allEvents.filter(event => event.featured);

        const finalEventsToDisplayInList = new Map();

        eventsForHtmlList.forEach(event => {
            finalEventsToDisplayInList.set(event.id, event);
        });

        allFeaturedEvents.forEach(event => {
            finalEventsToDisplayInList.set(event.id, event);
        });

        const finalEventsArray = Array.from(finalEventsToDisplayInList.values());

        const eventsForMapMarkers = filteredByDropdowns;

        displayEventsListHtml(finalEventsArray);
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
            eventListDiv.innerHTML = '<p>No tournaments found with the selected filters or no featured events.</p>';
            return;
        }

        eventsToDisplay.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;

            return new Date(a.startDate) - new Date(b.startDate);
        });

        eventsToDisplay.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item';
            eventItem.id = `event-${event.id}`;

            if (event.featured) {
                eventItem.classList.add('featured');
            }

            let featuredIconHtml = event.featured ? '<span class="star-icon event-list-icon">★</span>' : '';

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
                    break;
            }

            let genderIcon = '';
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
                    break;
            }

            let costDisplay = '';
            if (event.cost !== null && event.cost !== undefined && typeof event.cost === 'number' && !isNaN(event.cost)) {
                const currencySym = event.currency ? getCurrencySymbol(event.currency) : '';
                const formattedCost = `${currencySym}${event.cost.toFixed(2)}`;
                const formattedCostType = event.costType && event.costType !== 'not_specified' ? formatCostType(event.costType) : '';
                costDisplay = `<p><i class="fas fa-dollar-sign icon-margin-right"></i><strong>Cost:</strong> ${formattedCost}${formattedCostType ? ' ' + formattedCostType : ''}</p>`;
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
                ${costDisplay}
                ${event.contactEmail ? `<p><i class="fas fa-envelope icon-margin-right"></i><strong>Email:</strong> <a href="mailto:${event.contactEmail}">${event.contactEmail}</a></p>` : ''}
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

    map.on('moveend', filterAndDisplayEvents);
    gameTypeFilter.addEventListener('change', filterAndDisplayEvents);
    genderFilter.addEventListener('change', filterAndDisplayEvents);

    loadEvents();
});