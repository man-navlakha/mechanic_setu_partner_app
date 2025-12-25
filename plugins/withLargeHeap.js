const { withAndroidManifest } = require('@expo/config-plugins');

const withLargeHeap = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        if (androidManifest.manifest && androidManifest.manifest.application) {
            const mainApplication = androidManifest.manifest.application[0];
            mainApplication.$['android:largeHeap'] = 'true';
        }
        return config;
    });
};

module.exports = withLargeHeap;
