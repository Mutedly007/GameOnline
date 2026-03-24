import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bentwweld.app',
  appName: 'Bent w Weld',
  webDir: 'out',
  server: {
    // For development, use local URL
    // For production, set to your deployed frontend URL
    // url: 'https://your-frontend.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a1a',
      showSpinner: false,
    },
  },
};

export default config;
