import { MaterialIcons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Bell, Globe, HelpCircle, History, MapPin, Navigation, User, VolumeOff, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/AppMapView';

import DraggableBottomSheet from '../components/DraggableBottomSheet';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../utils/api';
const TOGGLE_WIDTH = 140; // Increased width for text

// Modern Light Map Style
const lightMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
];

// Modern Dark Map Style
const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#475569" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
];

// Re-integrated OnlineToggle Component
function OnlineToggle({ isOnline, setIsOnline, status }) {
    const { t } = useTranslation();
    // 0 = Offline (Left), 1 = Online (Right)
    const progress = useSharedValue(isOnline ? 1 : 0);

    // Sync shared value when prop changes
    useEffect(() => {
        progress.value = withTiming(isOnline ? 1 : 0, { duration: 300 });
    }, [isOnline]);

    const animatedStyle = useAnimatedStyle(() => {
        let bgColor = '#64748b'; // Default Grey

        if (progress.value === 1) {
            bgColor = status === 'WORKING' ? '#2563eb' : '#16a34a'; // Blue if Working, Green if Online
        }

        return {
            backgroundColor: bgColor,
        };
    });

    const handleToggle = () => {
        if (status === 'WORKING') return; // Disable toggle while working

        const next = !isOnline;
        setIsOnline(next);
        Haptics.impactAsync(
            next
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light
        );
    };

    return (
        <Pressable onPress={handleToggle}>
            <Animated.View
                style={[
                    {
                        width: TOGGLE_WIDTH,
                        paddingVertical: 8,
                        paddingHorizontal: 6,
                        borderRadius: 999,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 5,
                    },
                    animatedStyle,
                ]}
            >
                <MaterialIcons
                    name={status === 'WORKING' ? 'navigation' : (isOnline ? 'check-circle' : 'power-settings-new')}
                    size={22}
                    color="#fff"
                />

                <Text style={{
                    color: 'white',
                    fontWeight: '800',
                    fontSize: 16,
                    marginLeft: 8
                }}>
                    {status === 'WORKING' ? (t('dashboard.working') || 'WORKING') : (isOnline ? (t('dashboard.on') || 'ONLINE') : (t('dashboard.off') || 'OFFLINE'))}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const mapRef = useRef(null);
    const { user, profile, loading: authLoading } = useAuth();
    const { t } = useTranslation();
    const { isOnline, setIsOnline, connectionStatus, job, pendingJobs, acceptJob, rejectJob, mechanicCoords, reconnect, stopRing, isRinging } = useWebSocket();
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [viewingJobId, setViewingJobId] = useState(null);
    const [selectedAd, setSelectedAd] = useState(null); // State for selected Ad Popup
    const prevPendingLength = useRef(0);
    const hasAskedOverlay = useRef(false);
    const [adsData, setAdsData] = useState([]);


    // Auto-redirect to pending-jobs for ANY jobs (only once)
    const hasNavigated = useRef(false);

    useEffect(() => {
        const currentLength = pendingJobs.length;

        // If ANY jobs exist AND we haven't navigated yet
        if (currentLength > 0 && !hasNavigated.current) {
            hasNavigated.current = true;
            router.push('/pending-jobs');
            setViewingJobId(null); // Clear any popup (hiding popup for now)
            return;
        }

        // Reset navigation flag when no jobs
        if (currentLength === 0) {
            hasNavigated.current = false;
        }

        prevPendingLength.current = currentLength;
    }, [pendingJobs]);

    // Dark mode detection
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    // State
    const [location, setLocation] = useState(null);
    const [nearbyJobs, setNearbyJobs] = useState([]);
    const [pastJobs, setPastJobs] = useState([]);
    const [earnings, setEarnings] = useState({ total: 0, count: 0 });
    const [mapLoading, setMapLoading] = useState(true);

    // 1. INITIALIZE MAP
    useEffect(() => {
        let isMounted = true;
        (async () => {
            console.log("[Dashboard] Requesting Location Permissions...");
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log("[Dashboard] Location Permission Denied.");
                if (isMounted) setMapLoading(false);
                return;
            }

            console.log("[Dashboard] Permission Granted. Getting Location...");

            // OPTIMIZATION: Try last known location first (Fastest)
            let loc = await Location.getLastKnownPositionAsync({});
            if (loc && isMounted) {
                console.log("[Dashboard] Found Last Known Location.");
                setLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                });
                setMapLoading(false);
            }

            // Then try to get fresh high-accuracy location
            try {
                // Race a timeout against the location fetch to prevent hanging
                const freshLocPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

                const freshLoc = await Promise.race([freshLocPromise, timeoutPromise]);

                if (freshLoc && isMounted) {
                    console.log("[Dashboard] Got Fresh Location.");
                    setLocation({
                        latitude: freshLoc.coords.latitude,
                        longitude: freshLoc.coords.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                    });
                }
            } catch (e) {
                console.log("[Dashboard] Location fetch error or timeout:", e.message);
                // If we didn't have a last known location, we must stop loading anyway
                // We'll default to a fallback location (e.g. India center) if nothing found
                if (!loc && isMounted) {
                    setLocation({
                        latitude: 20.5937,
                        longitude: 78.9629,
                        latitudeDelta: 5.0,
                        longitudeDelta: 5.0,
                    });
                }
            } finally {
                if (isMounted) setMapLoading(false);
            }
        })();

        return () => { isMounted = false; };
    }, []);

    // 2. LIVE UPDATES
    useEffect(() => {
        if (mechanicCoords && mapRef.current && isOnline) {
            // Optional: mapRef.current.animateCamera({ center: mechanicCoords ... });
        }
    }, [mechanicCoords, isOnline]);

    // 3. FETCH DATA
    useEffect(() => {
        fetchJobHistory();
        fetchAds();
        if (isOnline && location) fetchNearbyJobs();
    }, [isOnline, location]);

    const fetchAds = async () => {
        try {
            const res = await api.get('/core/map-ads/');
            if (Array.isArray(res.data)) {
                setAdsData(res.data);
            }
        } catch (e) {
            console.log("Error fetching ads:", e);
        }
    };

    const fetchNearbyJobs = async () => {
        if (!location) return;
        // Mock Data for UI (Replace with API)
        setNearbyJobs([
            { id: 1, lat: location.latitude + 0.002, lng: location.longitude + 0.002, type: "test: Flat Tire", price: 120 },
            { id: 2, lat: location.latitude - 0.003, lng: location.longitude - 0.001, type: "test: Battery Dead", price: 300 },
        ]);
    };

    const fetchJobHistory = async () => {
        try {
            const res = await api.get('/Profile/MechanicHistory/');
            const history = res.data.job_history || [];
            const totalEarned = history.reduce((sum, j) => sum + (parseFloat(j.price) || 0), 0);
            setEarnings({ total: totalEarned, count: history.length });
            const validPast = history.filter(j => j.latitude && j.longitude && (j.status === 'ACCEPTED' || j.status === 'ARRIVED' || j.status === 'WORKING' || j.status === 'ACTIVE'));
            setPastJobs(validPast);
        } catch (e) { console.log(e); }
    };

    const recenterMap = async () => {
        let loc = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        }, 1000);
    };

    if (mapLoading || authLoading || !profile) {
        return (
            <View className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
                <ActivityIndicator size="large" color={isDark ? "#60a5fa" : "#2563eb"} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {/* --- MAP --- */}
            <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFillObject}
                initialRegion={location}
                showsUserLocation={true}
                showsMyLocationButton={false}
                customMapStyle={isDark ? darkMapStyle : lightMapStyle}
            >

                {/* --- ADS MARKERS (Click to Open Popup) --- */}
                {adsData.map((ad) => (
                    <Marker
                        key={`ad-${ad.id}`}
                        coordinate={{ latitude: ad.latitude, longitude: ad.longitude }}
                        onPress={() => setSelectedAd(ad)}
                    >
                        <View className="bg-white p-0.5 rounded-full border-2 border-amber-400 shadow-lg overflow-hidden" style={{ width: 36, height: 36 }}>
                            <Image
                                source={{ uri: ad.logo }}
                                className="w-full h-full rounded-full"
                                resizeMode="cover"
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* --- TOP AREA (Header + Pending Jobs) --- */}
            <View className="absolute top-0 w-full z-50" pointerEvents="box-none">
                {/* --- TOP BAR --- */}
                <View
                    className="w-full bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 rounded-b-2xl shadow-sm"
                    style={{ paddingTop: insets.top + 10, paddingBottom: 15 }}
                >
                    <View className="mx-4 flex-row justify-between items-center">

                        {/* USE THE ANIMATED TOGGLE COMPONENT HERE */}
                        <OnlineToggle isOnline={isOnline} setIsOnline={setIsOnline} status={job?.status} />

                        {/* Right: Icon Buttons */}
                        <View className="flex-row items-center">
                            {/* Help Button */}
                            <TouchableOpacity
                                onPress={() => {/* TODO: Open help */ }}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg border border-slate-100 dark:border-slate-700"
                            >
                                <HelpCircle size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                            </TouchableOpacity>

                            {/* Notification Button */}
                            <TouchableOpacity
                                onPress={() => {/* TODO: Open notifications */ }}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg ml-2 border border-slate-100 dark:border-slate-700"
                            >
                                <Bell size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                            </TouchableOpacity>

                            {/* Language Button */}
                            <TouchableOpacity
                                onPress={() => setShowLanguageModal(true)}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg ml-2 border border-slate-100 dark:border-slate-700"
                            >
                                <Globe size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                            </TouchableOpacity>

                            {/* Profile Button */}
                            <TouchableOpacity
                                onPress={() => router.push('/profile')}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg ml-2 border border-slate-100 dark:border-slate-700"
                            >
                                {profile.profile_pic ? <Image source={{ uri: profile.profile_pic }} className="w-5 h-5 rounded-full" /> : <User size={20} color={isDark ? "#94a3b8" : "#64748b"} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Active Job Floating Banner */}
                    {
                        job && (job.status === "WORKING" || job.status === "ACCEPTED" || job.status === "ARRIVED") && (
                            <View className="mx-4 mt-3 bg-slate-900 dark:bg-slate-800 rounded-2xl p-4 shadow-xl flex-row justify-between items-center border border-slate-700">
                                <View>
                                    <Text className="text-white font-bold text-base">{t('dashboard.activeJob')} #{job.id}</Text>
                                    <Text className="text-slate-300 text-xs mt-0.5">{job.vehical_type} • {job.problem}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <View className={`w-2 h-2 rounded-full mr-1.5 ${job.status === 'WORKING' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                        <Text className="text-xs text-white font-bold">{job.status}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => router.push(`/job/${job.id}`)}
                                    className="bg-blue-600 px-4 py-2 rounded-xl"
                                >
                                    <Text className="text-white font-bold text-xs">{t('dashboard.view')}</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }
                </View>

                {/* --- INCOMING JOBS LIST (Stacked below header) --- */}
                {pendingJobs && pendingJobs.length > 0 && !viewingJobId && (
                    <View className="mx-4 mt-2 max-h-[400px]">
                        <Text className="text-white bg-slate-800 self-start px-3 py-1 rounded-t-lg font-bold text-xs shadow-sm shadow-black">
                            {t('dashboard.incomingRequests')} ({pendingJobs.length})
                        </Text>
                        <View className="bg-slate-50 dark:bg-slate-800 rounded-b-xl rounded-tr-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {pendingJobs.map((pJob) => (
                                <Pressable
                                    key={pJob.id}
                                    onPress={() => setViewingJobId(pJob.id)}
                                    className="p-4 border-b border-slate-200 dark:border-slate-700 flex-row justify-between items-center active:bg-slate-100 dark:active:bg-slate-700 bg-white dark:bg-slate-800"
                                >
                                    <View className="flex-1 mr-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="font-bold text-slate-800 dark:text-slate-100 text-sm flex-1" numberOfLines={1}>
                                                {pJob.vehical_type || pJob.vehicle_type || 'Unknown'} • {pJob.problem}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                                            {pJob.location || "Location Shared"}
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center gap-3">
                                        <TouchableOpacity
                                            onPress={() => rejectJob(pJob.id)}
                                            className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-full"
                                        >
                                            <X size={16} color={isDark ? "#94a3b8" : "#64748b"} />
                                        </TouchableOpacity>

                                        <View className="bg-blue-100 dark:bg-blue-900/40 px-3 py-1.5 rounded-full">
                                            <Text className="text-blue-700 dark:text-blue-300 text-[10px] font-bold">{t('dashboard.view').toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
            </View>


            {/* --- BOTTOM SHEET (Draggable) --- */}
            <DraggableBottomSheet
                initialIndex={0}
                snapPoints={['30%', '45%', '85%']}
                className="mt-20 bottom-2"
                useScrollView={true} // <--- ADD THIS
            >
                {/* Status Display Row */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {isOnline ? t('dashboard.online') : t('dashboard.offline')}
                        </Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {isOnline ? t('dashboard.looking') : t('dashboard.goOnline')}
                        </Text>
                    </View>

                    {/* Connection Status Badge */}
                    <TouchableOpacity
                        onPress={connectionStatus === 'disconnected' && isOnline ? reconnect : undefined}
                        activeOpacity={connectionStatus === 'disconnected' && isOnline ? 0.7 : 1}
                        className={`flex-row items-center px-3 py-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-100 dark:bg-green-900/30' :
                            connectionStatus === 'connecting' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                connectionStatus === 'disconnected' && isOnline ? 'bg-red-100 dark:bg-red-900/30' :
                                    'bg-slate-100 dark:bg-slate-700'
                            }`}
                    >
                        {connectionStatus === 'connecting' ? (
                            <ActivityIndicator size={8} color={isDark ? "#fbbf24" : "#ca8a04"} style={{ marginRight: 6 }} />
                        ) : (
                            <View className={`w-2 h-2 rounded-full mr-2 ${connectionStatus === 'connected' ? 'bg-green-500' :
                                connectionStatus === 'disconnected' && isOnline ? 'bg-red-500' :
                                    'bg-slate-400'
                                }`} />
                        )}
                        <Text className={`text-xs font-semibold ${connectionStatus === 'connected' ? 'text-green-700 dark:text-green-400' :
                            connectionStatus === 'connecting' ? 'text-yellow-700 dark:text-yellow-400' :
                                connectionStatus === 'disconnected' && isOnline ? 'text-red-700 dark:text-red-400' :
                                    'text-slate-500 dark:text-slate-400'
                            }`}>
                            {connectionStatus === 'connected' ? t('dashboard.wsConnected') || 'Connected' :
                                connectionStatus === 'connecting' ? t('dashboard.wsConnecting') || 'Connecting...' :
                                    connectionStatus === 'disconnected' && isOnline ? `${t('dashboard.wsReconnect') || 'Tap to Reconnect'}` :
                                        t('dashboard.wsOffline') || 'Offline'}
                        </Text>
                    </TouchableOpacity>
                </View>



                {/* Earnings Card */}
                <View className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-5 border border-slate-100 dark:border-slate-600 flex-row divide-x divide-slate-200 dark:divide-slate-600 mb-6">
                    <View className="flex-1 items-center pr-4">
                        <View className="flex-row items-center mb-1">
                            <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase ml-1">  ₹ {t('dashboard.earnings')}</Text>
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">₹ {earnings.total}</Text>
                    </View>

                    <View className="flex-1 items-center pl-4">
                        <View className="flex-row items-center mb-1">
                            <History size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                            <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase ml-1">{t('dashboard.jobsDone')}</Text>
                        </View>
                        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">{earnings.count}</Text>
                    </View>
                </View>

                {/* Recent Jobs List */}
                <Text className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-3">
                    {t('dashboard.recentJobs')}
                </Text>

                {pastJobs.length === 0 ? (
                    <View className="items-center py-4">
                        <Text className="text-slate-400 dark:text-slate-500 font-medium text-sm">{t('dashboard.noRecentJobs')}</Text>
                    </View>
                ) : (
                    <BottomSheetFlatList
                        data={pastJobs}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                // REMOVED key={index} -> Caused ReferenceError
                                onPress={() => router.push(`/job/${item.id}`)}
                                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-3 flex-row justify-between items-center"
                            >
                                <View className="flex-1 mr-3">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="font-bold text-slate-800 dark:text-slate-100 text-base flex-1" numberOfLines={1}>
                                            {/* ENSURE THIS SAYS 'item.problem', NOT 'job.problem' */}
                                            {item.problem}
                                        </Text>
                                        {/* Redesigned Status Badge */}
                                        {(() => {
                                            const status = item.status;
                                            let bgClass = "bg-slate-100 dark:bg-slate-800";
                                            let textClass = "text-slate-500 dark:text-slate-400";

                                            switch (status) {
                                                case 'COMPLETED':
                                                    bgClass = "bg-green-100 dark:bg-green-500/20";
                                                    textClass = "text-green-700 dark:text-green-400";
                                                    break;
                                                case 'ACTIVE':
                                                case 'WORKING':
                                                case 'ARRIVED':
                                                case 'PICKED':
                                                    bgClass = "bg-blue-100 dark:bg-blue-500/20";
                                                    textClass = "text-blue-700 dark:text-blue-400";
                                                    break;
                                                case 'PENDING':
                                                    bgClass = "bg-amber-100 dark:bg-amber-500/20";
                                                    textClass = "text-amber-700 dark:text-amber-400";
                                                    break;
                                                case 'CANCELLED':
                                                case 'REJECTED':
                                                case 'EXPIRED':
                                                    bgClass = "bg-red-100 dark:bg-red-500/20";
                                                    textClass = "text-red-700 dark:text-red-400";
                                                    break;
                                            }

                                            return (
                                                <View className={`px-2.5 py-1 rounded-md ml-2 ${bgClass}`}>
                                                    <Text className={`text-[10px] font-bold tracking-wide uppercase ${textClass}`}>
                                                        {status}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                    </View>

                                    <View className="flex-row items-center">
                                        <MapPin size={10} color={isDark ? "#64748b" : "#94a3b8"} className="mr-1" />
                                        <Text className="text-slate-500 dark:text-slate-400 text-xs flex-1" numberOfLines={1}>
                                            {item.location || "Unknown Location"}
                                        </Text>
                                    </View>
                                    <Text className="text-slate-400 dark:text-slate-500 text-[10px] mt-1">
                                        {new Date(item.created_at).toDateString()}
                                    </Text>
                                </View>

                                <View className="items-end">
                                    <Text className="font-black text-slate-900 dark:text-slate-100 text-lg">₹{item.price || 0}</Text>
                                    <Text className="text-blue-500 dark:text-blue-400 text-[10px] font-bold">{t('dashboard.view').toUpperCase()}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />

                )}
            </DraggableBottomSheet>

            {/* Floating Recenter Button */}
            <TouchableOpacity
                onPress={recenterMap}
                className="absolute bottom-40 right-4 bg-white dark:bg-slate-800 p-3.5 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 z-40"
            >
                <Navigation size={22} color={isDark ? "#60a5fa" : "#2563eb"} fill={isDark ? "#60a5fa" : "#2563eb"} />
            </TouchableOpacity>

            {/* Global Stop Ring Button */}
            {isRinging && (
                <TouchableOpacity
                    onPress={stopRing}
                    className="absolute bottom-40 left-4 bg-red-500 p-3.5 rounded-full shadow-lg border border-red-400 z-40"
                >
                    <VolumeOff size={22} color="white" />
                </TouchableOpacity>
            )}



            {/* --- AD FULL SCREEN POPUP --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!selectedAd}
                onRequestClose={() => setSelectedAd(null)}
            >
                <View className="flex-1 justify-center items-center bg-black/80 p-4">
                    <View className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => setSelectedAd(null)}
                            className="absolute top-4 right-4 z-50 bg-black/20 p-2 rounded-full"
                        >
                            <X size={20} color="white" />
                        </TouchableOpacity>

                        {/* Unique Header Gradient based on Ad Data or Default */}
                        <LinearGradient
                            colors={selectedAd?.bgGradient || ['#4f46e5', '#ec4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="p-8 items-center justify-center pt-12"
                        >
                            <View className="bg-white p-2 rounded-2xl shadow-xl mb-4">
                                <Image
                                    source={{ uri: selectedAd?.logo }}
                                    className="w-20 h-20 rounded-xl"
                                    resizeMode="contain"
                                />
                            </View>
                            <Text className="text-white font-black text-2xl text-center shadow-md">
                                {selectedAd?.businessName}
                            </Text>
                        </LinearGradient>

                        <View className="p-6 items-center">
                            {/* Offer Section */}
                            {selectedAd?.offerTitle && (
                                <View className="mb-6 w-full items-center">
                                    <View className="bg-red-500 -rotate-2 px-4 py-1 self-center mb-2 shadow-sm">
                                        <Text className="text-white font-black tracking-widest text-xs uppercase">
                                            {selectedAd.offerTitle}
                                        </Text>
                                    </View>

                                    <Text className="text-slate-500 dark:text-slate-400 text-center font-medium text-sm mb-1">
                                        {selectedAd.offerSubtitle}
                                    </Text>

                                    <Text className="text-3xl font-black text-slate-800 dark:text-slate-100 text-center color-primary-600">
                                        {selectedAd.offerPrice}
                                    </Text>
                                </View>
                            )}

                            {/* Description if no offer details, or secondary text */}
                            <Text className="text-slate-500 text-center mb-6 leading-5 px-4">
                                {selectedAd?.description}
                            </Text>

                            {/* Call To Action */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (selectedAd?.link) Linking.openURL(selectedAd.link);
                                }}
                                className="w-full bg-slate-900 dark:bg-slate-700 py-4 rounded-xl flex-row justify-center items-center active:scale-95 transition-transform"
                                style={{
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 4.65,
                                    elevation: 8,
                                }}
                            >
                                <Text className="text-white font-bold text-lg mr-2">
                                    {t('dashboard.viewOffer') || "View Offer Now"}
                                </Text>
                                <MaterialIcons name="arrow-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <LanguageModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
            />
            {/* --- POPUP (Overlay - Temporarily Hidden) --- */}
            {/* 
            {(() => {
                const jobToShow = viewingJobId ? pendingJobs.find(j => j.id === viewingJobId) : null;

                if (jobToShow) {
                    return (
                        <JobNotificationPopup
                            job={jobToShow}
                            onAccept={() => {
                                acceptJob(jobToShow.id);
                                setViewingJobId(null);
                            }}
                            onReject={() => {
                                rejectJob(jobToShow.id);
                                setViewingJobId(null);
                            }}
                            onMinimize={() => {
                                stopRing();
                                setViewingJobId(null);
                            }}
                            onStopSound={stopRing}
                        />
                    );
                }
                return null;
            })()}
            */}
        </View >

    );
}