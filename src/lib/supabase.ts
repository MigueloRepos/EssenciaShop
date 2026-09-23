import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Interface for database items managed across Supabase / PostgreSQL
 */
export interface SupabaseOrderPayload {
  customerEmail: string;
  items: Array<{ id: number; name: string; price: number; quantity: number }>;
  total: number;
}

/**
 * Universal order creation helper:
 * Tries Supabase directly if credentials are provided,
 * otherwise routes through the internal PostgreSQL backend.
 */
export async function createStoreOrder(
  payload: SupabaseOrderPayload,
  authToken?: string | null
) {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            customer_email: payload.customerEmail,
            items: payload.items,
            total: payload.total,
            status: 'completado',
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, order: data };
      }
      console.warn('Supabase insert failed, falling back to PostgreSQL API:', error);
    } catch (err) {
      console.warn('Supabase request failed, falling back to PostgreSQL API:', err);
    }
  }

  // Fallback to internal managed PostgreSQL API
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Error al registrar el pedido');
  }

  return await res.json();
}
