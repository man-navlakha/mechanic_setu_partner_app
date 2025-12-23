import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowLeft,
    Car,
    CheckCircle,
    Clock,
    IndianRupee,
    MapPin,
    Navigation,
    Phone,
    Shield,
    XCircle
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableBottomSheet from '../../components/DraggableBottomSheet';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../utils/api'; // Import API to fetch non-active jobs

// --- HELPER: Calculate Distance ---
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null; // Safety check
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const { width } = Dimensions.get('window');

export default function JobDetailsPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const mapRef = useRef(null);
    const { t } = useTranslation();

    // Rename 'job' to 'activeJob' to avoid confusion
    const { job: activeJob, completeJob, cancelJob, mechanicCoords } = useWebSocket();

    // Local state for the job we are actually viewing (could be active OR history)
    const [currentJob, setCurrentJob] = useState(null);
    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(true);

    // Modals
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [completeModalVisible, setCompleteModalVisible] = useState(false);
    const [priceInput, setPriceInput] = useState('');

    // --- 1. DETERMINE JOB SOURCE (Active vs API) ---
    useEffect(() => {
        let isMounted = true;

        const loadJobData = async () => {
            // Case A: The requested ID matches the currently Active Job in context
            if (activeJob && String(activeJob.id) === String(id)) {
                setCurrentJob(activeJob);
                setFetchingDetails(false);
            }
            // Case B: Mismatch or No Active Job -> Fetch from API (History/Pending view)
            else {
                try {
                    // Assuming endpoint structure: GET /jobs/ServiceRequest/{id}/
                    // Adjust URL based on your actual backend API
                    const res = await api.get(`/jobs/ServiceRequest/${id}/`);
                    if (isMounted) {
                        setCurrentJob(res.data);
                    }
                } catch (error) {
                    console.error("Failed to fetch job details:", error);
                    Alert.alert("Error", "Could not load job details.");
                } finally {
                    if (isMounted) setFetchingDetails(false);
                }
            }
        };

        loadJobData();
        return () => { isMounted = false; };
    }, [id, activeJob]); // Re-run if ID changes or Active Job updates

    // --- 2. MAP & DISTANCE LOGIC ---
    useEffect(() => {
        if (!currentJob) return;

        // Only calculate live distance if this IS the active job and we have coords
        if (isActiveSession && mechanicCoords) {
            const dist = getDistanceInKm(
                mechanicCoords.latitude,
                mechanicCoords.longitude,
                parseFloat(currentJob.latitude),
                parseFloat(currentJob.longitude)
            );
            setDistance(dist);
        }

        // Fit map bounds
        if (mapRef.current && currentJob.latitude && currentJob.longitude) {
            const points = [
                { latitude: parseFloat(currentJob.latitude), longitude: parseFloat(currentJob.longitude) }
            ];
            // Include mechanic in view only if active
            if (isActiveSession && mechanicCoords) {
                points.push({ latitude: mechanicCoords.latitude, longitude: mechanicCoords.longitude });
            }

            mapRef.current.fitToCoordinates(points, {
                edgePadding: { top: 120, right: 60, bottom: 60, left: 60 },
                animated: true,
            });
        }
    }, [mechanicCoords, currentJob]);

    // Check if the viewed job is the one currently being worked on
    const isActiveSession = activeJob && currentJob && String(activeJob.id) === String(currentJob.id);

    // Actions
    const handleNavigate = () => {
        const lat = currentJob?.latitude;
        const lng = currentJob?.longitude;
        if (!lat || !lng) return;

        const label = "Customer Location";
        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleCall = () => {
        if (currentJob?.mobile_number) Linking.openURL(`tel:${currentJob.mobile_number}`);
        else Alert.alert(t('job.noNumber'), t('job.phoneNotAvailable'));
    };

    const onCompleteBtnPress = () => {
        setCompleteModalVisible(true);
    };

    const submitCompletion = async () => {
        if (!priceInput || isNaN(priceInput) || parseFloat(priceInput) < 0) {
            Alert.alert(t('job.invalidPrice'), t('job.enterValidAmount'));
            return;
        }

        setLoading(true);
        try {
            await completeJob(currentJob.id, parseFloat(priceInput));
            setCompleteModalVisible(false);
        } catch (err) {
            Alert.alert(t('form.error'), t('job.failedComplete'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            Alert.alert(t('job.required'), t('job.selectOrTypeReason'));
            return;
        }
        setLoading(true);
        try {
            await cancelJob(currentJob.id, cancelReason);
            setCancelModalVisible(false);
            router.replace('/dashboard');
        } catch (err) {
            Alert.alert(t('form.error'), t('job.failedCancel'));
        } finally {
            setLoading(false);
        }
    };

    if (fetchingDetails) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <View className="bg-white p-6 rounded-full shadow-lg mb-6">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
                <Text className="text-slate-600 font-medium text-lg tracking-wide">{t('job.fetchingDetails')}</Text>
            </View>
        );
    }

    if (!currentJob) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-slate-500">Job not found.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-indigo-600 px-6 py-2 rounded-full">
                    <Text className="text-white font-bold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }
const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            // If no history exists (e.g., opened via Active Tab), go to Dashboard
            router.replace('/(tabs)'); 
        }
    };
    const isNear = distance !== null && distance <= 0.5;

    return (
        <View className="flex-1 bg-slate-50">

            {/* 1. FLOATING HEADER */}
           <SafeAreaView className="absolute top-0 w-full z-20 pointer-events-box-none">
                <View className="mx-5 flex-row justify-between items-center pointer-events-auto">
                    
                    {/* UPDATE THIS TOUCHABLEOPACITY */}
                    <TouchableOpacity
                        onPress={handleBack} 
                        className="bg-white/90 p-3.5 rounded-2xl shadow-sm border border-slate-100/50 backdrop-blur-md"
                    >
                        <ArrowLeft size={22} color="#1e293b" strokeWidth={2.5} />
                    </TouchableOpacity>

                    <View className="bg-white/90 px-4 py-2.5 rounded-full shadow-sm border border-slate-100/50 backdrop-blur-md flex-row items-center space-x-2">
                        <View className={`w-2 h-2 rounded-full ${isActiveSession ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                        <Text className="font-bold text-slate-700 tracking-wide text-sm">JOB #{currentJob.id}</Text>
                    </View>

                    {/* Only show Cancel button if Active */}
                    {isActiveSession ? (
                        <TouchableOpacity
                            onPress={() => setCancelModalVisible(true)}
                            className="bg-white/90 p-3.5 rounded-2xl shadow-sm border border-red-50/50 backdrop-blur-md"
                        >
                            <XCircle size={22} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                    ) : <View className="w-12" />}
                </View>
            </SafeAreaView>

            {/* 2. MAP SECTION */}
            <View className="flex-1 w-full relative">
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    showsUserLocation={true}
                    initialRegion={{
                        latitude: parseFloat(currentJob.latitude) || 23.0, // Fallback to avoid crash
                        longitude: parseFloat(currentJob.longitude) || 72.5,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    <Marker
                        coordinate={{ latitude: parseFloat(currentJob.latitude) || 0, longitude: parseFloat(currentJob.longitude) || 0 }}
                        title="Customer"
                        description={currentJob.problem}
                    >
                        <View className="items-center justify-center">
                            <View className="bg-indigo-600 p-2.5 rounded-full border-4 border-white shadow-xl">
                                <Car size={20} color="white" />
                            </View>
                        </View>
                    </Marker>

                    {/* Only show Polyline if Active Session */}
                    {isActiveSession && mechanicCoords && (
                        <Polyline
                            coordinates={[
                                { latitude: mechanicCoords.latitude, longitude: mechanicCoords.longitude },
                                { latitude: parseFloat(currentJob.latitude), longitude: parseFloat(currentJob.longitude) }
                            ]}
                            strokeColor="#4f46e5"
                            strokeWidth={4}
                            lineDashPattern={[10, 10]}
                        />
                    )}
                </MapView>

                {/* Floating Map Actions */}
                <View className="absolute bottom-32 right-5 space-y-3 z-10">
                    <TouchableOpacity
                        onPress={handleNavigate}
                        className="bg-blue-600 p-4 rounded-full shadow-blue-500/30 shadow-xl flex-row items-center border-2 border-white/20"
                    >
                        <Navigation size={24} color="white" fill="white" />
                    </TouchableOpacity>
                </View>
                <View className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
            </View>

            {/* 3. INFO SHEET */}
            <DraggableBottomSheet snapPoints={['40%', '60%', '90%']} initialIndex={0}>

                {/* Customer Profile Header */}
                <View className="flex-row items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <View className="flex-row items-center flex-1 mr-4">
                        <Image
                            source={{ uri: currentJob.user_profile_pic || 'https://via.placeholder.com/100' }}
                            className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-white shadow-sm"
                        />
                        <View className="ml-4 flex-1">
                            <Text className="text-xl font-bold text-slate-900" numberOfLines={1}>
                                {currentJob.first_name} {currentJob.last_name}
                            </Text>
                            <View className="flex-row items-center mt-0.5">
                                <Shield size={12} color="#64748b" />
                                <Text className="text-slate-500 text-xs ml-1 font-medium">{t('job.verifiedCustomer')}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleCall}
                        className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100"
                    >
                        <Phone size={24} color="#10b981" />
                    </TouchableOpacity>
                </View>

                {/* Job Details Grid */}
                <Text className="text-slate-900 font-bold text-lg mb-4">{t('job.serviceDetails')}</Text>

                <View className="space-y-4 mb-8">
                    {/* Vehicle & Problem - Unchanged */}
                    <View className="flex-row bg-slate-50 p-4 rounded-2xl border border-slate-100 items-center">
                        <View className="bg-indigo-100 p-3 rounded-xl">
                            <Car size={22} color="#4338ca" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('job.vehicle')}</Text>
                            <Text className="text-base font-semibold text-slate-800 mt-0.5 max-w-[90%]">{currentJob.vehical_type || t('job.unknownVehicle')}</Text>
                        </View>
                    </View>

                    <View className="flex-row bg-orange-50 p-4 rounded-2xl border border-orange-100 items-center">
                        <View className="bg-orange-100 p-3 rounded-xl">
                            <AlertTriangle size={22} color="#ea580c" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-xs text-orange-600/70 font-bold uppercase tracking-wider">{t('job.reportedIssue')}</Text>
                            <Text className="text-base font-semibold text-slate-800 mt-0.5 leading-5">{currentJob.problem}</Text>
                        </View>
                    </View>

                    {/* Distance: Only show if live calculation is available, otherwise show address or hidden */}
                    <View className="flex-row justify-between space-x-4">
                        <View className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-row items-center">
                            <MapPin size={18} color="#64748b" />
                            <View className="ml-3">
                                <Text className="text-xs text-slate-400 font-bold uppercase">{t('job.distance')}</Text>
                                <Text className="text-sm font-bold text-slate-800">
                                    {distance ? `${distance.toFixed(1)} km` : "N/A"}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-row items-center">
                            <Clock size={18} color="#64748b" />
                            <View className="ml-3">
                                <Text className="text-xs text-slate-400 font-bold uppercase">{t('job.eta')}</Text>
                                <Text className="text-sm font-bold text-slate-800">
                                    {distance ? `${Math.ceil(distance * 3)} mins` : "N/A"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- ACTION BUTTON (Only if Active) --- */}
                {isActiveSession ? (
                    <>
                        <TouchableOpacity
                            onPress={onCompleteBtnPress}
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all transform ${isNear ? 'bg-indigo-600' : 'bg-slate-800'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <CheckCircle size={22} color="white" className="mr-2.5" strokeWidth={2.5} />
                                    <Text className="text-white font-bold text-lg tracking-wide">
                                        {t('job.completeJob')}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {!isNear && (
                            <View className="flex-row items-center justify-center mt-4 mb-2 space-x-2 opacity-70">
                                <MapPin size={14} color="#64748b" />
                                <Text className="text-xs text-slate-500 font-medium">
                                    You are {distance ? distance.toFixed(1) : '?'}km away from location
                                </Text>
                            </View>
                        )}
                    </>
                ) : (
                    // Read-only Status for History
                    <View className="w-full bg-slate-100 py-4 rounded-2xl items-center">
                        <Text className="text-slate-500 font-bold">Status: {currentJob.status}</Text>
                    </View>
                )}

                {/* Ads Section (Keep as is) */}
                <View className="mt-8 pt-6 border-t border-slate-100">
                    {/* ... ads code ... */}
                </View>

            </DraggableBottomSheet>

            {/* --- COMPLETE & CANCEL MODALS (Keep existing code) --- */}
            {/* The logic inside them uses currentJob.id now, which is correct */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={completeModalVisible}
                onRequestClose={() => setCompleteModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 justify-center items-center bg-slate-900/70 backdrop-blur-sm px-5"
                >
                    <View className="bg-white w-full max-w-[340px] rounded-[32px] p-6 shadow-2xl items-center">
                        <View className="bg-green-100 w-16 h-16 rounded-full items-center justify-center mb-5 ring-4 ring-green-50">
                            <CheckCircle size={32} color="#16a34a" strokeWidth={3} />
                        </View>

                        <Text className="text-2xl font-bold text-slate-900 mb-2">{t('job.jobSuccessful')}</Text>
                        <Text className="text-slate-500 text-center text-sm mb-8 px-4 leading-5">
                            {t('job.enterAmount')}
                        </Text>

                        <View className="w-full flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mb-2 focus:border-indigo-500 focus:bg-white transition-colors">
                            <IndianRupee size={24} color="#334155" />
                            <TextInput
                                value={priceInput}
                                onChangeText={setPriceInput}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#cbd5e1"
                                className="flex-1 ml-3 text-2xl font-bold text-slate-900 h-10 p-0"
                                autoFocus={true}
                                selectionColor="#4f46e5"
                            />
                        </View>
                        <Text className="text-xs text-slate-400 self-start ml-2 mb-6">{t('job.totalAmount')}</Text>

                        <View className="flex-row gap-3 w-full">
                            <TouchableOpacity
                                onPress={() => setCompleteModalVisible(false)}
                                className="flex-1 py-4 rounded-2xl bg-slate-100 items-center active:bg-slate-200"
                            >
                                <Text className="font-bold text-slate-600 text-[15px]">{t('job.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitCompletion}
                                className="flex-1 py-4 rounded-2xl bg-indigo-600 items-center shadow-lg shadow-indigo-300 active:bg-indigo-700"
                            >
                                <Text className="font-bold text-white text-[15px]">{t('job.confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={cancelModalVisible}
                onRequestClose={() => setCancelModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-slate-900/60">
                    <View className="bg-white rounded-t-[36px] p-6 shadow-2xl h-[75%]">
                        <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />

                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-2xl font-bold text-slate-900">{t('job.cancelJob')}</Text>
                                <Text className="text-slate-500 text-sm mt-1">{t('job.selectReason')}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setCancelModalVisible(false)}
                                className="bg-slate-100 p-2 rounded-full"
                            >
                                <XCircle size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                            <View className="space-y-3 mb-6">
                                {["Customer requested cancel", "Unable to contact customer", "Vehicle issue too complex", "I had an emergency", "Parts not available"].map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => setCancelReason(r)}
                                        className={`p-4 rounded-2xl border-2 flex-row items-center justify-between transition-all ${cancelReason === r ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-transparent'}`}
                                    >
                                        <Text className={`font-semibold text-[15px] ${cancelReason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</Text>
                                        {cancelReason === r && <CheckCircle size={18} color="#b91c1c" />}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="text-slate-900 font-bold mb-3">{t('job.otherReason')}</Text>
                            <TextInput
                                placeholder={t('job.typeReason')}
                                value={cancelReason}
                                onChangeText={setCancelReason}
                                multiline
                                textAlignVertical="top"
                                className="bg-slate-50 border border-slate-200 p-4 rounded-2xl h-24 text-slate-700 text-base"
                            />
                        </ScrollView>

                        <View className="pt-4 border-t border-slate-100">
                            <TouchableOpacity
                                onPress={handleCancel}
                                disabled={loading}
                                className="bg-red-500 w-full py-4 rounded-2xl items-center shadow-lg shadow-red-200 flex-row justify-center space-x-2"
                            >
                                {loading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <AlertTriangle size={20} color="white" />
                                        <Text className="text-white font-bold text-lg">{t('job.confirmCancel')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}