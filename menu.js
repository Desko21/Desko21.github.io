// menu.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("menu.js: DOMContentLoaded event fired.");

    const hamburgerButton = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const body = document.body;

    if (hamburgerButton && mobileNav) {
        console.log("menu.js: Hamburger menu and mobile nav found. Attaching event listener.");

        hamburgerButton.addEventListener('click', () => {
            console.log("menu.js: Hamburger button clicked.");
            hamburgerButton.classList.toggle('open');
            mobileNav.classList.toggle('active');
            body.classList.toggle('mobile-menu-open');
        });

        // Funzione per chiudere il menu al click esterno
        const closeMenuOnOutsideClick = (event) => {
            // Se il click non è sul pulsante hamburger e non è all'interno del menu mobile
            if (!hamburgerButton.contains(event.target) && !mobileNav.contains(event.target)) {
                console.log("menu.js: Click outside menu detected. Closing menu.");
                hamburgerButton.classList.remove('open');
                mobileNav.classList.remove('active');
                body.classList.remove('mobile-menu-open');
                document.removeEventListener('click', closeMenuOnOutsideClick); // Rimuovi il listener una volta chiuso
            }
        };

        // Aggiungi/Rimuovi listener per click esterno quando il menu si apre/chiude
        hamburgerButton.addEventListener('click', () => {
            if (mobileNav.classList.contains('active')) {
                // Il menu è appena stato aperto, aggiungi listener per click esterno
                setTimeout(() => { // Timeout per evitare che il click di apertura chiuda subito
                    document.addEventListener('click', closeMenuOnOutsideClick);
                }, 0);
            } else {
                // Il menu è appena stato chiuso, rimuovi listener per click esterno
                document.removeEventListener('click', closeMenuOnOutsideClick);
            }
        });

        // Chiudi il menu quando un link al suo interno viene cliccato
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                console.log("menu.js: Menu link clicked. Closing menu.");
                hamburgerButton.classList.remove('open');
                mobileNav.classList.remove('active');
                body.classList.remove('mobile-menu-open');
                document.removeEventListener('click', closeMenuOnOutsideClick);
            });
        });

    } else {
        console.error("menu.js: ERROR - Hamburger menu or mobile navigation elements not found in the DOM.");
    }
});