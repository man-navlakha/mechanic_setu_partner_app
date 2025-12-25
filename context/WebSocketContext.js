import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import { useLocationContext } from './LocationContext';
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
    const { latestCoordsRef, setIsHighAccuracy } = useLocationContext();

    // --- STATE ---
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const [isOnline, setIsOnlineState] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
    const [job, setJob] = useState(null);
    const [pendingJobs, setPendingJobs] = useState([]);
    const jobRef = useRef(null);
    const intendedOnlineState = useRef(false);
    const appState = useRef(AppState.currentState);
    const soundRef = useRef(null);
    const processedJobIds = useRef(new Set()); // Track accepted/pending IDs to avoid duplicate alerts
    const currentSoundId = useRef(0); // For handling async sound loading race conditions

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
    useEffect(() => {
        if (job && job.status === 'WORKING') {
            setIsHighAccuracy(true); // Switch to High Power/Precision
        } else {
            setIsHighAccuracy(false); // Switch to Battery Saving
        }
    }, [job?.status, setIsHighAccuracy]);
    // --- CONNECTION MONITOR (Heartbeat) ---
    useEffect(() => {
        const interval = setInterval(() => {
            // Read from the Ref directly. This DOES NOT trigger re-renders.
            if (latestCoordsRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: 'location_update',
                    ...latestCoordsRef.current,
                    job_id: jobRef.current?.id || null
                }));
            }
        }, 2500);
        return () => clearInterval(interval);
    }, []);
    useEffect(() => { jobRef.current = job; }, [job]);

    const requestNotificationPermission = async () => {
        if (notifee) await notifee.requestPermission();
    };

    // --- 2. NOTIFICATION LOGIC (Safe) ---
    const displayIncomingJobNotification = async (newJob) => {
        if (!notifee) return;

        const channelId = await notifee.createChannel({
            id: 'job_requests_urgent',
            name: 'Urgent Job Requests',
            importance: 4, // High importance
            visibility: 1, // Public
            sound: 'default',
        });

        await notifee.displayNotification({
            id: `job_alert_${newJob.id}`,
            title: '🚨 URGENT: NEW JOB FOUND',
            body: `${newJob.vehical_type} - ${newJob.problem}`,
            data: { jobId: String(newJob.id) },
            android: {
                channelId,
                importance: 4,
                // This is the key for showing over other apps/lockscreen
                fullScreenAction: {
                    id: 'default',
                },
                // Makes it stick until acted upon
                ongoing: true,
                // Categories help the OS prioritize the popup
                category: 'call',
                pressAction: {
                    id: 'default',
                    launchActivity: 'default',
                },
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

    const [isRinging, setIsRinging] = useState(false);

    const stopSignal = useRef(false);

    // --- 3. SOUND CONTROL ---
    // --- OPTIMIZED SOUND CONTROL ---
    const playNotificationSound = async () => {
        if (!soundRef.current) {
            console.warn("[Audio] Sound not preloaded yet.");
            return;
        }

        try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded) {
                console.log("[Audio] Playing preloaded sound...");
                // replayAsync() restarts the sound from the beginning if it was already playing
                await soundRef.current.replayAsync().catch(err => console.log("Replay ignore:", err));
                setIsRinging(true);
            }
        } catch (error) {
            console.error("[Audio] Play Error:", error);
            setIsRinging(false);
        }
    };

    const stopRing = async () => {
        if (!soundRef.current) return;

        try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
                console.log("[Audio] Stopping sound...");
                await soundRef.current.stopAsync();
            }
        } catch (error) {
            console.error("[Audio] Stop Error:", error);
        } finally {
            setIsRinging(false);
        }
    };
    // --- Audio Init & Cleanup ---
    useEffect(() => {
        let isMounted = true;

        const initAudio = async () => {
            try {
                // Configure Audio once
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: true,
                    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                    playThroughEarpieceAndroid: false
                });

                if (!isMounted) return;

                console.log("[Audio] Preloading sound...");
                const { sound } = await Audio.Sound.createAsync(
                    require('../assets/sounds/alert.mp3'),
                    { isLooping: true }
                );

                if (isMounted) {
                    soundRef.current = sound;
                }
                // CRITICAL FIX: Do NOT call sound.unloadAsync() here if !isMounted.
                // Calling unloadAsync() from the creation callback on a background thread
                // can cause the "Player accessed on wrong thread" crash. 
                // We let the JS garbage collector handle the orphaned object in that rare race case.
            } catch (error) {
                console.error("[Audio] Failed to init sound:", error);
            }
        };

        initAudio();

        return () => {
            isMounted = false;
            const sound = soundRef.current;
            // Detach ref immediately so other functions stop using it
            soundRef.current = null;

            if (sound) {
                console.log("[Audio] Cleaning up sound...");
                // Fire-and-forget unload. Do not await it in unmount.
                sound.unloadAsync().catch(err => {
                    // Ignore "Player accessed on wrong thread" or other unload errors here
                    console.log("[Audio] Unload ignored:", err.message);
                });
            }
        };
    }, []);
    // --- 4. API & STATUS ---
    const fetchInitialStatus = async () => {
        try {
            console.log("[WS] Checking for Active/Pending Jobs...");

            // 1. Check for Active/Pending Jobs
            const syncRes = await api.get("/jobs/SyncActiveJob/");

            // Check if we actually have a valid job object
            if (syncRes.data && syncRes.data.id && syncRes.data.status) {
                const jobData = syncRes.data;
                console.log(`[WS] Found job ID: ${jobData.id} with Status: ${jobData.status}`);

                // 2. Handle PENDING Job
                if (jobData.status === 'PENDING') {
                    setPendingJobs([jobData]);
                    console.log("[WS] Restored PENDING session.");
                }
                // 3. Handle ACTIVE Job (ACCEPTED, WORKING, etc.)
                else {
                    setJob(jobData);
                    console.log(`[WS] Restored ACTIVE session (${jobData.status}).`);

                    // CRITICAL FIX: Do NOT force updateStatus("WORKING") here.
                    // Trust the backend status ("ACCEPTED") received in syncRes.
                }

                // 4. Set Online State
                // If we have a job, we must be online.
                intendedOnlineState.current = true;
                setIsOnlineState(true);

                // OPTIONAL: Only call this if your useEffect doesn't automatically 
                // listen to 'isOnlineState' changes. If you have a useEffect listening 
                // to isOnlineState, DELETE the line below.
                connectWebSocket();

            } else {
                // 5. No Active Job - Default to Offline
                console.log("[WS] No active job found. Defaulting to OFFLINE.");

                intendedOnlineState.current = false;
                setIsOnlineState(false);

                // Sync this offline state to backend so it doesn't think we are available
                // Wrap in try-catch so a minor update failure doesn't crash the app
                try {
                    await updateStatus("OFFLINE");
                } catch (statusErr) {
                    console.warn("[WS] Failed to sync OFFLINE status:", statusErr.message);
                }
            }

        } catch (err) {
            console.error("[WS] Init Error:", err.message);
            // Safety: Default failure to offline to prevent ghost active states
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

    const isConnectingRef = useRef(false);

    // --- 5. WEBSOCKET ---
    const connectWebSocket = async () => {
        // Prevent multiple simultaneous connection attempts
        if (
            socketRef.current?.readyState === WebSocket.OPEN ||
            socketRef.current?.readyState === WebSocket.CONNECTING ||
            isConnectingRef.current
        ) return;

        try {
            isConnectingRef.current = true;
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
                isConnectingRef.current = false; // Reset flag on success
                setSocket(ws);
                setConnectionStatus('connected');
                cancelDisconnectedNotification(); // Cancel any existing disconnection notification

            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (e) { console.error(e); }
            };

            ws.onclose = () => {
                console.log("[WS] Disconnected");
                isConnectingRef.current = false; // Reset flag on close
                setSocket(null);
                setConnectionStatus('disconnected');

                // Show notification only if user intended to be online (unexpected disconnect)
                if (intendedOnlineState.current) {
                    displayDisconnectedNotification();
                    setTimeout(connectWebSocket, 3000);
                }
            };

            ws.onerror = (e) => {
                console.log("[WS] Error", e.message);
                isConnectingRef.current = false; // Reset flag on error
                setConnectionStatus('disconnected');
            };

        } catch (err) {
            console.error("[WS] Connect error:", err);
            isConnectingRef.current = false; // Reset flag on catch
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
    };

    const handleMessage = async (data) => {
        switch (data.type) {
            case "new_job":
                console.log("[WS] New Job:", data.service_request.id);

                // Deduplicate using Ref (prevents sound from playing multiple times)
                if (processedJobIds.current.has(data.service_request.id)) {
                    console.log(`[WS] Duplicate Job Alert ignored (Ref check): ${data.service_request.id}`);
                    return;
                }
                processedJobIds.current.add(data.service_request.id);

                setPendingJobs(prev => {
                    // Fail-safe deduplication for state
                    if (prev.some(j => j.id === data.service_request.id)) return prev;
                    return [...prev, data.service_request];
                });

                playNotificationSound(); // Play Sound (Restarts if already playing)
                if (AppState.currentState !== 'active' && notifee) {
                    await displayIncomingJobNotification(data.service_request);
                } else {
                    // If app is already open, show your internal JobNotificationPopup.js
                    playNotificationSound();
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

            const status = err.response?.status;
            if (status === 404 || status === 409 || status === 410 || status === 400) {
                Alert.alert("Job Unavailable", "This job is no longer available.");
                setPendingJobs(prev => prev.filter(j => j.id !== jobId));
            } else {
                Alert.alert("Error", "Could not accept job.");
            }
        }
    };

    const rejectJob = (jobId) => {
        console.log(`[JOB] Rejecting Job ID: ${jobId}`);
        stopRing(); // Stop ring immediately on reject

        setPendingJobs(prev => {
            const next = prev.filter(j => j.id !== jobId);
            return next;
        });
        if (notifee) notifee.cancelNotification(`job_alert_${jobId}`);
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
        isOnline, setIsOnline, connectionStatus, job, pendingJobs, acceptJob, rejectJob, completeJob, cancelJob, reconnect, stopRing, isRinging
    }), [isOnline, connectionStatus, job, pendingJobs, isRinging]);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};