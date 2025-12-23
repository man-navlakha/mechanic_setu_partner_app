import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const LocationContext = createContext(null);

export const useLocationContext = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
    const [coords, setCoords] = useState(null);
    const latestCoordsRef = useRef(null);
    
    // Default to 'passive' (battery saving) mode
    const [isHighAccuracy, setIsHighAccuracy] = useState(false);

    useEffect(() => {
        let subscriber;
        
        const startWatching = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // DYNAMIC CONFIGURATION
            const options = isHighAccuracy
                ? { 
                    // ACTIVE MODE (Working): High accuracy, update every 10 meters
                    accuracy: Location.Accuracy.High, 
                    distanceInterval: 10 
                  }
                : { 
                    // PASSIVE MODE (Online/Idle): Balanced, update every 100m or 30s
                    accuracy: Location.Accuracy.Balanced, 
                    distanceInterval: 100,
                    timeInterval: 30000 
                  };

            console.log(`[Location] Switching to ${isHighAccuracy ? 'HIGH' : 'BALANCED'} accuracy.`);

            subscriber = await Location.watchPositionAsync(
                options,
                (loc) => {
                    const newCoords = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    };
                    latestCoordsRef.current = newCoords;
                    setCoords(newCoords);
                }
            );
        };

        startWatching();

        return () => {
            if (subscriber) subscriber.remove();
        };
    }, [isHighAccuracy]); // <--- Re-run this effect when mode changes

    return (
        <LocationContext.Provider value={{ coords, latestCoordsRef, setIsHighAccuracy }}>
            {children}
        </LocationContext.Provider>
    );
};