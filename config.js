// config.js

// --- JSONBin.io Configuration ---
export const JSONBIN_MASTER_KEY = '$2a$10$moQg0NYbmqEkIUS1bTku2uiW8ywvcz0Bt8HKG3J/4qYU8dCZggiT6'; // LA TUA MASTER KEY!

// Bin ID dedicato agli EVENTI
export const JSONBIN_EVENTS_BIN_ID = '68870d4d7b4b8670d8a868e8'; // Il tuo Bin ID per gli eventi
export const JSONBIN_EVENTS_READ_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_EVENTS_BIN_ID}/latest`;
export const JSONBIN_EVENTS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_EVENTS_BIN_ID}`;

// Bin ID dedicato ai LOGS
export const JSONBIN_LOGS_BIN_ID = '688924c7f7e7a370d1eff96b'; // Logs Bin ID
export const JSONBIN_LOGS_WRITE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_LOGS_BIN_ID}`;

// Altre costanti globali
export const NOMINATIM_USER_AGENT = 'LacrosseEventApp/1.0 (your-email@example.com)'; // CAMBIA QUESTO!