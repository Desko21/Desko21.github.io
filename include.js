document.addEventListener('DOMContentLoaded', () => {
    // Funzione per includere il footer
    function includeFooter() {
        fetch('footer.html') // Richiede il contenuto di footer.html
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                const footerPlaceholder = document.getElementById('footer-placeholder');
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = html;
                } else {
                    // Se non trovi il placeholder, potresti volerlo aggiungere direttamente al body
                    // (anche se è meglio avere un placeholder esplicito)
                    console.warn('Placeholder element with id "footer-placeholder" not found. Appending footer to body.');
                    document.body.insertAdjacentHTML('beforeend', html);
                }
            })
            .catch(error => {
                console.error('Error loading footer:', error);
                // In caso di errore, potresti voler aggiungere un footer di fallback
                const footerPlaceholder = document.getElementById('footer-placeholder');
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = '<footer class="site-footer"><div class="container"><p>&copy; 2024 LaxMap. All rights reserved. <a href="donate.html">Donate</a></p></div></footer>';
                }
            });
    }

    // Chiama la funzione per includere il footer
    includeFooter();
});