import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Camera, CheckCircle, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function MechanicForm() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useTranslation();
    const { refreshProfile } = useAuth();

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
        email: params.email || '',
        mobile_number: '',
        profile_pic: null,
    });

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- FIXED IMAGE PICKER (Camera Only) ---
    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('form.permissionDenied'), t('form.cameraPermission'));
            return;
        }

        // Fix: Use string array ['images'] to avoid SDK 52 crash
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setFormData(prev => ({ ...prev, profile_pic: result.assets[0].uri }));
        }
    };

    // --- GEOLOCATION ---
    const getCurrentLocation = async () => {
        setLocationLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('form.permissionDenied'), t('form.locationPermission'));
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
            Alert.alert(t('form.error'), t('form.locationError'));
        } finally {
            setLocationLoading(false);
        }
    };

    // --- SUBMISSION LOGIC ---
    const handleSubmit = async () => {
        setLoading(true);

        try {
            const data = new FormData();

            data.append('first_name', formData.first_name);
            data.append('last_name', formData.last_name);
            data.append('adhar_card', formData.adhar_card);
            data.append('email', formData.email);

            // Format Phone Number
            let phone = formData.mobile_number;
            if (phone && !phone.startsWith('+')) {
                phone = `+91${phone}`;
            }
            data.append('mobile_number', phone);

            data.append('shop_name', formData.shop_name);
            data.append('shop_address', formData.shop_address);
            data.append('shop_latitude', formData.shop_latitude);
            data.append('shop_longitude', formData.shop_longitude);

            if (formData.profile_pic) {
                const uriParts = formData.profile_pic.split('.');
                const fileType = uriParts[uriParts.length - 1];

                data.append('profile_pic', {
                    uri: formData.profile_pic,
                    name: `profile.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            // 1. Send Data to Backend
            await api.post('/users/SetMechanicDetail/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Refresh the Profile in AuthContext
            // This pulls the new data (is_verified status) from the server
            await refreshProfile();

            Alert.alert(t('form.success'), t('form.profileSubmitted'));

            // 3. Navigate to Unverified Page
            // If the user IS verified, your _layout.tsx will automatically redirect them to Dashboard.
            // If NOT verified, they will stay on the Unverified page (Pending state).
            router.replace('/unverified');

        } catch (err) {
            console.error("Submission Error", err.response?.data);

            let errorMsg = "Failed to create profile.";
            if (err.response?.data?.mobile_number) {
                errorMsg = `Phone Error: ${err.response.data.mobile_number[0]}`;
            } else if (err.response?.data) {
                const keys = Object.keys(err.response.data);
                if (keys.length > 0) errorMsg = `${keys[0]}: ${err.response.data[keys[0]]}`;
            }

            Alert.alert(t('form.error'), errorMsg);
        } finally {
            setLoading(false);
        }
    };

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
        else Alert.alert(t('form.missingFields'), t('form.fillAllFields'));
    };

    const prevStep = () => setCurrentStep(c => c - 1);

    const renderStep = () => {
        switch (currentStep) {
            case 1: // Personal
                return (
                    <View className="space-y-4">
                        <View className="items-center mb-4">
                            <TouchableOpacity
                                onPress={openCamera}
                                className="h-28 w-28 bg-slate-100 rounded-full items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden shadow-sm"
                            >
                                {formData.profile_pic ? (
                                    <Image source={{ uri: formData.profile_pic }} className="w-full h-full" />
                                ) : (
                                    <View className="items-center">
                                        <Camera size={28} color="#64748b" />
                                        <Text className="text-xs text-slate-500 mt-2 font-medium">{t('form.takePhoto')}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <Text className="text-slate-400 text-xs mt-2">{t('form.tapToCapture')}</Text>
                        </View>

                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.firstName')}</Text>
                            <TextInput value={formData.first_name} onChangeText={t => handleChange('first_name', t)} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="John" />
                        </View>
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.lastName')}</Text>
                            <TextInput value={formData.last_name} onChangeText={t => handleChange('last_name', t)} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="Doe" />
                        </View>
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.aadharNumber')}</Text>
                            <TextInput value={formData.adhar_card} onChangeText={t => handleChange('adhar_card', t)} keyboardType="numeric" maxLength={12} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="1234 5678 9012" />
                        </View>
                    </View>
                );

            case 2: // Shop
                return (
                    <View className="space-y-4">
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.shopName')}</Text>
                            <TextInput value={formData.shop_name} onChangeText={t => handleChange('shop_name', t)} className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="My Auto Garage" />
                        </View>

                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.shopLocation')}</Text>
                            <TouchableOpacity
                                onPress={getCurrentLocation}
                                className="flex-row items-center bg-blue-50 border border-blue-200 p-3 rounded-xl mb-2"
                            >
                                {locationLoading ? <ActivityIndicator size="small" color="#2563eb" /> : <MapPin size={20} color="#2563eb" />}
                                <Text className="text-blue-600 font-semibold ml-2">
                                    {formData.shop_latitude ? t('form.updateLocation') : t('form.detectLocation')}
                                </Text>
                            </TouchableOpacity>

                            <TextInput
                                value={formData.shop_address}
                                onChangeText={t => handleChange('shop_address', t)}
                                multiline
                                numberOfLines={3}
                                className="bg-white border border-slate-300 p-3 rounded-xl h-24"
                                placeholder={t('form.fullAddress')}
                                style={{ textAlignVertical: 'top' }}
                            />
                        </View>
                    </View>
                );

            case 3: // Contact
                return (
                    <View className="space-y-4">
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.email')}</Text>
                            <TextInput value={formData.email} onChangeText={t => handleChange('email', t)} keyboardType="email-address" className="bg-white border border-slate-300 p-3 rounded-xl" placeholder="john@example.com" />
                        </View>
                        <View>
                            <Text className="text-slate-600 mb-1 font-medium">{t('form.mobileNumber')}</Text>
                            <View className="flex-row items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                                <View className="bg-slate-100 px-3 py-4 border-r border-slate-300">
                                    <Text className="text-slate-600 font-bold">+91</Text>
                                </View>
                                <TextInput
                                    value={formData.mobile_number}
                                    onChangeText={t => handleChange('mobile_number', t)}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    className="flex-1 p-3 text-base"
                                    placeholder="9876543210"
                                />
                            </View>
                            <Text className="text-xs text-slate-400 mt-1">{t('form.mobileHint')}</Text>
                        </View>
                    </View>
                );

            case 4: // Review
                return (
                    <View className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                        <Text className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">{t('form.reviewDetails')}</Text>

                        <View className="flex-row justify-between">
                            <Text className="text-slate-500">{t('form.name')}</Text>
                            <Text className="font-semibold">{formData.first_name} {formData.last_name}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-slate-500">{t('form.shop')}</Text>
                            <Text className="font-semibold">{formData.shop_name}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-slate-500">{t('form.phone')}</Text>
                            <Text className="font-semibold">+91 {formData.mobile_number}</Text>
                        </View>
                        <View>
                            <Text className="text-slate-500 mb-1">{t('form.address')}</Text>
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
                    <View className="mb-6">
                        <Text className="text-2xl font-bold text-slate-800">{t('form.title')}</Text>
                        <Text className="text-slate-500">{t('form.step')} {currentStep} {t('form.of')} {totalSteps}</Text>
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

                <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 flex-row justify-between items-center">
                    <TouchableOpacity
                        onPress={prevStep}
                        disabled={currentStep === 1}
                        className={`flex-row items-center px-4 py-3 rounded-xl ${currentStep === 1 ? 'opacity-0' : 'bg-slate-100'}`}
                    >
                        <ArrowLeft size={20} color="#334155" />
                        <Text className="ml-2 font-semibold text-slate-700">{t('form.back')}</Text>
                    </TouchableOpacity>

                    {currentStep < totalSteps ? (
                        <TouchableOpacity onPress={nextStep} className="flex-row items-center bg-slate-900 px-6 py-3 rounded-xl">
                            <Text className="mr-2 font-bold text-white">{t('form.next')}</Text>
                            <ArrowRight size={20} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center bg-blue-600 px-6 py-3 rounded-xl">
                            {loading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Text className="mr-2 font-bold text-white">{t('form.submit')}</Text>
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