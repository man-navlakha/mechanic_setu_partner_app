import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Globe } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import safeStorage from '../utils/storage';

export default function VerifyScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const [timer, setTimer] = useState(10);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [isInvalidUser, setIsInvalidUser] = useState(false);

  const inputRefs = useRef([]);

  const [ctx, setCtx] = useState({
    key: params.key || null,
    id: params.id || null,
    status: params.status || null,
    email: params.email || null
  });

  /* ---------------- Timer Logic ---------------- */
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

  /* ---------------- OTP Logic ---------------- */

  const handleChange = (text, index) => {
    if (text.length > 1) {
      const pasted = text.trim().slice(0, 6);
      if (/^\d+$/.test(pasted)) {
        const newOtp = [...otp];
        pasted.split('').forEach((char, i) => {
          if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      }
      return;
    }

    if (isNaN(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  /* ---------------- Verify OTP ---------------- */

  const verifyOtp = async () => {
    setError('');
    const code = otp.join('');

    if (code.length !== 6) {
      setError('Enter full 6-digit code.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('users/otp-verify/', {
        key: ctx.key,
        id: ctx.id,
        otp: code
      });

      const data = res?.data || {};
      const access =
        data.access || data.access_token || data?.tokens?.access;
      const refresh =
        data.refresh || data.refresh_token || data?.tokens?.refresh;

      if (access) await safeStorage.setItem('access', access);
      if (refresh) await safeStorage.setItem('refresh', refresh);

      await login(
        { id: ctx.id, status: ctx.status },
        null
      );

      if (ctx.status === 'New User') {
        router.replace('/form');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 404 && data?.error) {
        setIsInvalidUser(true);
        Alert.alert("Notice", data.error, [
          { text: "Go to Login", onPress: () => router.replace('/login') }
        ]);
      } else {
        setError('Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Resend OTP ---------------- */

  const resendOtp = async () => {
    if (isResendDisabled) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('users/resend-otp/', {
        key: ctx.key,
        id: ctx.id
      });

      if (res.data.key) setCtx(prev => ({ ...prev, key: res.data.key }));
      if (res.data.id) setCtx(prev => ({ ...prev, id: res.data.id }));

      Alert.alert("Sent!", "New code sent to your email.");

      setIsResendDisabled(true);
      setTimer(120);
      setOtp(new Array(6).fill(''));
      inputRefs.current[0]?.focus();

    } catch {
      setError('Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /* =================== UI =================== */

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, paddingHorizontal: 24 }}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 16,
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#111827',
              borderWidth: 1,
              borderColor: '#334155',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft color="#f8fafc" size={20} />
          </TouchableOpacity>

          {/* Language */}
          <View style={{ position: 'absolute', top: 16, right: 0 }}>
            <TouchableOpacity
              onPress={() => setShowLanguageModal(true)}
              style={{
                backgroundColor: '#111827',
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155'
              }}
            >
              <Globe size={20} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 40 }}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={{
                fontSize: 26,
                fontWeight: '800',
                color: '#f8fafc',
                textAlign: 'center'
              }}>
                {t('verify.Verification')}
              </Text>

              <Text style={{
                color: '#94a3b8',
                textAlign: 'center',
                marginTop: 8
              }}>
                {t('verify.WeveSent')}
              </Text>

              {ctx.email && (
                <View style={{
                  backgroundColor: '#111827',
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 12,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: '#334155'
                }}>
                  <Text style={{ color: '#f97316', fontWeight: '600' }}>
                    {ctx.email}
                  </Text>
                </View>
              )}
            </View>

            {/* OTP Boxes */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 30
            }}>
              {otp.map((digit, index) => {
                const isFocused = focusedIndex === index;

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
                    maxLength={1}
                    style={{
                      width: 45,
                      height: 55,
                      borderRadius: 12,
                      textAlign: 'center',
                      fontSize: 22,
                      fontWeight: 'bold',
                      backgroundColor: '#0f172a',
                      borderWidth: 1,
                      borderColor: error
                        ? '#ef4444'
                        : isFocused
                        ? '#f97316'
                        : '#334155',
                      color: '#f8fafc'
                    }}
                  />
                );
              })}
            </View>

            {error ? (
              <Text style={{
                color: '#f87171',
                textAlign: 'center',
                marginBottom: 20
              }}>
                {error}
              </Text>
            ) : null}

            {/* Resend */}
            {!isInvalidUser && (
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                {isResendDisabled ? (
                  <Text style={{ color: '#94a3b8' }}>
                    Resend in {formatTime(timer)}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={resendOtp}>
                    <Text style={{
                      color: '#f97316',
                      fontWeight: '600'
                    }}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              onPress={verifyOtp}
              disabled={loading || otp.join('').length !== 6}
              style={{
                backgroundColor:
                  otp.join('').length === 6
                    ? '#f97316'
                    : '#475569',
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center'
              }}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={{
                  color: '#0f172a',
                  fontWeight: '800',
                  fontSize: 16
                }}>
                  {t('verify.Verify & Proceed')}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={{
              textAlign: 'center',
              color: '#64748b',
              marginTop: 30,
              fontSize: 12
            }}>
              🔒 Secure & encrypted verification
            </Text>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </LinearGradient>
  );
}