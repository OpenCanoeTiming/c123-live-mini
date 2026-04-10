/// <reference types="vite/client" />

/**
 * Branding configuration for the c123-live-mini client.
 *
 * Values are read from build-time `VITE_*` environment variables, with
 * defaults that match the original ČSK Live deployment so unset variables
 * cause no visible change.
 *
 * To rebrand a deployment, set the corresponding `VITE_*` variables in the
 * Railway project (build phase) and trigger a redeploy. See
 * `packages/client/.env.example` and `docs/RUNBOOK.md` for the full list.
 */

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_SUBTITLE?: string;
  readonly VITE_HOME_LINK?: string;
  readonly VITE_HOME_LINK_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface Branding {
  /** Main application name shown in the header and homepage hero. */
  appName: string;
  /** Subtitle shown under the app name in the homepage hero. */
  appSubtitle: string;
  /** URL of the parent site the satellite header links back to. */
  homeLink: string;
  /** Label of the back link in the satellite header. */
  homeLinkLabel: string;
}

export const branding: Branding = {
  appName: import.meta.env.VITE_APP_NAME ?? 'ČSK Live',
  appSubtitle:
    import.meta.env.VITE_APP_SUBTITLE ?? 'Živé výsledky kanoistického slalomu',
  homeLink: import.meta.env.VITE_HOME_LINK ?? 'https://kanoe.cz',
  homeLinkLabel: import.meta.env.VITE_HOME_LINK_LABEL ?? 'Zpět na kanoe.cz',
};
