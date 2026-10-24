import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tennis.visioncoach',
  appName: 'Tennis Vision Coach',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
