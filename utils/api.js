import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Update with your production URL or local IP
const BASE_URL = 'https://mechanic-setu.onrender.com/api/';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Crucial for cookies
});

// --- 1. REQUEST INTERCEPTOR ---
// Automatically attaches the Cookie & CSRF Token to every API call
api.interceptors.request.use(
    async (config) => {
        try {
            // Read the saved cookie from phone storage
            const cookieString = await SecureStore.getItemAsync('session_cookie');
            console.log("[API] Interceptor Cookie:", cookieString ? "Found (" + cookieString.substring(0, 10) + "...)" : "Missing");

            if (cookieString) {
                config.headers.Cookie = cookieString;

                // Extract CSRF Token if present in the cookie string
                const csrfMatch = cookieString.match(/csrftoken=([^;]+)/);
                if (csrfMatch && csrfMatch[1]) {
                    config.headers['X-CSRFToken'] = csrfMatch[1];
                }
            }
        } catch (error) {
            console.log("Error loading cookie:", error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- 2. RESPONSE INTERCEPTOR ---
// Handles expired sessions (401 Unauthorized)
api.interceptors.response.use(
    (response) => {
        // console.log(`[API] ${response.status} ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        if (error.response) {
            console.log(`[API] ERROR ${error.response.status} ${originalRequest?.url}`);
        } else {
            console.log(`[API] ERROR (Network/Other) ${originalRequest?.url}:`, error.message);
        }

        // If we get a 401 error (Unauthorized) and haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                console.log("Session expired or invalid. Logging out...");
                // Clear the invalid cookie so the user is sent to Login screen
                await SecureStore.deleteItemAsync('session_cookie');

                // Optional: Trigger a global logout event here if needed
                // But usually, AuthContext will detect the failure on next check/reload
            } catch (err) {
                console.error("Logout cleanup failed", err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;