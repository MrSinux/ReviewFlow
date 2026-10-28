// Base URL used for public review links and QR codes.
// Set VITE_PUBLIC_APP_URL when the admin portal and the public pages live on different
// origins; otherwise the current browser origin is used.
export const getPublicOrigin = (): string => {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return window.location.origin;
};
