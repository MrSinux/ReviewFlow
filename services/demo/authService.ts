import type { UserProfile } from '../../types';
import type { AuthService, AuthSession } from '../serviceTypes';
import { latency } from './store';

// Fictional accounts for the one-click demo logins. They only exist in demo mode.
export type DemoAccount = {
  label: string;
  description: string;
  email: string;
  password: string;
  profile: UserProfile;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Business admin',
    description: 'Owner of Demo Café: inbox, QR codes, settings',
    email: 'owner@example.com',
    password: 'demo',
    profile: { id: 'user_demo_owner', role: 'admin', businessId: 'biz_demo_cafe', businessSlug: 'demo-cafe' },
  },
  {
    label: 'Super admin',
    description: 'Agency view: every client, onboarding, impersonation',
    email: 'super@example.com',
    password: 'demo',
    profile: { id: 'user_demo_super', role: 'super', businessId: null, businessSlug: null },
  },
];

const SESSION_KEY = 'reviewflow:demo:session';
let memorySession: AuthSession | null = null;

const saveSession = (session: AuthSession | null) => {
  memorySession = session;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: the in-memory session lasts until the page reloads.
  }
};

const loadSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as AuthSession;
  } catch {
    // fall through to memory
  }
  return memorySession;
};

export const demoAuthService: AuthService = {
  login: async (email, password) => {
    await latency(200);
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
    );
    if (!account) throw new Error('Invalid login credentials');
    const session: AuthSession = { userId: account.profile.id, email: account.email, profile: account.profile };
    saveSession(session);
    return session;
  },

  logout: async () => {
    saveSession(null);
  },

  getCurrentSession: async () => loadSession(),
};
