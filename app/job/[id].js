import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, IndianRupee, XCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../context/LocationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../utils/api';

const { width, height } = Dimensions.get('window');

const SNAP_POINTS = {
    COLLAPSED: height * 0.50, // More space visible initially
    EXPANDED: height * 0.15,  // Drag higher up
};

// --- HELPER: Calculate Distance/ETA ---
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const calculateETA = (lat1, lon1, lat2, lon2) => {
    const dist = getDistanceInKm(lat1, lon1, lat2, lon2);
    if (!dist) return null;
    const avgSpeedKmh = 30; // Ave city speed
    return Math.ceil((dist / avgSpeedKmh) * 60);
};

export default function JobDetailsPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const mapRef = useRef(null);

    // Context Data
    const { job: activeJob, completeJob, cancelJob, setWorkingStatus } = useWebSocket();
    const { coords: mechanicCoords } = useLocationContext();
    const { profile: authUser } = useAuth();
    const userData = authUser || {};
    console.log(activeJob)
    // State
    const [currentJob, setCurrentJob] = useState(null);
    const [fetchingDetails, setFetchingDetails] = useState(true);
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [distance, setDistance] = useState(null);
    const [loadingAction, setLoadingAction] = useState(false);

    // Modals
    const [completeModalVisible, setCompleteModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [priceInput, setPriceInput] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [paymentStep, setPaymentStep] = useState('AMOUNT'); // AMOUNT, METHOD, QR
    const [paymentMethod, setPaymentMethod] = useState(null); // CASH, UPI

    // Animation States
    const [isJobCompleted, setIsJobCompleted] = useState(false);
    const [isJobCancelledState, setIsJobCancelledState] = useState(false);

    // --- JOB WORKFLOW STATES ---
    const [isNavigating, setIsNavigating] = useState(false);
    const [hasArrived, setHasArrived] = useState(false);

    // --- ADS STATE ---
    const [adsData, setAdsData] = useState([]);
    const [selectedAd, setSelectedAd] = useState(null);

    // --- BOTTOM SHEET ANIMATION ---
    const translateY = useSharedValue(SNAP_POINTS.COLLAPSED);
    const context = useSharedValue({ y: 0 });

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = event.translationY + context.value.y;
            translateY.value = Math.max(SNAP_POINTS.EXPANDED, Math.min(translateY.value, SNAP_POINTS.COLLAPSED + 50));
        })
        .onEnd(() => {
            if (translateY.value < (SNAP_POINTS.COLLAPSED + SNAP_POINTS.EXPANDED) / 2) {
                translateY.value = withTiming(SNAP_POINTS.EXPANDED, { duration: 300 });
            } else {
                translateY.value = withTiming(SNAP_POINTS.COLLAPSED, { duration: 300 });
            }
        });

    const rBottomSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            height: height,
            top: 0
        };
    });

    // --- 1. DATA LOADING ---
    const actionsPaused = useRef(false);

    useEffect(() => {
        let isMounted = true;

        // Prevent fetching if we are in the middle of completing/cancelling
        if (actionsPaused.current || isJobCompleted || isJobCancelledState) return;

        const loadJobData = async () => {
            console.log(`[JobDetails] Loading data for ID: ${id}`);
            if (activeJob && String(activeJob.id) === String(id)) {
                setCurrentJob(activeJob);
                setFetchingDetails(false);
                checkLocalArrival(id);
            } else {
                try {
                    const res = await api.get(`/jobs/ServiceRequest/${id}/`);
                    if (isMounted) setCurrentJob(res.data);
                } catch (error) {
                    // Ignore 404s if we just cancelled (double protection)
                    if (actionsPaused.current) return;

                    console.error(`Failed to fetch job details for ID ${id}:`, error);
                    let title = "Error";
                    let msg = "Could not load job details.";

                    if (error.response) {
                        if (error.response.status === 404) {
                            title = "Job Not Found";
                            msg = "This job may have been cancelled or does not exist.";
                        } else if (error.response.data && typeof error.response.data === 'string') {
                            msg = error.response.data;
                        } else if (error.response.data?.detail) {
                            msg = error.response.data.detail;
                        }
                    }

                    if (isMounted) {
                        Alert.alert(title, msg, [
                            { text: "Go Back", onPress: () => router.back() }
                        ]);
                    }
                } finally {
                    if (isMounted) {
                        setFetchingDetails(false);
                        checkLocalArrival(id);
                    }
                }
            }
        };

        const checkLocalArrival = async (jobId) => {
            try {
                const val = await AsyncStorage.getItem(`arrived_${jobId}`);
                if (val === 'true') {
                    setHasArrived(true);
                    setIsNavigating(true);
                }
            } catch (e) {
                console.log("Error checking local arrival:", e);
            }
        };

        loadJobData();
        return () => { isMounted = false; };
    }, [id, activeJob, isJobCompleted, isJobCancelledState]);

    // --- 1.1 SYNC STATUS ---
    useEffect(() => {
        if (currentJob?.status) {
            console.log(`[JobDetails] Syncing UI state with status: ${currentJob.status}`);
            if (currentJob.status === 'ARRIVED') {
                setHasArrived(true);
                setIsNavigating(true);
            } else if (currentJob.status === 'WORKING') {
                setIsNavigating(true);
                setHasArrived(false);
            } else if (currentJob.status === 'ACCEPTED') {
                setIsNavigating(false);
                setHasArrived(false);
            }
        }
    }, [currentJob?.status]);

    // --- 1.5 FETCH ADS ---
    useEffect(() => {
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
        fetchAds();
    }, []);

    // --- 2. MAP & ETA UPDATES ---
    useEffect(() => {
        if (!currentJob || !mechanicCoords) return;

        const custLat = parseFloat(currentJob.latitude);
        const custLng = parseFloat(currentJob.longitude);
        const mechLat = mechanicCoords.latitude;
        const mechLng = mechanicCoords.longitude;

        if (custLat && custLng && mechLat && mechLng) {
            const eta = calculateETA(mechLat, mechLng, custLat, custLng);
            const dist = getDistanceInKm(mechLat, mechLng, custLat, custLng);

            setEstimatedTime(eta);
            setDistance(dist);

            // Fit Map
            if (mapRef.current) {
                mapRef.current.fitToCoordinates(
                    [
                        { latitude: mechLat, longitude: mechLng },
                        { latitude: custLat, longitude: custLng }
                    ],
                    {
                        edgePadding: { top: 120, right: 50, bottom: height / 2, left: 50 },
                        animated: true,
                    }
                );
            }
        }
    }, [currentJob, mechanicCoords]);

    // --- ACTIONS ---
    const handleCallCustomer = () => {
        if (currentJob?.mobile_number) {
            Linking.openURL(`tel:${currentJob.mobile_number}`);
        } else {
            Alert.alert("Info", "Phone number not available");
        }
    };

    const handleNavigate = () => {
        const lat = currentJob?.latitude;
        const lng = currentJob?.longitude;
        if (!lat || !lng) return;

        // Update Status to WORKING for server tracking
        setWorkingStatus();

        const label = "Customer Location";
        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${label})`
        });
        Linking.openURL(url);
        // Switch purely to "Arriving" state UI
        setIsNavigating(true);
    };

    const submitCompletion = async () => {
        if (!priceInput || isNaN(priceInput) || parseFloat(priceInput) < 0) {
            Alert.alert("Invalid Price", "Please enter a valid amount.");
            return;
        }
        // Keep modal open to show loading state
        setLoadingAction(true);
        actionsPaused.current = true; // Pause fetches

        try {
            await completeJob(currentJob.id, parseFloat(priceInput));
            await AsyncStorage.removeItem(`arrived_${currentJob.id}`);
            setIsJobCompleted(true); // Trigger Animation
            setCompleteModalVisible(false); // Close only on success
            // Removed auto-redirect to allow user to view receipt
        } catch (err) {
            actionsPaused.current = false; // Resume on error
            Alert.alert("Error", "Failed to complete job.");
        } finally {
            setLoadingAction(false);
        }
    };

    const submitCancellation = async () => {
        if (!cancelReason.trim()) {
            Alert.alert("Required", "Please select or type a reason.");
            return;
        }
        setCancelModalVisible(false);
        setLoadingAction(true);
        actionsPaused.current = true; // Pause fetches

        try {
            await cancelJob(currentJob.id, cancelReason);
            await AsyncStorage.removeItem(`arrived_${currentJob.id}`);
            setIsJobCancelledState(true); // Trigger Animation
            setTimeout(() => router.replace('/(tabs)'), 3500);
        } catch (err) {
            actionsPaused.current = false; // Resume on error
            Alert.alert("Error", "Failed to cancel job.");
        } finally {
            setLoadingAction(false);
        }
    };

    const handleMechanicArrived = async () => {
        if (!currentJob?.id) return;
        setLoadingAction(true);
        try {
            // Some backends require an empty object for POST requests to ensure Content-Type headers are set correctly
            await api.post(`/jobs/MechanicArrived/${currentJob.id}/`, {});
            await AsyncStorage.setItem(`arrived_${currentJob.id}`, 'true');
            Alert.alert("Success", "Customer has been notified that you have arrived.");
            setHasArrived(true); // Update state to remove map and show completion options
        } catch (error) {
            console.error("Mechanic Arrived API Error Detail:", error.response?.data || error.message);
            Alert.alert("Error", "Failed to notify customer. " + (typeof error.response?.data === 'string' ? error.response.data : ''));
        } finally {
            setLoadingAction(false);
        }
    };


    // --- ADS DATA ---
    const RECOMMENDED_ADS = [
        { id: '1', title: 'Castrol Magnatec', subtitle: '20% Off Engine Oil', color: '#16a34a', icon: 'water' },
        { id: '2', title: 'RSA Shield', subtitle: 'Global Coverage', color: '#2563eb', icon: 'shield-checkmark' },
        { id: '3', title: 'Exide Battery', subtitle: '3 Year Warranty', color: '#dc2626', icon: 'battery-charging' },
    ];

    const renderAdItem = ({ item }) => (
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mr-3 p-3 w-64 flex-row items-center">
            <View className="p-3 rounded-xl mr-3" style={{ backgroundColor: item.color + '20' }}>
                <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View>
                <Text className="font-bold text-slate-800">{item.title}</Text>
                <Text className="text-xs text-slate-500">{item.subtitle}</Text>
            </View>
        </View>
    );

    const mapStyle = [
        { "elementType": "geometry", "stylers": [{ "color": "#f5f7fa" }] },
        { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#4a5568" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f7fa" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
        { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#e2e8f0", "weight": 1 }] },
    ];

    // --- RENDER HELPERS ---
    if (fetchingDetails || !currentJob) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-gray-500 font-bold">Loading Job Details...</Text>
            </SafeAreaView>
        );
    }



    const renderCompletionSuccess = () => (
        <Animated.View entering={FadeIn} className="absolute inset-0 bg-slate-50 z-50 items-center justify-center px-4">
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            <View className="w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 items-center">
                <Animated.View entering={ZoomIn.delay(200)} className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                    <CheckCircle size={48} color="#16a34a" />
                </Animated.View>

                <Animated.Text entering={FadeIn.delay(300)} className="text-2xl font-black text-slate-900 mb-2">Payment Received</Animated.Text>
                <Animated.Text entering={FadeIn.delay(400)} className="text-slate-500 font-medium mb-8">Job #{currentJob?.id || '0000'}</Animated.Text>

                <View className="w-full border-t border-dashed border-slate-200 py-6 mb-2">
                    <View className="flex-row justify-between mb-3">
                        <Text className="text-slate-500 font-medium">Amount Collected</Text>
                        <Text className="text-slate-900 font-bold text-2xl">₹ {parseFloat(priceInput || '0').toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-slate-500 font-medium">Payment Method</Text>
                        <Text className="text-slate-900 font-bold">{paymentMethod || 'CASH'}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-slate-500 font-medium">Date</Text>
                        <Text className="text-slate-900 font-bold">{new Date().toLocaleDateString()}</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-slate-500 font-medium">Time</Text>
                        <Text className="text-slate-900 font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>

                <View className="w-full bg-indigo-50 p-4 rounded-xl mb-6 border border-indigo-100 flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                    <Text className="text-indigo-700 font-bold ml-2">Transaction Successful</Text>
                </View>

                <TouchableOpacity
                    onPress={() => router.replace('/(tabs)')}
                    className="w-full bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-200"
                >
                    <Text className="text-white font-bold text-lg">Done</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderCancellationSuccess = () => (
        <Animated.View entering={FadeIn} className="absolute inset-0 bg-red-600 z-50 items-center justify-center px-6">
            <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
            <Animated.View entering={ZoomIn.delay(200)} className="w-32 h-32 bg-white rounded-full items-center justify-center mb-8 shadow-2xl">
                <XCircle size={64} color="#dc2626" />
            </Animated.View>
            <Animated.Text entering={FadeIn.delay(400)} className="text-3xl font-black text-white mb-2 text-center">Job Cancelled</Animated.Text>
            <Animated.Text entering={FadeIn.delay(600)} className="text-red-200 font-medium text-center text-lg">Returning to dashboard...</Animated.Text>
        </Animated.View>
    );

    return (
        <View style={{ flex: 1 }}>
            {isJobCompleted && renderCompletionSuccess()}
            {isJobCancelledState && renderCancellationSuccess()}

            <View className="flex-1 bg-white">
                {/* --- 1. MAP --- */}
                {/* --- 1. MAP (Only visible before Arrival) --- */}
                {!hasArrived ? (
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={{ flex: 1 }}
                        customMapStyle={mapStyle}
                        initialRegion={{
                            latitude: parseFloat(currentJob.latitude) || 20.59,
                            longitude: parseFloat(currentJob.longitude) || 78.96,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        {/* Route */}
                        {mechanicCoords && currentJob.latitude && (
                            <Polyline
                                coordinates={[
                                    { latitude: mechanicCoords.latitude, longitude: mechanicCoords.longitude },
                                    { latitude: parseFloat(currentJob.latitude), longitude: parseFloat(currentJob.longitude) }
                                ]}
                                strokeColor="#16a34a"
                                strokeWidth={3}
                                lineDashPattern={[10, 10]}
                            />
                        )}

                        {/* Customer Marker */}
                        <Marker coordinate={{ latitude: parseFloat(currentJob.latitude), longitude: parseFloat(currentJob.longitude) }}>
                            <View className="items-center justify-center">
                                <View className="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-lg">
                                    <Ionicons name="car" size={20} color="white" />
                                </View>
                                <View className="bg-white px-2 py-1 rounded-md mt-1 shadow-sm">
                                    <Text className="text-[10px] font-bold text-gray-700">Customer</Text>
                                </View>
                            </View>
                        </Marker>

                        {/* Mechanic Marker */}
                        {mechanicCoords && (
                            <Marker coordinate={mechanicCoords}>
                                <View className="items-center justify-center">
                                    <View className="bg-green-600 p-2 rounded-full border-2 border-white shadow-lg">
                                        <Ionicons name="navigate" size={20} color="white" />
                                    </View>
                                </View>
                            </Marker>
                        )}

                        {/* --- ADS MARKERS --- */}
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
                ) : (
                    // Placeholder when map is removed
                    <View className="flex-1 bg-slate-50 items-center pt-24">
                        <View className="w-32 h-32 bg-green-100 rounded-full items-center justify-center mb-4">
                            <Ionicons name="location" size={64} color="#16a34a" />
                        </View>
                        <Text className="text-2xl font-bold text-slate-900">Arrived at Location</Text>
                        <Text className="text-slate-500">Map closed to save battery</Text>
                    </View>
                )}

                {/* --- 2. HEADER --- */}
                {/* --- 2. HEADER --- */}
                {!hasArrived && (
                    <SafeAreaView className="absolute top-0 left-0 right-0 z-10 bg-green-600/95 shadow-lg pb-4 pt-2">
                        <StatusBar barStyle="dark-content" backgroundColor="#16a34a" />
                        <View className="px-4 flex-row items-center pb-2 pt-2 mt-5">
                            <TouchableOpacity onPress={() => router.back()} className="mr-3">
                                <Ionicons name="chevron-back" size={28} color="white" />
                            </TouchableOpacity>

                            <View className="flex-1">
                                <Text className="text-green-100 text-xs font-bold uppercase tracking-wider mb-0.5">
                                    Navigate to Customer
                                </Text>
                                <Text className="text-white text-2xl font-extrabold">
                                    {estimatedTime ? `${estimatedTime} mins away` : 'Calculating...'}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={handleNavigate} className="bg-white/20 p-2.5 rounded-full">
                                <Ionicons name="navigate-circle" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                )}

                {/* --- 3. DRAGGABLE SHEET --- */}
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, zIndex: 50 }, rBottomSheetStyle]}>

                        {/* Drag Handle */}
                        <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center top-3 absolute z-10" />

                        <ScrollView
                            className="px-6 pt-10 pb-10 flex-1"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: height * 0.5 }} // Ensure bottom content is scrollable
                        >

                            {/* Customer Profile */}
                            <View className="flex-row items-center gap-4 mb-8">
                                <View className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden shadow-sm">
                                    <Image source={{ uri: currentJob.user_profile_pic || 'https://via.placeholder.com/150' }} className="w-full h-full" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-gray-900">{currentJob.first_name} {currentJob.last_name}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <CheckCircle size={14} color="#16a34a" />
                                        <Text className="text-gray-500 text-xs ml-1 font-bold">Verified Customer</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={handleCallCustomer} className="w-12 h-12 bg-green-50 rounded-full border-2 border-green-100 items-center justify-center">
                                    <Feather name="phone-call" size={20} color="#16a34a" />
                                </TouchableOpacity>
                            </View>

                            {/* Job Details Card */}
                            <View className="bg-slate-50 p-5 rounded-3xl mb-8 border border-slate-100">
                                <View className="flex-row items-start justify-between">
                                    <View>
                                        <Text className="text-xs font-bold text-gray-400 uppercase mb-1">Vehicle</Text>
                                        <Text className="text-slate-900 font-bold text-lg capitalize">{currentJob.vehical_type || 'Unknown'}</Text>
                                    </View>
                                    <View className="bg-white p-2 rounded-xl">
                                        <Ionicons name="car-sport" size={24} color="#475569" />
                                    </View>
                                </View>
                                <View className="h-[1px] bg-slate-200 my-4" />
                                <View>
                                    <Text className="text-xs font-bold text-gray-400 uppercase mb-1">Reported Issue</Text>
                                    <Text className="text-slate-900 font-medium text-base leading-6">{currentJob.problem}</Text>
                                </View>
                            </View>
                            {/* Navigation Button */}
                            {/* --- ACTION BUTTONS --- */}

                            {/* PHASE 1: START NAVIGATION */}
                            {!isNavigating && !hasArrived && (
                                <View className="flex-row gap-3 mb-8">
                                    <TouchableOpacity
                                        onPress={() => setCancelModalVisible(true)}
                                        className="bg-red-600 px-6 py-5 rounded-2xl shadow-lg shadow-red-200"
                                    >
                                        <Ionicons name="close" size={24} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleNavigate}
                                        className="bg-slate-900 flex-1 flex-row items-center justify-center py-5 rounded-2xl shadow-xl shadow-slate-300"
                                    >
                                        <Ionicons name="navigate-circle" size={24} color="white" />
                                        <Text className="text-white font-black text-lg ml-3 uppercase tracking-wide">Start Navigation</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* PHASE 2: I HAVE ARRIVED */}
                            {isNavigating && !hasArrived && (
                                <View className="mb-8">
                                    <View className="flex-row gap-3 mb-3">
                                        <TouchableOpacity
                                            onPress={() => setCancelModalVisible(true)}
                                            className="bg-red-600 px-6 py-5 rounded-2xl shadow-lg shadow-red-200"
                                        >
                                            <Ionicons name="close" size={24} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleMechanicArrived}
                                            className="bg-green-600 flex-1 flex-row items-center justify-center py-5 rounded-2xl shadow-xl shadow-green-300"
                                        >
                                            <Ionicons name="location" size={24} color="white" />
                                            <Text className="text-white font-black text-lg ml-3 uppercase tracking-wide">I Have Arrived</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Re-open maps small button */}
                                    <TouchableOpacity onPress={handleNavigate} className="mt-3 bg-white border border-slate-200 py-3 rounded-xl items-center flex-row justify-center">
                                        <Ionicons name="map-outline" size={16} color="#64748b" />
                                        <Text className="text-slate-500 font-bold ml-2">Open Maps Again</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* PHASE 3: COMPLETE (Only after Arrival) */}
                            {hasArrived && (
                                <View className="mb-8">
                                    <TouchableOpacity
                                        onPress={() => setCompleteModalVisible(true)}
                                        className="w-full py-5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 items-center justify-center flex-row"
                                    >
                                        <CheckCircle size={24} color="white" style={{ marginRight: 12 }} />
                                        <Text className="text-white font-black text-lg uppercase tracking-wide">Complete Job</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Ads Scroller */}
                            <View className="mb-24">
                                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">You might need</Text>
                                <FlatList
                                    data={RECOMMENDED_ADS}
                                    renderItem={renderAdItem}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item.id}
                                />
                            </View>

                        </ScrollView>
                    </Animated.View>
                </GestureDetector>

                {/* --- MODALS --- */}
                {/* Complete Modal */}
                <Modal
                    animationType="fade"
                    transparent
                    visible={completeModalVisible}
                    onRequestClose={() => {
                        if (paymentStep === 'QR' || paymentStep === 'METHOD') setPaymentStep('AMOUNT');
                        else setCompleteModalVisible(false);
                    }}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-center items-center bg-slate-900/80 px-4">
                        <View className="bg-white w-full rounded-3xl p-6 items-center">

                            {/* STEP 1: AMOUNT */}
                            {paymentStep === 'AMOUNT' && (
                                <>
                                    <View className="bg-green-100 p-4 rounded-full mb-4"><IndianRupee size={32} color="#16a34a" /></View>
                                    <Text className="text-2xl font-bold text-slate-900 mb-2">Collect Payment</Text>
                                    <Text className="text-slate-500 text-center mb-6">Enter the final amount collected from customer.</Text>

                                    <TextInput
                                        value={priceInput}
                                        onChangeText={setPriceInput}
                                        keyboardType="numeric"
                                        placeholder="₹ 0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-bold text-center mb-6 text-slate-900"
                                        autoFocus
                                    />

                                    <View className="flex-row gap-3 w-full">
                                        <TouchableOpacity onPress={() => setCompleteModalVisible(false)} className="flex-1 py-4 bg-slate-100 rounded-xl items-center">
                                            <Text className="font-bold text-slate-600">Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (!priceInput || isNaN(priceInput) || parseFloat(priceInput) <= 0) {
                                                    Alert.alert("Invalid Amount", "Please enter a valid amount");
                                                    return;
                                                }
                                                setPaymentStep('METHOD');
                                            }}
                                            className="flex-1 py-4 bg-indigo-600 rounded-xl items-center shadow-lg shadow-indigo-200"
                                        >
                                            <Text className="font-bold text-white">Next</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}

                            {/* STEP 2: METHOD */}
                            {paymentStep === 'METHOD' && (
                                <>
                                    <Text className="text-xl font-bold text-slate-900 mb-6">Select Payment Method</Text>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setPaymentMethod('CASH');
                                            submitCompletion();
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4 flex-row items-center"
                                    >
                                        <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4">
                                            <IndianRupee size={24} color="#16a34a" />
                                        </View>
                                        <View>
                                            <Text className="text-lg font-bold text-slate-900">Cash</Text>
                                            <Text className="text-slate-500">Collect cash directly</Text>
                                        </View>
                                        <View className="flex-1 items-end">
                                            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setPaymentMethod('UPI');
                                            setPaymentStep('QR');
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 flex-row items-center"
                                    >
                                        <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                                            <Ionicons name="qr-code" size={24} color="#2563eb" />
                                        </View>
                                        <View>
                                            <Text className="text-lg font-bold text-slate-900">UPI / QR Code</Text>
                                            <Text className="text-slate-500">Generate payment QR</Text>
                                        </View>
                                        <View className="flex-1 items-end">
                                            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setPaymentStep('AMOUNT')} className="py-2">
                                        <Text className="font-bold text-slate-500">Back</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* STEP 3: QR CODE */}
                            {paymentStep === 'QR' && (
                                <>
                                    <Text className="text-xl font-bold text-slate-900 mb-2">Scan to Pay</Text>
                                    <Text className="text-slate-500 mb-6">Ask customer to scan this QR code</Text>

                                    <View className="p-4 bg-white border border-slate-200 rounded-2xl mb-6 shadow-sm">
                                        <QRCode
                                            value={`upi://pay?pa=${userData?.mobile_number ? userData.mobile_number.replace('+', '') : '0000000000'}@upi&pn=Mechanic&am=${priceInput}&tn=Service%20Payment`}
                                            size={200}
                                        />
                                    </View>

                                    <Text className="text-2xl font-black text-slate-900 mb-6">₹ {priceInput}</Text>

                                    <TouchableOpacity
                                        onPress={() => submitCompletion()}
                                        disabled={loadingAction}
                                        className="w-full py-4 bg-indigo-600 rounded-xl items-center shadow-lg shadow-indigo-200 mb-4"
                                    >
                                        {loadingAction ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white text-lg">Payment Received</Text>}
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setPaymentStep('METHOD')} className="py-2">
                                        <Text className="font-bold text-slate-500">Back</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Cancel Modal */}
                <Modal animationType="slide" transparent visible={cancelModalVisible} onRequestClose={() => setCancelModalVisible(false)}>
                    <View className="flex-1 justify-end bg-slate-900/60">
                        <View className="bg-white rounded-t-3xl p-6 h-[70%]">
                            <Text className="text-xl font-bold text-slate-900 mb-6">Cancellation Reason</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {["Customer requested cancel", "Unable to contact customer", "Vehicle issue too complex", "I had an emergency", "Parts not available"].map((r) => (
                                    <TouchableOpacity key={r} onPress={() => setCancelReason(r)} className={`p-4 rounded-xl border mb-3 flex-row justify-between ${cancelReason === r ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-slate-100'}`}>
                                        <Text className={`font-medium ${cancelReason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TextInput placeholder="Other reason..." value={cancelReason} onChangeText={setCancelReason} className="bg-slate-50 border border-slate-200 p-4 rounded-xl h-24 text-slate-700 mb-6" multiline textAlignVertical="top" />
                            </ScrollView>
                            <TouchableOpacity onPress={submitCancellation} disabled={loadingAction} className="bg-red-500 py-4 rounded-xl items-center shadow-lg shadow-red-200 mt-4">
                                {loadingAction ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Confirm Cancellation</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </View>

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
                            <XCircle size={24} color="white" />
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
                                    View Offer Now
                                </Text>
                                <MaterialIcons name="arrow-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}