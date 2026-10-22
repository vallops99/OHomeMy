interface CustomEnv {
  NODE_ENV: 'development' | 'production';
  VITE_HA_URL: string;
  VITE_HA_TOKEN: string;
  [key: string]: unknown;
}

// For Vite's import.meta.env
interface ImportMeta {
  env: CustomEnv;
}

// For Node's process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv extends CustomEnv {}
  }
}
