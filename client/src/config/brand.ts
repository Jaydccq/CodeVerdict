export const brand = {
  appName: (import.meta.env.VITE_APP_NAME as string) || 'CodeVerdict',
  copyrightHolder: (import.meta.env.VITE_COPYRIGHT_HOLDER as string) || '',
  logoPath: (import.meta.env.VITE_LOGO_PATH as string) || '/logo.webp',
  apiTitle: (import.meta.env.VITE_API_TITLE as string) || 'API Reference',
  apiVersion: (import.meta.env.VITE_API_VERSION as string) || 'v1.0',
  primaryColor: (import.meta.env.VITE_PRIMARY_COLOR as string) || '#e42545',
  accentColor: (import.meta.env.VITE_ACCENT_COLOR as string) || '#2eb392',
} as const;
