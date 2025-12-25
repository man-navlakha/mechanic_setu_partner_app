import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// Update with your production URL or local IP
const BASE_URL = 'https://mechanic-setu.onrender.com/api/';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Crucial for cookies
});

// --- MEMORY CACHE ---
let memoryCookie = null; // RAM cache (fast)

// Helper to set cookie (Updates both RAM and Disk)
// Import this in AuthContext.js to save tokens during Login!
export const setSessionCookie = async (cookie) => {
    memoryCookie = cookie; // Update RAM immediately
    if (cookie) {
        await SecureStore.setItemAsync('session_cookie', cookie);
    } else {
        await SecureStore.deleteItemAsync('session_cookie');
    }
};

// Flags to avoid loops
let isRefreshing = false;
let refreshSubscribers = [];

// Retry queued requests after refresh
function onRefreshed() {
    refreshSubscribers.forEach((cb) => cb());
    refreshSubscribers = [];
}

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

// --- 1. REQUEST INTERCEPTOR ---
api.interceptors.request.use(
    async (config) => {
        try {
            // OPTIMIZATION: Check RAM first, fallback to Disk
            let cookieString = memoryCookie;

            if (!cookieString) {
                // Only read from disk if RAM is empty (e.g., App Restart)
                cookieString = await SecureStore.getItemAsync('session_cookie');
                memoryCookie = cookieString; // Hydrate RAM cache
            }

            // console.log("[API] Interceptor Cookie:", cookieString ? "Found in Cache" : "Missing");

            if (cookieString) {
                config.headers.Cookie = cookieString;

                // Extract CSRF Token
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
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (!error.response) {
            console.log(`[API] ERROR (Network/Other) ${originalRequest?.url}:`, error.message);
        }

        const isRefreshRequest = originalRequest?.url?.includes("token/refresh/");

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {

            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh(() => resolve(api(originalRequest)));
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                console.log("Session expired. Attempting refresh...");

                // Use Cached Cookie for the refresh request
                let oldCookie = memoryCookie;
                if (!oldCookie) {
                    oldCookie = await SecureStore.getItemAsync('session_cookie');
                    memoryCookie = oldCookie;
                }

                const headers = { 'Content-Type': 'application/json' };
                if (oldCookie) {
                    headers['Cookie'] = oldCookie;
                    const csrfMatch = oldCookie.match(/csrftoken=([^;]+)/);
                    if (csrfMatch && csrfMatch[1]) {
                        headers['X-CSRFToken'] = csrfMatch[1];
                    }
                }

                // Call refresh endpoint
                const refreshResponse = await axios.post(
                    `${BASE_URL}core/token/refresh/`,
                    {},
                    { headers, withCredentials: true }
                );

                console.log("[API] Token refreshed successfully");

                // Get new cookie from response
                const setCookie = refreshResponse.headers['set-cookie'];
                let newCookie = null;

                if (setCookie) {
                    newCookie = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
                    // OPTIMIZATION: Use the helper to update Cache + Disk
                    await setSessionCookie(newCookie);
                    console.log("[API] New cookie saved to cache/disk");
                } else {
                    // Fallback: keep using old cookie if backend didn't issue new one
                    newCookie = oldCookie;
                }

                isRefreshing = false;
                onRefreshed();

                // Update original request headers with new cookie
                if (newCookie) {
                    originalRequest.headers['Cookie'] = newCookie;
                    const csrfMatch = newCookie.match(/csrftoken=([^;]+)/);
                    if (csrfMatch && csrfMatch[1]) {
                        originalRequest.headers['X-CSRFToken'] = csrfMatch[1];
                    }
                }

                return api(originalRequest);

            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                isRefreshing = false;

                // Clear Cache and Disk
                await setSessionCookie(null);
                await SecureStore.deleteItemAsync('user_data');

                if (router) {
                    router.replace('/login');
                }

                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;