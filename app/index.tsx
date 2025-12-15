import { ActivityIndicator, Image, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-slate-50">
      <Image
        source={require('../assets/logo.png')}
        className="w-[120px] h-[120px] mb-8"
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#0f172a" />
    </View>
  );
}
