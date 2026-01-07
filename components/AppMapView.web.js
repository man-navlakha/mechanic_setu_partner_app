import { Text, View } from 'react-native';

const MapView = (props) => {
    return (
        <View style={[{ flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, props.style]}>
            <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Map View (Web Placeholder)</Text>
        </View>
    );
};

export const Marker = (props) => null;
export const Polyline = (props) => null;
export const Callout = (props) => null;
export const PROVIDER_GOOGLE = 'google';

export default MapView;
