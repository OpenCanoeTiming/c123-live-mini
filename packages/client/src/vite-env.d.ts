/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_SUBTITLE?: string;
  readonly VITE_HOME_LINK?: string;
  readonly VITE_HOME_LINK_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
