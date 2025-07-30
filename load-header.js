// load-header.js

document.addEventListener('DOMContentLoaded', () => {
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (headerPlaceholder) {
        fetch('header.html') // Assicurati che il percorso sia corretto
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load header: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                headerPlaceholder.innerHTML = html;
            })
            .catch(error => {
                console.error("Error loading header:", error);
                headerPlaceholder.innerHTML = '<p style="color: red;">Error loading navigation.</p>';
            });
    }
});