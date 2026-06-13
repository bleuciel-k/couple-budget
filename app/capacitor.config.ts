import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.seonho.couplebudget',
  appName: '우리 둘의 가계부',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      authDomain: 'couple-budget-ebaea.firebaseapp.com',
      providers: ['google.com', 'apple.com']
    }
  }
};

export default config;
