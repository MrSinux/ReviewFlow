import { requireSupabase } from '../supabaseClient';
import type { UserProfile, UserRole } from '../../types';
import type { AuthService } from '../serviceTypes';

const db = requireSupabase;

async function fetchMyProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await db()
    .from('user_profiles')
    .select('id, role, business_id, business_slug, created_at')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    role: data.role as UserRole,
    businessId: data.business_id,
    businessSlug: data.business_slug,
    createdAt: data.created_at,
  };
}

export const supabaseAuthService: AuthService = {
  /**
   * Sign in with email/password.
   * Note: if email confirmations are enabled, unconfirmed users will NOT have a valid session.
   */
  login: async (email, password) => {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session || !data.user) {
      // Supabase will return no session for unconfirmed emails when confirmations are enabled.
      throw new Error('Email not confirmed yet. Please check your inbox and confirm your email.');
    }
    const profile = await fetchMyProfile(data.user.id);
    return {
      userId: data.user.id,
      email: data.user.email ?? null,
      profile,
    };
  },

  logout: async () => {
    await db().auth.signOut();
  },
  
  getCurrentSession: async () => {
    const { data } = await db().auth.getSession();
    const session = data.session;
    if (!session?.user) return null;
    const profile = await fetchMyProfile(session.user.id);
    return {
      userId: session.user.id,
      email: session.user.email ?? null,
      profile,
    };
  },
};
