/**
 * Branding configuration for the c123-live-mini client.
 *
 * Values come from build-time `VITE_*` env vars, with defaults that match
 * the original ČSK Live deployment so unset variables cause no visible
 * change. To rebrand a deployment, set the corresponding variables in the
 * Railway project (build phase) and trigger a redeploy. See
 * `packages/client/.env.example` and `docs/RUNBOOK.md` for the full list.
 */

export interface Branding {
  appName: string;
  appSubtitle: string;
  homeLink: string;
  homeLinkLabel: string;
}

export const branding: Branding = {
  appName: import.meta.env.VITE_APP_NAME ?? 'ČSK Live',
  appSubtitle:
    import.meta.env.VITE_APP_SUBTITLE ?? 'Živé výsledky kanoistického slalomu',
  homeLink: import.meta.env.VITE_HOME_LINK ?? 'https://kanoe.cz',
  homeLinkLabel: import.meta.env.VITE_HOME_LINK_LABEL ?? 'Zpět na kanoe.cz',
};
