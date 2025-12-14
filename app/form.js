import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Camera, CheckCircle, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';

export default function MechanicForm() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // State
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const totalSteps = 4;

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        adhar_card: '',
        shop_name: '',
        shop_address: '',
        shop_latitude: '',
        shop_longitude: '',
        email: params.email || '', // Pre-fill if available
        mobile_number: '',
        profile_pic: null, // Stores the image URI
    });

    // Handle Text Change
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- FEATURE 1: IMAGE PICKER ---
    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5, // Compress image
        });

        if (!result.canceled) {
            setFormData(prev => ({ ...prev, profile_pic: result.assets[0].uri }));
        }
    };

    // --- FEATURE 2: GEOLOCATION ---
    const getCurrentLocation = async () => {
        setLocationLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Allow location access to detect your shop address.');
            setLocationLoading(false);
            return;
        }

        try {
            let location = await Location.getCurrentPositionAsync({});
            setFormData(prev => ({
                ...prev,
                shop_latitude: location.coords.latitude.toString(),
                shop_longitude: location.coords.longitude.toString()
            }));

            // Reverse Geocode (Get Address from Coords)
            let address = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            if (address.length > 0) {
                const addr = address[0];
                const fullAddress = `${addr.name || ''}, ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}, ${addr.postalCode || ''}`;
                handleChange('shop_address', fullAddress.replace(/^, /, '').replace(/, ,/g, ','));
            }
        } catch (error) {
            Alert.alert("Error", "Could not fetch location.");
        } finally {
            setLocationLoading(false);
        }
    };

    // --- SUBMISSION ---
    const handleSubmit = async () => {
        setLoading(true);

        try {
            // Create FormData object for file upload
            const data = new FormData();

            data.append('first_name', formData.first_name);
            data.append('last_name', formData.last_name);
            data.append('adhar_card', formData.adhar_card);
            data.append('email', formData.email);
            data.append('mobile_number', formData.mobile_number);
            data.append('shop_name', formData.shop_name);
            data.append('shop_address', formData.shop_address);
            data.append('shop_latitude', formData.shop_latitude);
            data.append('shop_longitude', formData.shop_longitude);

            // Handle Image File
            if (formData.profile_pic) {
                const uriParts = formData.profile_pic.split('.');
                const fileType = uriParts[uriParts.length - 1];

                data.append('profile_pic', {
                    uri: formData.profile_pic,
                    name: `profile.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            // Send to Backend (Note: Content-Type is automatic with FormData in React Native)
            await api.post('/users/SetMechanicDetail/', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    // Cookie is handled automatically if you passed it via params in previous step, 
                    // or if you are using a global interceptor. 
                    // If using the params method, add: 'Cookie': params.cookie
                }
            });

            Alert.alert("Success!", "Profile created successfully.");
            router.replace('/'); // Go to Dashboard

        } catch (err) {
            console.error("Submission Error", err.response?.data);
            Alert.alert("Error", "Failed to create profile. Please check your inputs.");
        } finally {
            setLoading(false);
        }
    };

    // Validation before moving next
    const validateStep = () => {
        if (currentStep === 1) {
            if (!formData.first_name || !formData.last_name || !formData.adhar_card) return false;
        }
        if (currentStep === 2) {
            if (!formData.shop_name || !formData.shop_address) return false;
        }
        if (currentStep === 3) {
            if (!formData.email || !formData.mobile_number) return false;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) setCurrentStep(c => c + 1);
        else Alert.alert("Missing Fields", "Please fill all required fields.");
    };

    const prevStep = () => setCurrentStep(c => c - 1);

    // --- RENDER STEPS ---
    const renderStep = () => {
        switch (currentStep) {
            case 1: // Personal
                return (
                    <View className="space-y-4">
                        <View className="items-center mb-4">
                            <TouchableOpacity onPress={pickImage} className="h-28 w-28 bg-slate-100 rounded-full items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden">
                                {formData.profile_pic ? (
                                    <Image source={{ uri: formData.profile_pic }} className="w-full h-full" />
                                ) : (
                                    <View className="items-center">
                                        <Camera size={24} color="#94a3b8" />
                                        <Text className="text-xs text-slate-400 mt-1">Upload Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">First Name</Text>
                            <TextInput value={formData.first_name} onChangeText={t => handleChange('first_name', t)} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="John" />
                        </View>
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">Last Name</Text>
                            <TextInput value={formData.last_name} onChangeText={t => handleChange('last_name', t)} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="Doe" />
                        </View>
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">Aadhar Number</Text>
                            <TextInput value={formData.adhar_card} onChangeText={t => handleChange('adhar_card', t)} keyboardType="numeric" maxLength={12} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="1234 5678 9012" />
                        </View>
                    </View>
                );

            case 2: // Shop
                return (
                    <View className="space-y-4">
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">Shop Name</Text>
                            <TextInput value={formData.shop_name} onChangeText={t => handleChange('shop_name', t)} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="My Auto Garage" />
                        </View>

                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">Shop Location</Text>
                            <TouchableOpacity
                                onPress={getCurrentLocation}
                                className="flex-row items-center bg-blue-50 border border-blue-200 p-3 rounded-xl mb-2"
                            >
                                {locationLoading ? <ActivityIndicator size="small" color="#2563eb" /> : <MapPin size={20} color="#2563eb" />}
                                <Text className="text-blue-600 font-semibold ml-2">
                                    {formData.shop_latitude ? "Update Location" : "Detect My Location"}
                                </Text>
                            </TouchableOpacity>

                            <TextInput
                                value={formData.shop_address}
                                onChangeText={t => handleChange('shop_address', t)}
                                multiline
                                numberOfLines={3}
                                className="bg-white border border-slate-300 p-3 rounded-xl h-24"
                                placeholder="Full Address"
                                style={{ textAlignVertical: 'top' }}
                            />
                        </View>
                    </View>
                );

            case 3: // Contact
                return (
                    <View className="space-y-4">
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">Email</Text>
                            <TextInput value={formData.email} onChangeText={t => handleChange('email', t)} keyboardType="email-address" className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="john@example.com" />
                        </View>
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">Mobile Number</Text>
                            <TextInput value={formData.mobile_number} onChangeText={t => handleChange('mobile_number', t)} keyboardType="phone-pad" maxLength={10} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="9876543210" />
                        </View>
                    </View>
                );

            case 4: // Review
                return (
                    <View className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                        <Text className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Review Details</Text>

                        <View className="flex-row justify-between">
                            <Text className="text-slate-500">Name</Text>
                            <Text className="font-semibold">{formData.first_name} {formData.last_name}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-slate-500">Shop</Text>
                            <Text className="font-semibold">{formData.shop_name}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-slate-500">Phone</Text>
                            <Text className="font-semibold">{formData.mobile_number}</Text>
                        </View>
                        <View>
                            <Text className="text-slate-500 mb-1">Address</Text>
                            <Text className="font-medium text-slate-800">{formData.shop_address}</Text>
                        </View>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                <View className="p-6">

                    {/* Header */}
                    <View className="mb-6">
                        <Text className="text-2xl font-bold text-slate-800">Complete Profile</Text>
                        <Text className="text-slate-500">Step {currentStep} of {totalSteps}</Text>

                        {/* Progress Bar */}
                        <View className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
                            <View
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            />
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {renderStep()}
                    </ScrollView>

                </View>

                {/* Footer Navigation */}
                <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 flex-row justify-between items-center">
                    <TouchableOpacity
                        onPress={prevStep}
                        disabled={currentStep === 1}
                        className={`flex-row items-center px-4 py-3 rounded-xl ${currentStep === 1 ? 'opacity-0' : 'bg-slate-100'}`}
                    >
                        <ArrowLeft size={20} color="#334155" />
                        <Text className="ml-2 font-semibold text-slate-700">Back</Text>
                    </TouchableOpacity>

                    {currentStep < totalSteps ? (
                        <TouchableOpacity onPress={nextStep} className="flex-row items-center bg-slate-900 px-6 py-3 rounded-xl">
                            <Text className="mr-2 font-bold text-white">Next</Text>
                            <ArrowRight size={20} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center bg-blue-600 px-6 py-3 rounded-xl">
                            {loading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Text className="mr-2 font-bold text-white">Submit</Text>
                                    <CheckCircle size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}