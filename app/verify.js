import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Globe } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function VerifyScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams();

    // State Management

    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [otp, setOtp] = useState(new Array(6).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Timer State
    const [timer, setTimer] = useState(120);
    const [isResendDisabled, setIsResendDisabled] = useState(true);

    // Refs for the 6 inputs to manage focus
    const inputRefs = useRef([]);

    // Context data (ID and Key are critical for verification)
    const [ctx, setCtx] = useState({
        key: params.key || null,
        id: params.id || null,
        status: params.status || null,
        email: params.email || null,
    });

    const sessionCookie = params.cookie;
    // Timer Logic
    useEffect(() => {
        let interval;
        if (isResendDisabled && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setIsResendDisabled(false);
        }
        return () => clearInterval(interval);
    }, [isResendDisabled, timer]);

    // Handle Input Change
    const handleChange = (text, index) => {
        // Only allow numbers
        if (isNaN(text)) return;

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto-focus next input if typing a number
        if (text.length === 1 && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-focus previous input if deleting (handled better in onKeyPress)
    };

    // Handle Backspace
    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            // If current box is empty, move to previous
            if (!otp[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
                // Clear previous box value
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
            }
        }
    };

    // 1. Verify OTP Function
    const verifyOtp = async () => {
        setError('');
        const code = otp.join('');

        if (code.length !== 6) {
            setError('Please enter the full 6-digit code.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                key: ctx.key,
                id: ctx.id,
                otp: otp.join('')
            };

            console.log("[Verify] Session Cookie from params:", sessionCookie);
            console.log("[Verify] Sending OTP verification...");

            // 2. ATTACH THE COOKIE TO THE HEADERS
            const verifyRes = await api.post('/users/otp-verify/', payload, {
                headers: {
                    'Cookie': sessionCookie // <--- Send it back to the server
                }
            });

            console.log("[Verify] Response Status:", verifyRes.status);
            console.log("[Verify] Response Headers:", verifyRes.headers);

            // Check if verify response has a new cookie
            let newCookie = verifyRes.headers['set-cookie'];
            if (Array.isArray(newCookie)) {
                newCookie = newCookie.join('; ');
            }
            console.log("[Verify] New Cookie from verify response:", newCookie);

            // Use the cookie from verify response if available, otherwise use the one from login
            const cookieToSave = newCookie || sessionCookie || params.cookie;
            console.log("[Verify] Cookie to save:", cookieToSave);

            await login(
                { id: ctx.id, status: ctx.status }, // User Data
                cookieToSave // Cookie to save
            );

            // Navigate
            if (ctx.status === 'New User') {
                router.replace('/form');
            } else {
                router.replace('/dashboard');
            }

        } catch (err) {
            console.error('[Verify] Error:', err.response?.status, err.response?.data);
            setError('Verification failed. Session may have expired.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Resend OTP Function
    const resendOtp = async () => {
        if (isResendDisabled) return;
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/users/resend-otp/', { key: ctx.key, id: ctx.id });

            // Update Context with new keys if backend rotates them
            if (res.data.key) setCtx(prev => ({ ...prev, key: res.data.key }));
            if (res.data.id) setCtx(prev => ({ ...prev, id: res.data.id }));

            Alert.alert("Sent!", "A new code has been sent to your email.");

            // Reset Timer
            setIsResendDisabled(true);
            setTimer(120);
            setOtp(new Array(6).fill(''));
            inputRefs.current[0]?.focus();

        } catch (err) {
            setError('Could not resend code. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Format Timer (MM:SS)
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <LinearGradient
            colors={['#f8fafc', '#e2e8f0']}
            className="flex-1"
        >
            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 px-6"
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-4 mb-8"
                    >
                        <ArrowLeft color="#334155" size={24} />
                    </TouchableOpacity>

                    <View className="absolute top-4 right-0 z-50">
                        <TouchableOpacity
                            onPress={() => setShowLanguageModal(true)}
                            className="bg-white/80 p-2 rounded-full shadow-sm border border-slate-200"
                        >
                            <Globe size={24} color="#475569" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View className="items-center mb-10">
                            <Text className="text-3xl font-bold text-slate-800 text-center mb-2">
                                {t('verify.Verification')}
                            </Text>
                            <Text className="text-slate-500 text-center text-base px-8">
                                {t('verify.WeveSent')}
                            </Text>
                            {ctx.email && (
                                <View className="bg-blue-100 px-4 py-1 rounded-full mt-2">
                                    <Text className="text-blue-800 font-semibold">{ctx.email}</Text>
                                </View>
                            )}
                        </View>

                        {/* OTP Input Container */}
                        <View className="flex-row justify-between mb-8">
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => inputRefs.current[index] = ref}
                                    value={digit}
                                    onChangeText={(text) => handleChange(text, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-bold bg-white
                    ${digit ? 'border-slate-800 text-slate-800' : 'border-slate-300 text-slate-400'}
                    ${error ? 'border-red-500' : ''}
                  `}
                                />
                            ))}
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <Text className="text-red-500 text-center mb-4 font-medium">
                                {error}
                            </Text>
                        ) : null}

                        {/* Timer & Resend */}
                        <View className="items-center mb-8">
                            {isResendDisabled ? (
                                <Text className="text-slate-400">
                                    {t('verify.Resend code in')} <Text className="font-bold text-slate-600">{formatTime(timer)}</Text>
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={resendOtp}>
                                    <Text className="text-blue-600 font-bold text-lg">{t('verify.Resend code')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                            onPress={verifyOtp}
                            disabled={loading}
                            className={`w-full py-4 rounded-xl items-center shadow-lg ${loading ? 'bg-slate-400' : 'bg-slate-900'
                                }`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">{t('verify.Verify & Proceed')}</Text>
                            )}
                        </TouchableOpacity>

                        <LanguageModal
                            visible={showLanguageModal}
                            onClose={() => setShowLanguageModal(false)}
                        />

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}