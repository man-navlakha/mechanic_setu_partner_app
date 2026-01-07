import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';
const LocationContext = createContext(null);

export const useLocationContext = () => useContext(LocationContext);

// 1. DEFINE BACKGROUND TASK
// This runs in a separate process even if the app is suspended
if (Platform.OS !== 'web') {
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
                // Location is tracked but will be sent via WebSocket when app is in foreground
            }
        }
    });
}

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
                // 2. Foreground Watching (for UI)
                const options = isHighAccuracy
                    ? { accuracy: Location.Accuracy.High, distanceInterval: 5 }
                    : { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 60000 };

                subscriber = await Location.watchPositionAsync(options, (loc) => {
                    const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    latestCoordsRef.current = newCoords;
                    setCoords(newCoords);
                });

                // Background updates are only for native (Android/iOS)
                if (Platform.OS !== 'web') {
                    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                    if (bgStatus !== 'granted') {
                        console.warn("[Location] Background permission not granted. App will stop tracking when closed.");
                    }

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
                }
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
