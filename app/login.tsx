import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Globe, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import safeStorage from '../utils/storage';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, error: authError } = useAuth() as any;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Sync auth error to local state
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  if (user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  const handleEmailLogin = async () => {
    setError('');

    if (!email) {
      setError(t('error.emptyEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('error.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/users/Login_SignUp/', { email: email });

      console.log("Login Response:", res.data);
      let cookie: any = res.headers['set-cookie'];

      if (Array.isArray(cookie)) {
        cookie = cookie.join('; ');
      }

      if (cookie) {
        await safeStorage.setItem('session_cookie', cookie);
      }

      router.push({
        pathname: '/verify',
        params: {
          key: res.data.key,
          id: res.data.id,
          email: email,
        }
      });

    } catch (err: any) {
      console.error("Login failed:", err);
      const errorMessage = err?.res?.data?.error || t('error.connection');
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0', '#cbd5e1']} // Light mode gradient
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        >
          {/* Language Switcher */}
          <View style={{ position: 'absolute', top: 16, right: 0, zIndex: 50 }}>
            <TouchableOpacity
              onPress={() => setShowLanguageModal(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: 10,
                borderRadius: 9999,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3.84,
                elevation: 5,
                borderWidth: 1,
                borderColor: '#e2e8f0'
              }}
            >
              <Globe size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>

            {/* Main Card */}
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: 32,
              borderRadius: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)'
            }}>

              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <View style={{
                  backgroundColor: '#e0f2fe',
                  padding: 8,
                  borderRadius: 9999,
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 5
                }}>
                  <Image
                    source={require('../assets/logo.png')}
                    style={{ width: 90, height: 90 }}
                    resizeMode="contain"
                  />
                </View>
                <Text style={{ fontSize: 30, fontWeight: '800', color: '#1e293b', textAlign: 'center', letterSpacing: -0.5 }}>
                  Setu Partner
                </Text>
                <Text style={{ color: '#64748b', fontStyle: 'italic', marginTop: 4, fontSize: 16 }}>
                  {t('slogan')}
                </Text>

                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>
                    {t('welcomeBack')}
                  </Text>
                </View>
              </View>

              {/* Error Box */}
              {error ? (
                <View style={{ backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#ef4444', padding: 16, marginBottom: 20, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                  <Text style={{ color: '#b91c1c', fontWeight: '500' }}>{error}</Text>
                </View>
              ) : null}

              {/* Form */}
              <View style={{ gap: 20 }}>

                {/* Debug Button - keep for now */}
                <TouchableOpacity
                  onPress={async () => {
                    const cookie = await safeStorage.getItem('session_cookie');
                    Alert.alert("Debug Info", `Cookie present: ${!!cookie}`);
                  }}
                  style={{ alignSelf: 'center', marginBottom: 12, backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}
                >
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>🔧 Run Diagnostics</Text>
                </TouchableOpacity>

                {/* Email Input */}
                <View>
                  <Text style={{ color: '#334155', fontWeight: '600', marginBottom: 12, marginLeft: 4, fontSize: 16 }}>
                    {t('enterEmail')}
                  </Text>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: isFocused ? '#3b82f6' : '#cbd5e1',
                    height: 56
                  }}>
                    <View style={{
                      width: 50,
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRightWidth: 1,
                      borderRightColor: '#e2e8f0',
                      backgroundColor: '#f1f5f9',
                      borderTopLeftRadius: 14,
                      borderBottomLeftRadius: 14
                    }}>
                      <Mail size={20} color={isFocused ? "#2563eb" : "#64748b"} />
                    </View>

                    <TextInput
                      style={{
                        flex: 1,
                        paddingHorizontal: 16,
                        color: '#1e293b',
                        fontSize: 16,
                        fontWeight: '500',
                        height: '100%'
                      }}
                      placeholder={t('emailPlaceholder')}
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 4 }}>
                    <Lock size={12} color="#94a3b8" />
                    <Text style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6 }}>
                      {t('emailHint')}
                    </Text>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleEmailLogin}
                  disabled={loading}
                  style={{
                    width: '100%',
                    paddingVertical: 16,
                    borderRadius: 16,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 8,
                    backgroundColor: (loading || !email) ? '#cbd5e1' : '#2563eb',
                    shadowColor: (loading || !email) ? "transparent" : "#2563eb",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: (loading || !email) ? 0 : 4
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>{t('sending')}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 18, marginRight: 8 }}>{t('continue')}</Text>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 9999 }}>
                        <ArrowRight size={18} color="white" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                <Text style={{ textAlign: 'center', color: '#64748b', fontSize: 14, lineHeight: 24 }}>
                  {t('agree')}{"\n"}
                  <Text style={{ color: '#2563eb', fontWeight: '700' }}>{t('terms')}</Text> {t('and')} <Text style={{ color: '#2563eb', fontWeight: '700' }}>{t('privacy')}</Text>
                </Text>
              </View>
            </View>

            <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 32 }}>
              {t('copyright')}
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