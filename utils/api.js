import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// REPLACE with your actual computer's IP address if testing locally
const BASE_URL = 'https://mechanic-setu.onrender.com/api/';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for cookies
});

// 1. REQUEST INTERCEPTOR: Automatically attach the cookie
api.interceptors.request.use(
    async (config) => {
        // Read cookie from secure storage
        const token = await SecureStore.getItemAsync('session_cookie');
        if (token) {
            config.headers.Cookie = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. RESPONSE INTERCEPTOR: Handle Expired Session (401)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If we get a 401 (Unauthorized) and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log("Session expired. Attempting refresh...");

                // --- REFRESH LOGIC ---
                // Call your backend to refresh the token. 
                // If your backend refreshes automatically on a specific endpoint, call it here.
                // Example: const res = await axios.post(`${BASE_URL}users/refresh/`, {}, { headers: { Cookie: await SecureStore.getItemAsync('session_cookie') } });

                // If your backend sends a NEW cookie, save it:
                // if (res.headers['set-cookie']) {
                //   await SecureStore.setItemAsync('session_cookie', res.headers['set-cookie'][0]);
                // }

                // Retry the original failed request
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Refresh failed", refreshError);
                // If refresh fails, delete cookie so AuthContext kicks user to Login
                await SecureStore.deleteItemAsync('session_cookie');
            }
        }
        return Promise.reject(error);
    }
);

export default api;