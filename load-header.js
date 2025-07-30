// load-header.js

document.addEventListener('DOMContentLoaded', () => {
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (headerPlaceholder) {
        // Carica l'header.html
        fetch('header.html')
            .then(response => {
                // Gestisce errori HTTP (es. file non trovato)
                if (!response.ok) {
                    throw new Error(`Failed to load header: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Inietta l'HTML dell'header nel placeholder
                headerPlaceholder.innerHTML = html;

                // --- LOGICA JAVASCRIPT PER IL MENU A PANINO ---
                // Seleziona il pulsante hamburger e la navigazione mobile all'interno dell'header caricato
                const hamburgerButton = headerPlaceholder.querySelector('.hamburger-menu');
                const mobileNav = headerPlaceholder.querySelector('.mobile-nav');

                // Assicurati che entrambi gli elementi esistano prima di aggiungere i listener
                if (hamburgerButton && mobileNav) {
                    // Gestore dell'evento click per il pulsante hamburger
                    hamburgerButton.addEventListener('click', () => {
                        // Toggle la classe 'open' per animare il pulsante hamburger in una 'X'
                        hamburgerButton.classList.toggle('open');
                        // Toggle la classe 'active' per mostrare o nascondere la navigazione mobile
                        mobileNav.classList.toggle('active');

                        // Toggle la classe 'mobile-menu-open' sul body
                        // Questa classe verrà usata nel CSS per nascondere altri elementi (es. controlli mappa)
                        document.body.classList.toggle('mobile-menu-open');

                        // Logica per gestire il click esterno e chiudere il menu
                        if (mobileNav.classList.contains('active')) {
                            // Se il menu è aperto, aggiungi un listener al document per chiuderlo.
                            // Si usa setTimeout per evitare che il click che apre il menu lo chiuda immediatamente.
                            setTimeout(() => {
                                document.addEventListener('click', closeMenuOnOutsideClick);
                            }, 0);
                        } else {
                            // Se il menu è chiuso (dopo aver toggleato), rimuovi il listener
                            document.removeEventListener('click', closeMenuOnOutsideClick);
                        }
                    });

                    // Funzione definita per essere facilmente aggiunta/rimossa come listener
                    const closeMenuOnOutsideClick = (event) => {
                        // Se il click non è sul pulsante hamburger e non è all'interno del menu mobile
                        if (!hamburgerButton.contains(event.target) && !mobileNav.contains(event.target)) {
                            hamburgerButton.classList.remove('open');
                            mobileNav.classList.remove('active');
                            document.body.classList.remove('mobile-menu-open'); // Rimuovi la classe dal body
                            document.removeEventListener('click', closeMenuOnOutsideClick); // Rimuovi il listener una volta chiuso
                        }
                    };

                    // Chiudi il menu quando un link al suo interno viene cliccato
                    mobileNav.querySelectorAll('a').forEach(link => {
                        link.addEventListener('click', () => {
                            hamburgerButton.classList.remove('open');
                            mobileNav.classList.remove('active');
                            document.body.classList.remove('mobile-menu-open'); // Rimuovi la classe dal body
                            document.removeEventListener('click', closeMenuOnOutsideClick); // Rimuovi il listener
                        });
                    });
                }
                // --- FINE LOGICA JAVASCRIPT PER IL MENU A PANINO ---

            })
            .catch(error => {
                // Gestisce errori di caricamento del file
                console.error("Error loading header:", error);
                headerPlaceholder.innerHTML = '<p style="color: red;">Error loading navigation.</p>';
            });
    }
});