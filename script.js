document.addEventListener('DOMContentLoaded', () => {
    console.log('Script.js is loaded and DOM is ready. Starting map initialization...');

    const map = L.map('map', {
        minZoom: 3
    }).setView([41.9028, 12.4964], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const JSONBIN_BIN_ID = '68870d4d7b4b8670d8a868e8'; 
    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6';
    const JSONBIN_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;

    const eventListDiv = document.getElementById('event-list');
    const messageDiv = document.getElementById('message');
    
    const gameTypeFilter = document.getElementById('gameTypeFilter');
    const genderFilter = document.getElementById('genderFilter');

    let markers = L.featureGroup().addTo(map);
    let allEvents = [];

    async function loadEvents() {
        try {
            const response = await fetch(JSONBIN_READ_URL, {
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
            allEvents = data.record || [];
            console.log('All events loaded:', allEvents);

            filterAndDisplayEvents(); 

        } catch (error) {
            console.error('An unexpected error occurred:', error);
            messageDiv.textContent = 'An unexpected error occurred. Please try again.';
            messageDiv.className = 'message error';
        }
    }

    function updateMapMarkers(eventsToMap) {
        markers.clearLayers();

        const validEvents = eventsToMap.filter(event => 
            typeof event.latitude === 'number' && typeof event.longitude === 'number'
        );

        validEvents.forEach(event => {
            const marker = L.marker([event.latitude, event.longitude]).addTo(markers);
            
            const gameType = event.gameType && typeof event.gameType === 'string' ? event.gameType : 'N/A';
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A';

            let gameTypeIcon = '';
            if (gameType !== 'N/A') { 
                switch (gameType.toLowerCase()) {
                    case 'field':
                        gameTypeIcon = '<i class="fa-solid fa-seedling icon-margin-right"></i>';
                        break;
                    case 'box':
                        gameTypeIcon = '<i class="fas fa-cube icon-margin-right"></i>';
                        break;
                    case 'sixes':
                        gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>';
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
            popupContent += `<p><i class="fas fa-calendar-alt icon-margin-right"></i><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>`;
            popupContent += `<p><i class="fas fa-map-marker-alt icon-margin-right"></i><strong>Location:</strong> ${event.location}</p>`;
            popupContent += `<p>${gameTypeIcon}<strong>Game Type:</strong> ${gameType}</p>`;
            popupContent += `<p>${genderIcon}<strong>Gender:</strong> ${gender}</p>`;
            popupContent += `<p><i class="fas fa-info-circle icon-margin-right"></i>${event.description}</p>`;

            if (event.featured) {
                popupContent += `<p class="popup-icon-line"><span class="star-icon">★</span> Featured Event</p>`;
            }
            if (event.format && event.format.toLowerCase() === 'sixes') {
                popupContent += `<p class="popup-icon-line"><span class="sixes-icon">6</span> Sixes Format</p>`;
            }
            
            // AGGIORNATO: Ora cerca il campo 'link'
            if (event.link && typeof event.link === 'string') {
                popupContent += `<p><a href="${event.link}" target="_blank" class="more-info-link"><i class="fas fa-external-link-alt icon-margin-right"></i>More Info</a></p>`;
            }

            marker.bindPopup(popupContent, { autoPan: false }); // Aggiunta l'opzione autoPan: false
        });
    }

    function filterAndDisplayEvents() {
        const bounds = map.getBounds();
        
        const selectedGameType = gameTypeFilter.value;
        const selectedGender = genderFilter.value;

        let eventsToDisplay = [];
        let eventsForMap = [];

        const featuredEvents = allEvents.filter(event => event.featured);
        eventsToDisplay.push(...featuredEvents);
        eventsForMap.push(...featuredEvents);

        const nonFeaturedFiltered = allEvents.filter(event => {
            if (event.featured) return false;

            const matchesGameType = (selectedGameType === 'all' || 
                                     (event.gameType && event.gameType.toLowerCase() === selectedGameType));

            const matchesGender = (selectedGender === 'all' || 
                                   (event.gender && event.gender.toLowerCase() === selectedGender) ||
                                   (selectedGender === 'both' && (event.gender.toLowerCase() === 'men' || event.gender.toLowerCase() === 'women')));
                                   
            return matchesGameType && matchesGender;
        });

        const nonFeaturedFilteredAndInBounds = nonFeaturedFiltered.filter(event => {
            return (typeof event.latitude === 'number' && typeof event.longitude === 'number' &&
                    bounds.contains(L.latLng(event.latitude, event.longitude)));
        });

        eventsToDisplay.push(...nonFeaturedFilteredAndInBounds);
        eventsForMap.push(...nonFeaturedFiltered);

        const uniqueEventsListMap = new Map();
        eventsToDisplay.forEach(event => uniqueEventsListMap.set(event.createdAt, event));
        const finalEventsList = Array.from(uniqueEventsListMap.values());

        const uniqueEventsMapMarkers = new Map();
        eventsForMap.forEach(event => uniqueEventsMapMarkers.set(event.createdAt, event));
        const finalEventsForMap = Array.from(uniqueEventsMapMarkers.values());


        displayEventsListHtml(finalEventsList);
        updateMapMarkers(finalEventsForMap);
    }

    function zoomToEvent(latitude, longitude, zoomLevel = 6) {
        if (typeof latitude === 'number' && typeof longitude === 'number') {
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

        eventsToDisplay.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return new Date(b.startDate) - new Date(a.startDate);
        });

        eventsToDisplay.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'tournament-item';

            let featuredIconHtml = event.featured ? '<span class="star-icon event-list-icon">★</span>' : '';
            let sixesTitleIconHtml = (event.format && event.format.toLowerCase() === 'sixes') ? '<span class="sixes-icon event-list-icon">6</span>' : '';

            const formattedDate = new Date(event.startDate).toLocaleDateString();
            const locationText = event.location;
            const descriptionText = event.description;
            const gameType = event.gameType && typeof event.gameType === 'string' ? event.gameType : 'N/A'; 
            const gender = event.gender && typeof event.gender === 'string' ? event.gender : 'N/A'; 

            let gameTypeIcon = '';
            if (gameType !== 'N/A') { 
                switch (gameType.toLowerCase()) {
                    case 'field':
                        gameTypeIcon = '<i class="fa-solid fa-seedling icon-margin-right"></i>';
                        break;
                    case 'box':
                        gameTypeIcon = '<i class="fas fa-cube icon-margin-right"></i>';
                        break;
                    case 'sixes':
                        gameTypeIcon = '<span class="sixes-icon icon-margin-right">6</span>';
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
                <p><i class="fas fa-calendar-alt icon-margin-right"></i><strong>Date:</strong> ${formattedDate}</p>
                <p><i class="fas fa-map-marker-alt icon-margin-right"></i><strong>Location:</strong> ${locationText}</p>
                <p>${gameTypeIcon}<strong>Game Type:</strong> ${gameType}</p>
                <p>${genderIcon}<strong>Gender:</strong> ${gender}</p>
                <p><i class="fas fa-info-circle icon-margin-right"></i>${descriptionText}</p>
            `;
            
            // AGGIORNATO: Ora cerca il campo 'link'
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
