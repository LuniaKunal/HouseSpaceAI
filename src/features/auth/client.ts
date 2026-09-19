import { createClient } from '@supabase/supabase-js';

const url = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL);
const key = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY);
export const supabase = url && key ? createClient(url, key) : null;
export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
export async function requirePhotoUser() {
  if (!supabase) throw new Error('Account storage is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Sign in to access your photo library.');
  return data.session.user.id;
}
