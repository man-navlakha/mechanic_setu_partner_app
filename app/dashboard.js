import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Menu, Navigation, Wrench } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Switch, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
    const router = useRouter();
    const mapRef = useRef(null);

    // WebSocket Data (Mocking if context is missing or loading)
    // In real app: const ws = useWebSocket(); 
    // const { isOnline, job, basicNeeds } = ws || {};
    const isOnline = true; // Temporary for testing UI
    const basicNeeds = { first_name: "Setu", shop_name: "My Garage" };
    const job = null;

    // State
    const [location, setLocation] = useState(null);
    const [nearbyJobs, setNearbyJobs] = useState([]);
    const [pastJobs, setPastJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Get Live Location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            // Get initial location
            let currentLocation = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
            setLoading(false);

            // Watch for location changes (Real-time tracking)
            await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (newLoc) => {
                    setLocation(prev => ({
                        ...prev,
                        latitude: newLoc.coords.latitude,
                        longitude: newLoc.coords.longitude,
                    }));
                }
            );
        })();
    }, []);

    // 2. Fetch Jobs (Simulated)
    useEffect(() => {
        if (!location) return;

        // Simulate fetching nearby jobs
        const dynamicJobs = [
            { id: 1, lat: location.latitude + 0.002, lng: location.longitude + 0.002, title: "Flat Tire", price: "₹500" },
            { id: 2, lat: location.latitude - 0.003, lng: location.longitude - 0.001, title: "Battery Dead", price: "₹700" },
        ];
        setNearbyJobs(dynamicJobs);

    }, [location, isOnline]);


    // 3. Center Map on User
    const recenterMap = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion(location, 1000);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-slate-500">Locating you...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1">

            {/* --- MAP SECTION --- */}
            <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                className="flex-1 w-full h-full"
                initialRegion={location}
                showsUserLocation={true}
                showsMyLocationButton={false} // We build a custom one
                customMapStyle={mapStyle} // Optional: Dark mode or clean style
            >
                {/* Mechanic's Own Shop Marker (Optional if UserLocation is shown) */}
                {/* <Marker coordinate={location} title="You are here" /> */}

                {/* Nearby Jobs Markers */}
                {isOnline && nearbyJobs.map((j) => (
                    <Marker
                        key={j.id}
                        coordinate={{ latitude: j.lat, longitude: j.lng }}
                        title={j.title}
                        description={`Payout: ${j.price}`}
                    >
                        <View className="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg">
                            <Wrench size={16} color="white" />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* --- OVERLAYS --- */}
            <SafeAreaView className="absolute top-0 w-full" pointerEvents="box-none">

                {/* Navbar Overlay */}
                <View className="mx-4 mt-2 flex-row justify-between items-center bg-white/90 p-4 rounded-2xl shadow-lg backdrop-blur-md border border-slate-200">
                    <View>
                        <Text className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                            {isOnline ? "● ONLINE" : "○ OFFLINE"}
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                            {basicNeeds?.first_name || "Mechanic"}
                        </Text>
                    </View>

                    <TouchableOpacity
                        className="bg-slate-100 p-3 rounded-full"
                        onPress={() => Alert.alert("Menu", "Profile, Settings, History...")}
                    >
                        <Menu size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>

                {/* Active Job Alert (If any) */}
                {job && (
                    <View className="mx-4 mt-4 bg-blue-600 p-4 rounded-xl shadow-xl flex-row justify-between items-center">
                        <View>
                            <Text className="text-white font-bold text-lg">Active Job #{job.id}</Text>
                            <Text className="text-blue-100">{job.details || "Vehicle Breakdown"}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push(`/job/${job.id}`)}
                            className="bg-white px-4 py-2 rounded-lg"
                        >
                            <Text className="text-blue-600 font-bold">View</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </SafeAreaView>

            {/* --- BOTTOM PANEL --- */}
            <View className="absolute bottom-0 w-full bg-white rounded-t-3xl shadow-2xl p-6 pb-10">

                {/* Recenter Button (Floating above panel) */}
                <TouchableOpacity
                    onPress={recenterMap}
                    className="absolute -top-16 right-6 bg-white p-4 rounded-full shadow-xl border border-slate-100"
                >
                    <Navigation size={24} color="#2563eb" fill="#2563eb" />
                </TouchableOpacity>

                {/* Status Toggle */}
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-lg font-bold text-slate-800">Duty Status</Text>
                        <Text className="text-slate-500 text-sm">
                            {isOnline ? "You are receiving requests" : "You are currently offline"}
                        </Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#767577", true: "#2563eb" }}
                        thumbColor={isOnline ? "#ffffff" : "#f4f3f4"}
                        value={isOnline}
                        onValueChange={(val) => Alert.alert("Status", `Switching to ${val ? 'Online' : 'Offline'}`)}
                    />
                </View>

                {/* Stats Row */}
                <View className="flex-row justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <View className="items-center flex-1 border-r border-slate-200">
                        <Text className="text-slate-400 text-xs font-bold uppercase">Today's Earnings</Text>
                        <Text className="text-xl font-bold text-slate-800">₹1,200</Text>
                    </View>
                    <View className="items-center flex-1">
                        <Text className="text-slate-400 text-xs font-bold uppercase">Jobs Done</Text>
                        <Text className="text-xl font-bold text-slate-800">4</Text>
                    </View>
                </View>

            </View>
        </View>
    );
}

// Optional: Minimalist Map Style to make markers pop
const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#dadada" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#c9c9c9" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    }
];