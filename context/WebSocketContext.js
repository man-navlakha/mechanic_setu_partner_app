import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import api from '../utils/api';
import { useAuth } from './AuthContext';

// --- SAFE IMPORT FOR NOTIFEE ---
let notifee;
try {
    notifee = require('@notifee/react-native').default;
} catch (e) {
    console.warn("Notifee not available (Expo Go mode). Push notifications disabled.");
}

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error("useWebSocket must be used inside a <WebSocketProvider>");
    return ctx;
};

export const WebSocketProvider = ({ children }) => {
    const router = useRouter();
    const { user } = useAuth(); // Get user from AuthContext

    // --- STATE ---
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const [isOnline, setIsOnlineState] = useState(false);
    const [job, setJob] = useState(null);
    const jobRef = useRef(null);
    const [mechanicCoords, setMechanicCoords] = useState(null);
    const intendedOnlineState = useRef(false);
    const locationWatchId = useRef(null);
    const latestCoordsRef = useRef(null);
    const locationIntervalRef = useRef(null);
    const appState = useRef(AppState.currentState);
    const soundRef = useRef(null);

    // --- 1. INITIALIZATION (Only when user is logged in) ---
    useEffect(() => {
        // Only initialize if user is authenticated
        if (!user) {
            console.log("[WS] No user, skipping initialization.");
            // Clean up if user logs out
            disconnectWebSocket();
            setJob(null);
            setIsOnlineState(false);
            return;
        }

        console.log("[WS] User authenticated, initializing...");
        fetchInitialStatus();
        if (notifee) requestNotificationPermission();

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                if (intendedOnlineState.current && user) connectWebSocket();
            }
            appState.current = nextAppState;
        });

        // Listen for Notifee Actions (Only if native)
        let unsubscribeNotifee;
        if (notifee) {
            unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
                if (detail.pressAction?.id) {
                    handleNotificationAction(detail.pressAction.id, detail.notification.data);
                }
            });
        }

        return () => {
            subscription.remove();
            if (unsubscribeNotifee) unsubscribeNotifee();
            disconnectWebSocket();
            stopRing();
        };
    }, [user]); // Re-run when user changes (login/logout)

    useEffect(() => { jobRef.current = job; }, [job]);

    const requestNotificationPermission = async () => {
        if (notifee) await notifee.requestPermission();
    };

    // --- 2. NOTIFICATION LOGIC (Safe) ---
    const displayIncomingJobNotification = async (newJob) => {
        if (!notifee) return; // Skip if in Expo Go

        const channelId = await notifee.createChannel({
            id: 'job_requests',
            name: 'Job Requests',
            sound: 'default',
            importance: 4, // AndroidImportance.HIGH
            visibility: 1, // AndroidVisibility.PUBLIC
        });

        await notifee.displayNotification({
            id: 'job_alert',
            title: '⚠️ NEW MECHANIC REQUEST',
            body: `${newJob.vehicle_type || 'Vehicle'} - ${newJob.problem}`,
            data: { jobId: newJob.id },
            android: {
                channelId,
                category: 'call', // AndroidCategory.CALL
                importance: 4,
                visibility: 1,
                fullScreenAction: {
                    id: 'default',
                    launchActivity: 'default',
                },
                ongoing: true,
                loopSound: true,
                actions: [
                    { title: '✅ ACCEPT', pressAction: { id: 'accept', launchActivity: 'default' } },
                    { title: '❌ REJECT', pressAction: { id: 'reject' } },
                ],
            },
        });
    };

    const handleNotificationAction = async (actionId, data) => {
        if (!notifee) return;
        const jobId = data?.jobId;

        stopRing();
        await notifee.cancelNotification('job_alert');

        if (actionId === 'accept' && jobId) acceptJob(jobId);
        else if (actionId === 'reject') rejectJob();
    };

    // --- 3. SOUND CONTROL ---
    const startRing = async () => {
        try {
            if (soundRef.current) await stopRing();
            // Ensure the sound file exists in assets/sounds/alert.mp3
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/alert.mp3'),
                { isLooping: true }
            );
            soundRef.current = sound;
            await sound.playAsync();
        } catch (error) {
            console.log("[Audio] Error:", error.message);
        }
    };

    const stopRing = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            if (notifee) await notifee.cancelNotification('job_alert');
        } catch (error) {
            console.log("[Audio] Stop Error:", error.message);
        }
    };

    // --- 4. API & STATUS ---
    const fetchInitialStatus = async () => {
        try {
            const res = await api.get("/jobs/GetBasicNeeds/");
            const data = res.data.basic_needs || {};

            const serverIsOnline = data.status === "ONLINE" && !!data.is_verified;
            setIsOnlineState(serverIsOnline);
            intendedOnlineState.current = serverIsOnline;

            const syncRes = await api.get("/jobs/SyncActiveJob/");
            if (syncRes.data && syncRes.data.id) {
                setJob(syncRes.data);
                setIsOnlineState(true);
            }

            if (serverIsOnline) connectWebSocket();
        } catch (err) {
            console.log("[WS] Init Error:", err.message);
        }
    };

    const updateStatus = async (status) => {
        try {
            await api.put("/jobs/UpdateMechanicStatus/", { status });
        } catch (error) {
            console.error("[STATUS] Update failed:", error);
        }
    };

    // --- 5. WEBSOCKET ---
    const connectWebSocket = async () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const res = await api.get("core/ws-token/");
            const wsToken = res?.data?.ws_token;
            if (!wsToken) return;

            const HOST = 'mechanic-setu.onrender.com';
            const wsUrl = `wss://${HOST}/ws/job_notifications/?token=${wsToken}`;

            console.log("[WS] Connecting:", wsUrl);
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log("[WS] Connected");
                setSocket(ws);
                startLocationTracking();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (e) { console.error(e); }
            };

            ws.onclose = () => {
                console.log("[WS] Disconnected");
                setSocket(null);
                stopLocationTracking();
                if (intendedOnlineState.current) setTimeout(connectWebSocket, 3000);
            };

        } catch (err) {
            console.error("[WS] Connect error:", err);
        }
    };

    const disconnectWebSocket = () => {
        intendedOnlineState.current = false;
        socketRef.current?.close();
        setSocket(null);
        stopLocationTracking();
    };

    const handleMessage = async (data) => {
        switch (data.type) {
            case "new_job":
                console.log("[WS] New Job:", data.service_request.id);
                setJob(data.service_request);

                startRing(); // Play Sound

                // Only show native notification if in background AND notifee exists
                if (AppState.currentState !== 'active' && notifee) {
                    await displayIncomingJobNotification(data.service_request);
                }
                break;

            case "job_status_update":
                if (jobRef.current?.id == data.job_id) {
                    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(data.status)) {
                        setJob(null);
                        stopRing();
                        updateStatus("ONLINE");
                        router.replace('/dashboard');
                    } else {
                        setJob(prev => ({ ...prev, status: data.status }));
                    }
                }
                break;
        }
    };

    // --- 6. ACTIONS ---
    const acceptJob = async (jobId) => {
        stopRing(); // Stop sound immediately

        try {
            console.log(`[JOB] Accepting Job ID: ${jobId}`);
            const res = await api.post(`/jobs/AcceptServiceRequest/${jobId}/`);

            let acceptedJob = res.data.job;
            if (!acceptedJob) {
                if (jobRef.current && String(jobRef.current.id) === String(jobId)) {
                    acceptedJob = { ...jobRef.current, status: 'WORKING' };
                } else {
                    acceptedJob = { id: jobId, status: 'WORKING' };
                }
            }

            setJob(acceptedJob);
            await updateStatus("WORKING");

            if (acceptedJob?.id) {
                router.push(`/job/${acceptedJob.id}`);
            }

        } catch (err) {
            console.error("[JOB] Accept failed:", err);
            Alert.alert("Error", "Could not accept job.");
        }
    };

    const rejectJob = () => {
        stopRing();
        setJob(null);
    };

    // Location logic (same as before)
    const startLocationTracking = async () => {
        if (locationWatchId.current) return;
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationWatchId.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 10 },
            (loc) => {
                const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                latestCoordsRef.current = coords;
                setMechanicCoords(coords);
            }
        );

        locationIntervalRef.current = setInterval(() => {
            if (latestCoordsRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: 'location_update',
                    ...latestCoordsRef.current,
                    job_id: jobRef.current?.id || null
                }));
            }
        }, 4000);
    };

    const stopLocationTracking = () => {
        if (locationWatchId.current) locationWatchId.current.remove();
        if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        locationWatchId.current = null;
        locationIntervalRef.current = null;
    };

    const setIsOnline = async (val) => {
        setIsOnlineState(val);
        intendedOnlineState.current = val;
        if (val) {
            await updateStatus("ONLINE");
            connectWebSocket();
        } else {
            await updateStatus("OFFLINE");
            disconnectWebSocket();
            stopRing();
        }
    };

    const completeJob = async (jobId, price) => {
        try {
            await api.post(`/jobs/CompleteServiceRequest/${jobId}/`, { price });
            Alert.alert("Success", "Job Completed!");
            setJob(null);
            updateStatus("ONLINE");
            router.replace('/dashboard');
        } catch (e) {
            Alert.alert("Error", "Failed to complete job.");
        }
    };

    const cancelJob = async (jobId, reason) => {
        try {
            await api.post(`/jobs/CancelServiceRequest/${jobId}/`, { cancellation_reason: reason });
            Alert.alert("Cancelled", "Job has been cancelled.");
            setJob(null);
            updateStatus("ONLINE");
            router.replace('/dashboard');
        } catch (e) {
            Alert.alert("Error", "Failed to cancel job.");
        }
    };

    return (
        <WebSocketContext.Provider value={{
            isOnline, setIsOnline, job, mechanicCoords, acceptJob, rejectJob, completeJob, cancelJob
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};