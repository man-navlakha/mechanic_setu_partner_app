import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Globe, History, Navigation, User, Wrench } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import JobNotificationPopup from '../components/JobNotificationPopup';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../utils/api';

// Modern Dark/Light Map Style
const mapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
];

export default function Dashboard() {
    const router = useRouter();
    const mapRef = useRef(null);
    const { user, profile } = useAuth();
    const { t } = useTranslation();
    const { isOnline, setIsOnline, job, acceptJob, rejectJob, mechanicCoords } = useWebSocket();
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // State
    const [location, setLocation] = useState(null);
    const [nearbyJobs, setNearbyJobs] = useState([]);
    const [pastJobs, setPastJobs] = useState([]);
    const [earnings, setEarnings] = useState({ total: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    // 1. INITIALIZE MAP
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLoading(false);
                return;
            }
            let loc = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            });
            setLoading(false);
        })();
    }, []);

    // 2. LIVE UPDATES
    useEffect(() => {
        if (mechanicCoords && mapRef.current && isOnline) {
            // Optional: Smoothly animate map to follow user
            // mapRef.current.animateCamera({ center: mechanicCoords, pitch: 0, heading: 0 }, { duration: 1000 });
        }
    }, [mechanicCoords, isOnline]);

    // 3. FETCH DATA
    useEffect(() => {
        fetchJobHistory();
        if (isOnline && location) fetchNearbyJobs();
    }, [isOnline, location]);

    const fetchNearbyJobs = async () => {
        if (!location) return;
        // Mock Data for UI (Replace with API)
        setNearbyJobs([
            { id: 1, lat: location.latitude + 0.002, lng: location.longitude + 0.002, type: "Flat Tire", price: 500 },
            { id: 2, lat: location.latitude - 0.003, lng: location.longitude - 0.001, type: "Battery Dead", price: 700 },
        ]);
    };

    const fetchJobHistory = async () => {
        try {
            const res = await api.get('/Profile/MechanicHistory/');
            const history = res.data.job_history || [];
            const totalEarned = history.reduce((sum, j) => sum + (parseFloat(j.price) || 0), 0);
            setEarnings({ total: totalEarned, count: history.length });
            const validPast = history.filter(j => j.latitude && j.longitude && j.status === 'COMPLETED');
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

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" />

            {/* --- MAP --- */}
            <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFillObject}
                initialRegion={location}
                showsUserLocation={true}
                showsMyLocationButton={false}
                customMapStyle={mapStyle}
            >
                {isOnline && nearbyJobs.map(j => (
                    <Marker key={j.id} coordinate={{ latitude: j.lat, longitude: j.lng }} title={j.type}>
                        <View className="bg-blue-600 p-2 rounded-full border-2 border-white shadow-md">
                            <Wrench size={16} color="white" />
                        </View>
                    </Marker>
                ))}
                {/* {pastJobs.map(j => (
                    <Marker key={`past-${j.id}`} coordinate={{ latitude: parseFloat(j.latitude), longitude: parseFloat(j.longitude) }} opacity={0.6}>
                        <View className="bg-slate-200 p-1.5 rounded-full border border-slate-400">
                            <History size={14} color="#64748b" />
                        </View>
                    </Marker>
                ))} */}
            </MapView>

            {/* --- TOP BAR --- */}
            <SafeAreaView className="absolute top-0 w-full bg-white/60 dark:bg-slate-800/80 h-24 border-b-2 border-slate-300 z-50" pointerEvents="box-none">
                <View className="mx-4 flex-row justify-between items-start pt-2">

                    <TouchableOpacity
                        onPress={() => setShowLanguageModal(true)}
                        className="bg-white/80 p-2 ml-2 rounded-full shadow-sm border border-slate-500"
                    >
                        <Globe size={30} color="#000000ff" />
                    </TouchableOpacity>


                    {/* Profile Pill */}
                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        className="flex-row items-center bg-white backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-500"
                    >
                        <View className={`w-4 h-4 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                        <Text className="font-bold text-slate-800 text-lg">{profile?.shop_name || "Mechanic"}</Text>



                    </TouchableOpacity>
                    {/* Language Switcher Button (Top Right) */}




                    {/* Menu Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        className="bg-white/90 p-2.5 rounded-full shadow-sm border border-slate-400"
                    >
                        <User size={30} color="#1e293b" />
                    </TouchableOpacity>
                </View>

                {/* Active Job Floating Banner */}
                {job && job.status === "WORKING" && (
                    <View className="mx-4 mt-4 bg-slate-900 rounded-2xl p-4 shadow-xl flex-row justify-between items-center">
                        <View>
                            <Text className="text-white font-bold text-base">{t('dashboard.activeJob')} #{job.id}</Text>
                            <Text className="text-slate-300 text-xs mt-0.5">{job.vehical_type} • {job.problem}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push(`/job/${job.id}`)}
                            className="bg-blue-600 px-4 py-2 rounded-xl"
                        >
                            <Text className="text-white font-bold text-xs">{t('dashboard.view')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            {/* --- BOTTOM SHEET --- */}
            <View className="absolute bottom-0 w-full bg-white rounded-t-[32px] shadow-[0_-5px_30px_rgba(0,0,0,0.08)] border-t border-slate-500 p-6 pb-10">

                {/* Recenter Button (Floating) */}
                <TouchableOpacity
                    onPress={recenterMap}
                    className="absolute -top-6 right-6 bg-white p-3.5 rounded-2xl shadow-lg border border-slate-50"
                >
                    <Navigation size={22} color="#2563eb" fill="#2563eb" />
                </TouchableOpacity>

                {/* Status Toggle Row */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-xl font-bold text-slate-900">
                            {isOnline ? t('dashboard.online') : t('dashboard.offline')}
                        </Text>
                        <Text className="text-slate-500 text-xs mt-0.5">
                            {isOnline ? t('dashboard.looking') : t('dashboard.goOnline')}
                        </Text>
                    </View>

                    <View className="flex-row items-center bg-slate-50 rounded-full p-1 border border-slate-100">
                        <Text className={`text-xs font-bold px-3 ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                            {isOnline ? t('dashboard.on') : t('dashboard.off')}
                        </Text>
                        <Switch
                            trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
                            thumbColor={"#ffffff"}
                            ios_backgroundColor="#cbd5e1"
                            onValueChange={setIsOnline}
                            value={isOnline}
                            style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                        />
                    </View>
                </View>

                {/* Earnings Card */}
                <View className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex-row divide-x divide-slate-200">
                    <View className="flex-1 items-center pr-4">
                        <View className="flex-row items-center mb-1">

                            <Text className="text-slate-500 text-xs font-bold uppercase ml-1">  ₹ {t('dashboard.earnings')}</Text>
                        </View>
                        <Text className="text-2xl font-black text-slate-900">₹ {earnings.total}</Text>
                    </View>

                    <View className="flex-1 items-center pl-4">
                        <View className="flex-row items-center mb-1">
                            <History size={14} color="#64748b" />
                            <Text className="text-slate-500 text-xs font-bold uppercase ml-1">{t('dashboard.jobsDone')}</Text>
                        </View>
                        <Text className="text-2xl font-black text-slate-900">{earnings.count}</Text>
                    </View>
                </View>

            </View>

            {/* --- POPUP (Overlay) --- */}
            {job && job.status === "PENDING" && (
                <JobNotificationPopup
                    job={job}
                    onAccept={() => acceptJob(job.id)}
                    onReject={rejectJob}
                />
            )}

            <LanguageModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
            />

        </View>


    );
}