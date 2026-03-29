/// <reference types="vite/client" />

// Fallback until `vite` is installed — augments ImportMeta so TypeScript
// accepts import.meta.env references before running pnpm install.
interface ImportMeta {
  readonly env: Record<string, string | undefined> & {
    readonly VITE_CONVEX_SELF_HOSTED_URL?: string;
    readonly VITE_COGNITO_USER_POOL_ID?: string;
    readonly VITE_COGNITO_CLIENT_ID?: string;
    readonly VITE_AWS_REGION?: string;
    readonly VITE_BASE_PATH?: string;
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
  };
}
