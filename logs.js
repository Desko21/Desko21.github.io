document.addEventListener('DOMContentLoaded', () => {
    console.log('logs.js loaded.');

    const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY
    const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // IL BIN ID DEI TUOI LOGS
    const JSONBIN_LOGS_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}/latest`;
    const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

    const messageDiv = document.getElementById('message');
    const logsTableBody = document.getElementById('logsTableBody');
    // const clearLogsButton = document.getElementById('clearLogsButton'); // RIMOSSO

    let allLogs = [];

    async function loadLogs() {
        messageDiv.textContent = 'Loading logs...';
        messageDiv.className = 'message info';
        try {
            const response = await fetch(JSONBIN_LOGS_READ_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_MASTER_KEY
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error reading logs bin:", response.status, errorText);
                messageDiv.textContent = `Error loading logs: ${response.status} - ${errorText}`;
                messageDiv.className = 'message error';
                return;
            }

            const data = await response.json();
            allLogs = data.record || [];
            console.log('Logs loaded:', allLogs);
            displayLogs();
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        } catch (error) {
            console.error('An unexpected error occurred while loading logs:', error);
            messageDiv.textContent = 'An unexpected error occurred while loading logs.';
            messageDiv.className = 'message error';
        }
    }

    function displayLogs() {
        logsTableBody.innerHTML = '';

        if (allLogs.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="5">No activity logs found.</td></tr>';
            return;
        }

        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        allLogs.forEach(log => {
            const row = logsTableBody.insertRow();
            
            const formattedTimestamp = new Date(log.timestamp).toLocaleString();

            row.insertCell().textContent = formattedTimestamp;
            row.insertCell().textContent = log.action;
            row.insertCell().textContent = log.event ? log.event.name : 'N/A';
            row.insertCell().textContent = log.event ? (log.event.createdAt ? log.event.createdAt.substring(0, 8) + '...' : 'N/A') : 'N/A';
            row.insertCell().textContent = log.event ? log.event.location : 'N/A';
        });
    }

    // async function clearAllLogs() { ... } // FUNZIONE RIMOSSA

    // clearLogsButton.addEventListener('click', clearAllLogs); // RIGA RIMOSSA
    loadLogs();
});
