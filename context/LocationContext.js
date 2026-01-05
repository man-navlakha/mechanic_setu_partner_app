import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const LOCATION_TASK_NAME = 'background-location-task';
const LocationContext = createContext(null);

export const useLocationContext = () => useContext(LocationContext);

// 1. DEFINE BACKGROUND TASK
// This runs in a separate process even if the app is suspended
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error("[BG-Task] Error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (location) {
            console.log("[BG-Task] 📍 New Location:", location.coords.latitude, location.coords.longitude);

            // Try to send via REST if WebSocket is likely dead
            try {
                // Get session cookie from SecureStore (this is where auth is stored)
                const sessionCookie = await SecureStore.getItemAsync('session_cookie');
                const activeJobData = await AsyncStorage.getItem('activeJob');
                const isOnlineVal = await AsyncStorage.getItem('isOnline');

                const job = activeJobData ? JSON.parse(activeJobData) : null;
                const isOnline = isOnlineVal === 'true';

                // Only report if we have auth AND (actively working on job OR online)
                if (sessionCookie && (job || isOnline)) {
                    console.log("[BG-Task] 📤 Sending location via REST...");

                    // Extract CSRF token from cookie
                    const csrfMatch = sessionCookie.match(/csrftoken=([^;]+)/);
                    const csrfToken = csrfMatch ? csrfMatch[1] : null;

                    const headers = {
                        'Content-Type': 'application/json',
                        'Cookie': sessionCookie,
                    };
                    if (csrfToken) {
                        headers['X-CSRFToken'] = csrfToken;
                    }

                    // Use UpdateMechanicStatus endpoint with location data
                    await axios.post('https://mechanic-setu.onrender.com/api/jobs/UpdateMechanicStatus/', {
                        status: job ? 'WORKING' : 'ONLINE',
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        speed: location.coords.speed || 0,
                        heading: location.coords.heading || 0,
                    }, {
                        headers,
                        timeout: 10000,
                        withCredentials: true
                    });
                    console.log("[BG-Task] ✅ Background location sent successfully!");
                } else {
                    console.log("[BG-Task] ⏸️ Skipping - No session or not online/working.");
                }
            } catch (err) {
                // Log error but don't spam - just note it failed
                console.log("[BG-Task] ⚠️ REST update skipped:", err.response?.status || err.message);
            }
        }
    }
});

export const LocationProvider = ({ children }) => {
    const [coords, setCoords] = useState(null);
    const latestCoordsRef = useRef(null);
    const [isHighAccuracy, setIsHighAccuracy] = useState(false);

    useEffect(() => {
        let subscriber;

        const startWatching = async () => {
            // 1. Request Permissions
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            if (fgStatus !== 'granted') return;

            try {
                const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                if (bgStatus !== 'granted') {
                    console.warn("[Location] Background permission not granted. App will stop tracking when closed.");
                }

                // 2. Foreground Watching (for UI)
                const options = isHighAccuracy
                    ? { accuracy: Location.Accuracy.High, distanceInterval: 5 }
                    : { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 };

                subscriber = await Location.watchPositionAsync(options, (loc) => {
                    const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    latestCoordsRef.current = newCoords;
                    setCoords(newCoords);
                });

                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: isHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
                    distanceInterval: isHighAccuracy ? 5 : 10,
                    // Android-specific: Show persistent notification to keep app alive
                    foregroundService: {
                        notificationTitle: "Setu Partner Active",
                        notificationBody: isHighAccuracy ? "Tracking location for your active job." : "Online and waiting for jobs.",
                        notificationColor: "#2563eb",
                    },
                    pausesUpdatesAutomatically: false,
                });
                console.log("[Location] Background updates started.");
            } catch (err) {
                console.error("[Location] Failed to start background updates:", err);
            }
        };

        startWatching();

        return () => {
            if (subscriber) subscriber.remove();
        };
    }, [isHighAccuracy]);

    return (
        <LocationContext.Provider value={{ coords, latestCoordsRef, setIsHighAccuracy }}>
            {children}
        </LocationContext.Provider>
    );
};
