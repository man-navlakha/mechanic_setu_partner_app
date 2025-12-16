import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { router } from 'expo-router';
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
    const { user } = useAuth(); // Get user from AuthContext

    // --- STATE ---
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const [isOnline, setIsOnlineState] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
    const [job, setJob] = useState(null);
    const [pendingJobs, setPendingJobs] = useState([]);
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
            setPendingJobs([]);
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

    // --- CONNECTION MONITOR (Heartbeat) ---
    useEffect(() => {
        const checkConnection = setInterval(() => {
            if (intendedOnlineState.current) {
                const ws = socketRef.current;
                // If socket doesn't exist or is not OPEN/CONNECTING, reconnect
                if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
                    console.log("[WS] Monitor: Connection lost. Reconnecting...");
                    connectWebSocket();
                }
            }
        }, 2500); // Check every 2.5 seconds

        return () => clearInterval(checkConnection);
    }, []);

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
            id: `job_alert_${newJob.id}`,
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

    // --- DISCONNECTION NOTIFICATION ---
    const displayDisconnectedNotification = async () => {
        if (!notifee) return; // Skip if in Expo Go

        const channelId = await notifee.createChannel({
            id: 'connection_status',
            name: 'Connection Status',
            sound: 'default',
            importance: 3, // AndroidImportance.DEFAULT
            visibility: 1, // AndroidVisibility.PUBLIC
        });

        await notifee.displayNotification({
            id: 'connection_lost',
            title: '⚠️ Connection Lost',
            body: 'You are disconnected from the server. Tap to reconnect.',
            data: { action: 'reconnect' },
            android: {
                channelId,
                importance: 3,
                visibility: 1,
                smallIcon: 'ic_notification', // Make sure this icon exists
                pressAction: {
                    id: 'reconnect',
                    launchActivity: 'default',
                },
                actions: [
                    { title: '🔄 Reconnect', pressAction: { id: 'reconnect', launchActivity: 'default' } },
                ],
            },
        });
    };

    // Cancel disconnection notification when connected
    const cancelDisconnectedNotification = async () => {
        if (!notifee) return;
        await notifee.cancelNotification('connection_lost');
    };

    const handleNotificationAction = async (actionId, data) => {
        if (!notifee) return;
        const jobId = data?.jobId;

        // Handle reconnect action from disconnection notification
        if (actionId === 'reconnect') {
            console.log("[WS] Reconnect triggered from notification");
            await notifee.cancelNotification('connection_lost');
            connectWebSocket();
            return;
        }

        if (jobId) {
            await notifee.cancelNotification(`job_alert_${jobId}`);
        }

        // If no more pending jobs, stop ring
        // But we need strict checking here. For now, simplistic approach:
        // Accept/Reject will handle state, and effect can handle sound?
        // Let's just call the functions.

        if (actionId === 'accept' && jobId) acceptJob(jobId);
        else if (actionId === 'reject' && jobId) rejectJob(jobId);
    };

    // --- 3. SOUND CONTROL ---
    const startRing = async () => {
        console.log("[Audio] startRing called");
        try {
            if (soundRef.current) {
                console.log("[Audio] Sound already playing, skipping start.");
                return;
            }
            console.log("[Audio] Loading sound file...");
            // Ensure the sound file exists in assets/sounds/alert.mp3
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/alert.mp3'),
                { isLooping: true }
            );
            console.log("[Audio] Sound loaded. Playing...");
            soundRef.current = sound;
            await sound.playAsync();
            console.log("[Audio] Sound is now playing.");
        } catch (error) {
            console.error("[Audio] Start Error FULL:", error);
            // Alert.alert("Sound Error", error.message); 
        }
    };

    const stopRing = async () => {
        console.log("[Audio] stopRing called");
        try {
            if (soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                console.log("[Audio] Current sound status:", status);
                if (status.isLoaded) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                    console.log("[Audio] Sound stopped and unloaded.");
                }
                soundRef.current = null;
            } else {
                console.log("[Audio] No sound ref to stop.");
            }
        } catch (error) {
            console.error("[Audio] Stop Error FULL:", error);
            // Force cleanup if error
            soundRef.current = null;
        }
    };

    // --- 4. API & STATUS ---
    const fetchInitialStatus = async () => {
        try {
            // 1. Check for Active/Pending Jobs FIRST
            const syncRes = await api.get("/jobs/SyncActiveJob/");
            let hasActiveJob = false;

            if (syncRes.data && syncRes.data.id && syncRes.data.status) {
                console.log("[WS] Found active job, restoring session...");
                hasActiveJob = true;
                if (syncRes.data.status === 'PENDING') {
                    setPendingJobs([syncRes.data]);
                } else {
                    setJob(syncRes.data);
                    // Ensure backend status matches active job state
                    updateStatus("WORKING");
                }
                // If there's a job, we MUST be online
                setIsOnlineState(true);
                intendedOnlineState.current = true;
                connectWebSocket();
            }

            // 2. If no active job, check if User was previously ONLINE
            if (!hasActiveJob) {
                const res = await api.get("/jobs/GetBasicNeeds/");
                const data = res.data.basic_needs || {};

                const serverIsOnline = data.status === "ONLINE";

                if (serverIsOnline) {
                    console.log("[WS] User status is ONLINE on server. Reconnecting...");
                    setIsOnlineState(true);
                    intendedOnlineState.current = true;
                    connectWebSocket();
                } else {
                    console.log("[WS] User status is OFFLINE.");
                    setIsOnlineState(false);
                    intendedOnlineState.current = false;
                }
            }

        } catch (err) {
            console.log("[WS] Init Error:", err.message);
            // Safety: Default failure to offline
            setIsOnlineState(false);
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
        if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) return;

        try {
            setConnectionStatus('connecting');
            const res = await api.get("core/ws-token/");
            const wsToken = res?.data?.ws_token;
            if (!wsToken) throw new Error("No WS Token received");

            const HOST = 'mechanic-setu.onrender.com';
            const wsUrl = `wss://${HOST}/ws/job_notifications/?token=${wsToken}`;

            console.log("[WS] Connecting:", wsUrl);
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log("[WS] Connected");
                setSocket(ws);
                setConnectionStatus('connected');
                cancelDisconnectedNotification(); // Cancel any existing disconnection notification
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
                setConnectionStatus('disconnected');
                stopLocationTracking();
                // Show notification only if user intended to be online (unexpected disconnect)
                if (intendedOnlineState.current) {
                    displayDisconnectedNotification();
                    setTimeout(connectWebSocket, 3000);
                }
            };

            ws.onerror = (e) => {
                console.log("[WS] Error", e.message);
                setConnectionStatus('disconnected');
            };

        } catch (err) {
            console.error("[WS] Connect error:", err);
            setConnectionStatus('disconnected');
            // Retry if initial connection failed (e.g. API error)
            if (intendedOnlineState.current) {
                setTimeout(connectWebSocket, 5000);
            }
        }
    };

    const disconnectWebSocket = () => {
        intendedOnlineState.current = false;
        socketRef.current?.close();
        setSocket(null);
        setConnectionStatus('disconnected');
        stopLocationTracking();
    };

    const handleMessage = async (data) => {
        switch (data.type) {
            case "new_job":
                console.log("[WS] New Job:", data.service_request.id);

                setPendingJobs(prev => {
                    // Deduplicate
                    if (prev.some(j => j.id === data.service_request.id)) {
                        console.log(`[WS] Duplicate Job Alert ignored: ${data.service_request.id}`);
                        return prev;
                    }
                    return [...prev, data.service_request];
                });

                startRing(); // Play Sound

                // Only show native notification if in background AND notifee exists
                if (AppState.currentState !== 'active' && notifee) {
                    await displayIncomingJobNotification(data.service_request);
                }
                break;

            case "job_status_update":
                // If it's the active job
                if (jobRef.current?.id == data.job_id) {
                    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(data.status)) {
                        setJob(null);
                        updateStatus("ONLINE");
                        router.replace('/dashboard');
                    } else {
                        setJob(prev => ({ ...prev, status: data.status }));
                    }
                }
                // Check if it's in pending jobs (e.g. expired/cancelled before accept)
                setPendingJobs(prev => {
                    const exists = prev.find(j => j.id == data.job_id);
                    if (exists) {
                        // Remove it
                        const filtered = prev.filter(j => j.id != data.job_id);
                        if (filtered.length === 0) stopRing();
                        return filtered;
                    }
                    return prev;
                });
                break;
        }
    };

    // --- 6. ACTIONS ---
    const acceptJob = async (jobId) => {
        // Stop sound if it's the last one, or just stop it regardless?
        // User might want to keep others pending.
        // But accepting one usually means you are busy.
        // Let's stop ring for now.
        stopRing();

        try {
            console.log(`[JOB] Accepting Job ID: ${jobId}`);
            const res = await api.post(`/jobs/AcceptServiceRequest/${jobId}/`);

            let acceptedJob = res.data.job;
            // Fallback if backend doesn't return full job
            if (!acceptedJob) {
                const fromQueue = pendingJobs.find(j => j.id === jobId);
                if (fromQueue) {
                    acceptedJob = { ...fromQueue, status: 'WORKING' };
                } else {
                    acceptedJob = { id: jobId, status: 'WORKING' };
                }
            }

            // Remove from pending
            setPendingJobs(prev => prev.filter(j => j.id !== jobId));

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

    const rejectJob = (jobId) => {
        console.log(`[JOB] Rejecting Job ID: ${jobId}`);
        setPendingJobs(prev => {
            const next = prev.filter(j => j.id !== jobId);
            if (next.length === 0) stopRing();
            return next;
        });
        if (notifee) notifee.cancelNotification(`job_alert_${jobId}`);
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
        }, 2500);
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
            cancelDisconnectedNotification(); // Cancel notification when going offline
            stopRing();
            setPendingJobs([]);
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
    // Manual reconnect function
    const reconnect = async () => {
        if (connectionStatus === 'connected' || connectionStatus === 'connecting') return;
        console.log("[WS] Manual reconnect triggered");
        cancelDisconnectedNotification(); // Cancel notification when manually reconnecting
        connectWebSocket();
    };

    const value = React.useMemo(() => ({
        isOnline, setIsOnline, connectionStatus, job, pendingJobs, mechanicCoords, acceptJob, rejectJob, completeJob, cancelJob, reconnect, stopRing
    }), [isOnline, connectionStatus, job, pendingJobs, mechanicCoords]);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};