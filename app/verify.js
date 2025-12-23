import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Globe } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Timer State
    const [timer, setTimer] = useState(120);
    const [isResendDisabled, setIsResendDisabled] = useState(true);

    // Refs
    const inputRefs = useRef([]);

    // Context
    const [ctx, setCtx] = useState({
        key: params.key || null,
        id: params.id || null,
        status: params.status || null,
        email: params.email || null,
    });




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

    const handleChange = (text, index) => {
    // 1. Handle Pasting (if text length > 1)
    if (text.length > 1) {
        const pastedData = text.trim().slice(0, 6); // Take first 6 chars
        if (/^\d+$/.test(pastedData)) { // Check if it's only numbers
            const newOtp = [...otp];
            pastedData.split('').forEach((char, i) => {
                if (i < 6) newOtp[i] = char;
            });
            setOtp(newOtp);
            
            // Focus the last filled box or the next empty one
            const nextFocusIndex = pastedData.length < 6 ? pastedData.length : 5;
            inputRefs.current[nextFocusIndex]?.focus();
        }
        return;
    }

    // 2. Handle Normal Single Character Input
    if (isNaN(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text.length === 1 && index < 5) {
        inputRefs.current[index + 1]?.focus();
    }
};

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
            }
        }
    };

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
                otp: code
            };

            const verifyRes = await api.post('/users/otp-verify/', payload);

            // Extract the cookie from headers
            let newCookie = verifyRes.headers['set-cookie'];
            if (Array.isArray(newCookie)) {
                newCookie = newCookie.join('; ');
            }

            // CLEANUP: Don't call SecureStore.setItemAsync here. 
            // Just pass the cookie to the login function.
            await login(
                { id: ctx.id, status: ctx.status },
                newCookie || null
            );

            if (ctx.status === 'New User') {
                router.replace('/form');
            } else {
                router.replace('/dashboard');
            }

        } catch (err) {
            // This now correctly catches errors from both the API and the login function
            console.error('[Verify] Error:', err.message || err);
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        if (isResendDisabled) return;
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/users/resend-otp/', { key: ctx.key, id: ctx.id });
            if (res.data.key) setCtx(prev => ({ ...prev, key: res.data.key }));
            if (res.data.id) setCtx(prev => ({ ...prev, id: res.data.id }));

            Alert.alert("Sent!", "A new code has been sent to your email.");
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

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <LinearGradient
            colors={['#f8fafc', '#e2e8f0', '#cbd5e1']}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle="dark-content" />
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, paddingHorizontal: 24 }}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            marginTop: 16,
                            marginBottom: 32,
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            elevation: 2
                        }}
                    >
                        <ArrowLeft color="#334155" size={22} />
                    </TouchableOpacity>

                    {/* Language Switcher */}
                    <View style={{ position: 'absolute', top: 16, right: 24, zIndex: 50 }}>
                        <TouchableOpacity
                            onPress={() => setShowLanguageModal(true)}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                padding: 10,
                                borderRadius: 9999,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                elevation: 5
                            }}
                        >
                            <Globe size={22} color="#475569" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={{ alignItems: 'center', marginBottom: 40 }}>
                            <View style={{
                                backgroundColor: '#e0f2fe',
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 20
                            }}>
                                <Text style={{ fontSize: 36 }}>📧</Text>
                            </View>

                            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
                                {t('verify.Verification')}
                            </Text>
                            <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 16, paddingHorizontal: 32 }}>
                                {t('verify.WeveSent')}
                            </Text>
                            {ctx.email && (
                                <View style={{
                                    backgroundColor: '#e0f2fe',
                                    paddingHorizontal: 20,
                                    paddingVertical: 8,
                                    borderRadius: 9999,
                                    marginTop: 16,
                                    borderWidth: 1,
                                    borderColor: '#bae6fd'
                                }}>
                                    <Text style={{ color: '#0369a1', fontWeight: '600' }}>{ctx.email}</Text>
                                </View>
                            )}
                        </View>

                        {/* OTP Input Container */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, paddingHorizontal: 8 }}>
                            {otp.map((digit, index) => {
                                const isFocused = focusedIndex === index;
                                let borderColor = '#cbd5e1';
                                if (error) borderColor = '#ef4444';
                                else if (isFocused) borderColor = '#3b82f6';
                                else if (digit) borderColor = '#1e293b';

                                return (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => inputRefs.current[index] = ref}
                                        value={digit}
                                        onChangeText={(text) => handleChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        onFocus={() => setFocusedIndex(index)}
                                        onBlur={() => setFocusedIndex(-1)}
                                        keyboardType="number-pad"
                                       maxLength={index === focusedIndex ? 6 : 1}
                                        selectTextOnFocus
                                        style={{
                                            width: 45,
                                            height: 56,
                                            borderRadius: 12,
                                            textAlign: 'center',
                                            fontSize: 24,
                                            fontWeight: 'bold',
                                            borderWidth: 2,
                                            borderColor: borderColor,
                                            backgroundColor: error ? '#fef2f2' : (isFocused ? '#eff6ff' : 'white'),
                                            color: error ? '#dc2626' : (isFocused ? '#2563eb' : '#1e293b'),
                                            elevation: isFocused ? 4 : 0,
                                            shadowColor: isFocused ? '#3b82f6' : 'transparent',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.25,
                                            shadowRadius: 4
                                        }}
                                    />
                                )
                            })}
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <View style={{ backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#ef4444', padding: 16, marginBottom: 20, borderRadius: 8 }}>
                                <Text style={{ color: '#dc2626', fontWeight: '500', textAlign: 'center' }}>
                                    {error}
                                </Text>
                            </View>
                        ) : null}

                        {/* Timer & Resend */}
                        <View style={{ alignItems: 'center', marginBottom: 32 }}>
                            {isResendDisabled ? (
                                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 9999 }}>
                                    <Text style={{ color: '#64748b' }}>
                                        {t('verify.Resend code in')} <Text style={{ fontWeight: 'bold', color: '#334155' }}>{formatTime(timer)}</Text>
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={resendOtp}
                                    style={{
                                        backgroundColor: '#eff6ff',
                                        paddingHorizontal: 24,
                                        paddingVertical: 12,
                                        borderRadius: 9999,
                                        borderWidth: 1,
                                        borderColor: '#bfdbfe'
                                    }}
                                >
                                    <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 16 }}>{t('verify.Resend code')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                            onPress={verifyOtp}
                            disabled={loading || otp.join('').length !== 6}
                            style={{
                                width: '100%',
                                paddingVertical: 16,
                                borderRadius: 16,
                                alignItems: 'center',
                                backgroundColor: (loading || otp.join('').length !== 6) ? '#cbd5e1' : '#2563eb',
                                elevation: (loading || otp.join('').length !== 6) ? 0 : 6,
                                shadowColor: '#3b82f6',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{t('verify.Verify & Proceed')}</Text>
                            )}
                        </TouchableOpacity>

                        {/* Security Note */}
                        <View style={{ marginTop: 32, marginBottom: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                🔒 Your verification is secure and encrypted
                            </Text>
                        </View>

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