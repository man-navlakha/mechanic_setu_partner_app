import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowLeft,
    Car,
    CheckCircle,
    IndianRupee,
    MapPin,
    Navigation,
    Phone,
    XCircle
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWebSocket } from '../../context/WebSocketContext';

// --- HELPER: Calculate Distance ---
const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function JobDetailsPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const mapRef = useRef(null);

    const { job, completeJob, cancelJob, mechanicCoords } = useWebSocket();

    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);

    // Modals
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const [completeModalVisible, setCompleteModalVisible] = useState(false);
    const [priceInput, setPriceInput] = useState('');

    // 1. Initial Map Zoom
    useEffect(() => {
        if (mechanicCoords && job && mapRef.current) {
            mapRef.current.fitToCoordinates([
                { latitude: mechanicCoords.latitude, longitude: mechanicCoords.longitude },
                { latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) },
            ], {
                edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [mechanicCoords, job]);

    // 2. Calculate Distance
    useEffect(() => {
        if (mechanicCoords && job) {
            const dist = getDistanceInKm(
                mechanicCoords.latitude,
                mechanicCoords.longitude,
                parseFloat(job.latitude),
                parseFloat(job.longitude)
            );
            setDistance(dist);
        }
    }, [mechanicCoords, job]);

    // Actions
    const handleNavigate = () => {
        const lat = job?.latitude;
        const lng = job?.longitude;
        const label = "Customer Location";
        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${label})`
        });
        Linking.openURL(url);
    };

    const handleCall = () => {
        if (job?.mobile_number) Linking.openURL(`tel:${job.mobile_number}`);
        else Alert.alert("No Number", "Customer phone not available.");
    };

    const onCompleteBtnPress = () => {
        // --- DISTANCE CHECK (Optional: Comment out for testing) ---
        /*
        if (distance > 0.5) {
          Alert.alert("Too Far", "You must be within 500m of the customer to complete the job.");
          return;
        }
        */
        setCompleteModalVisible(true);
    };

    const submitCompletion = async () => {
        if (!priceInput || isNaN(priceInput) || parseFloat(priceInput) < 0) {
            Alert.alert("Invalid Price", "Please enter a valid amount.");
            return;
        }

        setLoading(true);
        try {
            await completeJob(job.id, parseFloat(priceInput));
            setCompleteModalVisible(false);
            // Context handles redirect
        } catch (err) {
            Alert.alert("Error", "Failed to complete job.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            Alert.alert("Required", "Please select or type a reason.");
            return;
        }
        setLoading(true);
        try {
            await cancelJob(job.id, cancelReason);
            setCancelModalVisible(false);
        } catch (err) {
            Alert.alert("Error", "Failed to cancel job.");
        } finally {
            setLoading(false);
        }
    };

    if (!job || String(job.id) !== String(id)) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-slate-500">Loading Job #{id}...</Text>
            </View>
        );
    }

    const isNear = distance !== null && distance <= 0.5;

    return (
        <View className="flex-1 bg-slate-50">

            {/* 1. HEADER */}
            <SafeAreaView className="absolute top-0 w-full z-10 pointer-events-box-none">
                <View className="mx-4 flex-row justify-between items-center pointer-events-auto">
                    <TouchableOpacity onPress={() => router.back()} className="bg-white p-3 rounded-full shadow-sm">
                        <ArrowLeft size={24} color="black" />
                    </TouchableOpacity>
                    <View className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                        <Text className="font-bold text-slate-800">Job #{job.id}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setCancelModalVisible(true)} className="bg-red-50 p-3 rounded-full border border-red-100 shadow-sm">
                        <XCircle size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* 2. MAP */}
            <View className="h-1/2 w-full relative">
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    showsUserLocation={true}
                    initialRegion={{
                        latitude: parseFloat(job.latitude),
                        longitude: parseFloat(job.longitude),
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    <Marker
                        coordinate={{ latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) }}
                        title="Customer"
                        description={job.problem}
                    >
                        <View className="bg-red-500 p-2 rounded-full border-2 border-white shadow-lg">
                            <Car size={20} color="white" />
                        </View>
                    </Marker>

                    {mechanicCoords && (
                        <Polyline
                            coordinates={[
                                { latitude: mechanicCoords.latitude, longitude: mechanicCoords.longitude },
                                { latitude: parseFloat(job.latitude), longitude: parseFloat(job.longitude) }
                            ]}
                            strokeColor="#2563eb"
                            strokeWidth={3}
                            lineDashPattern={[5, 5]}
                        />
                    )}
                </MapView>

                <TouchableOpacity
                    onPress={handleNavigate}
                    className="absolute bottom-6 right-6 bg-blue-600 flex-row items-center px-5 py-3 rounded-full shadow-xl"
                >
                    <Navigation size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Navigate</Text>
                </TouchableOpacity>
            </View>

            {/* 3. INFO SHEET */}
            <ScrollView className="flex-1 -mt-6 bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-inner">

                <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-row items-center">
                        <Image
                            source={{ uri: job.user_profile_pic || 'https://via.placeholder.com/100' }}
                            className="w-14 h-14 rounded-full bg-slate-200 border-2 border-slate-100"
                        />
                        <View className="ml-4">
                            <Text className="text-lg font-bold text-slate-900">{job.first_name} {job.last_name}</Text>
                            <Text className="text-slate-500 text-xs">Customer</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleCall} className="bg-green-100 p-3 rounded-full">
                        <Phone size={24} color="#16a34a" />
                    </TouchableOpacity>
                </View>

                <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 mb-6">
                    <View className="flex-row items-start">
                        <Car size={20} color="#64748b" className="mt-0.5 mr-3" />
                        <View className="flex-1">
                            <Text className="text-xs text-slate-500 uppercase font-bold">Vehicle</Text>
                            <Text className="text-base font-semibold text-slate-800">{job.vehical_type || "Unknown"}</Text>
                        </View>
                    </View>

                    <View className="h-[1px] bg-slate-200 w-full" />

                    <View className="flex-row items-start">
                        <AlertTriangle size={20} color="#ea580c" className="mt-0.5 mr-3" />
                        <View className="flex-1">
                            <Text className="text-xs text-slate-500 uppercase font-bold">Problem</Text>
                            <Text className="text-base font-semibold text-slate-800">{job.problem}</Text>
                        </View>
                    </View>

                    <View className="h-[1px] bg-slate-200 w-full" />

                    <View className="flex-row items-start">
                        <MapPin size={20} color="#2563eb" className="mt-0.5 mr-3" />
                        <View className="flex-1">
                            <Text className="text-xs text-slate-500 uppercase font-bold">Distance</Text>
                            <Text className="text-base font-semibold text-slate-800">
                                {distance ? `${distance.toFixed(2)} km away` : "Calculating..."}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 4. MAIN ACTION */}
                <TouchableOpacity
                    onPress={onCompleteBtnPress}
                    className={`w-full py-4 rounded-xl flex-row justify-center items-center shadow-md ${isNear ? 'bg-green-600' : 'bg-green-600 opacity-90'}`}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <CheckCircle size={20} color="white" className="mr-2" />
                            <Text className="text-white font-bold text-lg">Complete Job</Text>
                        </>
                    )}
                </TouchableOpacity>

                {!isNear && (
                    <Text className="text-center text-xs text-amber-600 mt-2 font-medium">
                        Note: You are currently far from the location.
                    </Text>
                )}

            </ScrollView>

            {/* --- COMPLETE JOB MODAL (Fix for Android) --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={completeModalVisible}
                onRequestClose={() => setCompleteModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 justify-center items-center bg-black/60 px-4"
                >
                    <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                        <View className="items-center mb-6">
                            <View className="bg-green-100 p-4 rounded-full mb-3">
                                <CheckCircle size={32} color="#16a34a" />
                            </View>
                            <Text className="text-2xl font-bold text-slate-800">Job Done!</Text>
                            <Text className="text-slate-500 text-center">Please enter the final amount collected from the customer.</Text>
                        </View>

                        <View className="flex-row items-center border border-slate-300 rounded-xl px-4 py-3 mb-6 bg-slate-50 focus:border-green-500">
                            <IndianRupee size={20} color="#64748b" />
                            <TextInput
                                value={priceInput}
                                onChangeText={setPriceInput}
                                keyboardType="numeric"
                                placeholder="Enter Amount"
                                className="flex-1 ml-2 text-xl font-bold text-slate-800 h-8"
                                autoFocus={true}
                            />
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setCompleteModalVisible(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 items-center"
                            >
                                <Text className="font-bold text-slate-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitCompletion}
                                className="flex-1 py-3 rounded-xl bg-green-600 items-center"
                            >
                                <Text className="font-bold text-white">Complete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- CANCEL MODAL --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={cancelModalVisible}
                onRequestClose={() => setCancelModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-slate-800">Cancel Job</Text>
                            <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                                <XCircle size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-500 mb-4">Reason for cancellation:</Text>

                        <View className="space-y-2 mb-4">
                            {["Customer requested cancel", "Unable to contact customer", "Vehicle issue too complex", "I had an emergency"].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setCancelReason(r)}
                                    className={`p-4 rounded-xl border ${cancelReason === r ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
                                >
                                    <Text className={`font-medium ${cancelReason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            placeholder="Other reason..."
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6"
                        />

                        <TouchableOpacity
                            onPress={handleCancel}
                            className="bg-red-600 w-full py-4 rounded-xl items-center"
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Confirm Cancellation</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}