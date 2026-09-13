import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ke.co.kais.app',
  appName: 'K.AI.S',
  webDir: 'public',
  server: {
    url: 'https://ma-aips-ai.hatchable.site/',
    cleartext: false
  }
};

export default config;
