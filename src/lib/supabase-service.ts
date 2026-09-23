import { supabase, isSupabaseConfigured } from './supabase';
import type { Category, Product } from '@/data/products';

export interface SupabaseCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface SupabaseProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  category_id: string;
  stock: number;
  rating: number;
  sku: string;
  brand?: string;
  is_featured: boolean;
  is_active: boolean;
  category?: { name: string };
  images?: Array<{ url: string; alt_text?: string; is_primary?: boolean }>;
}

export interface SupabaseReviewRow {
  id: string;
  product_id?: string;
  user_id?: string;
  order_id?: string;
  title: string;
  comment: string;
  rating: number;
  created_at: string;
}

export interface SupabaseCouponRow {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
}

export interface TableStatus {
  tableName: string;
  connected: boolean;
  rowCount: number;
  status: 'ok' | 'empty' | 'error';
  message?: string;
}

/**
 * 1. Sección Categorías: Obtener categorías directamente de Supabase
 */
export async function getSupabaseCategories(): Promise<SupabaseCategoryRow[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Error fetching categories from Supabase:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Network error fetching categories from Supabase:', err);
    return [];
  }
}

/**
 * 2. Sección Productos: Obtener productos con imágenes y categorías de Supabase
 */
export async function getSupabaseProducts(): Promise<SupabaseProductRow[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(name), images:product_images(*)')
      .eq('is_active', true);

    if (error) {
      console.warn('Error fetching products from Supabase:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Network error fetching products from Supabase:', err);
    return [];
  }
}

/**
 * 3. Sección Reseñas / Valoraciones: Obtener reseñas de Supabase
 */
export async function getSupabaseReviews(productId?: string): Promise<SupabaseReviewRow[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  try {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (productId) {
      query = query.eq('product_id', productId);
    }
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * 4. Sección Cupones: Validar cupón en tabla coupons de Supabase
 */
export async function validateSupabaseCoupon(
  code: string
): Promise<{ valid: boolean; discountPercent?: number; discountFixed?: number; message?: string }> {
  const normalizedCode = code.trim().toUpperCase();

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', normalizedCode)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        if (data.discount_type === 'percentage') {
          return { valid: true, discountPercent: Number(data.discount_value), message: `Descuento del ${data.discount_value}% aplicado` };
        }
        return { valid: true, discountFixed: Number(data.discount_value), message: `Descuento de ${data.discount_value}€ aplicado` };
      }
    } catch {
      // Proceder al cupón de cortesía
    }
  }

  // Cupones por defecto si la tabla aún no tiene registros
  if (normalizedCode === 'ESSENCIA10' || normalizedCode === 'BIENVENIDA10') {
    return { valid: true, discountPercent: 10, message: '¡10% de descuento aplicado!' };
  }
  if (normalizedCode === 'ENVIOGRATIS') {
    return { valid: true, discountFixed: 3.99, message: 'Envío estándar gratuito aplicado' };
  }

  return { valid: false, message: 'Cupón no válido o expirado' };
}

/**
 * 5. Sección Pedidos y Checkout: Crear pedido en orders y order_items
 */
export async function placeStoreOrder({
  customerEmail,
  items,
  total,
  subtotal,
  shippingAddress,
  notes,
  userId,
}: {
  customerEmail: string;
  items: Array<{ id: number | string; name: string; price: number; quantity: number; sku?: string }>;
  total: number;
  subtotal?: number;
  shippingAddress?: string;
  notes?: string;
  userId?: string;
}) {
  // Intentar primero insertar en Supabase orders
  if (supabase && isSupabaseConfigured) {
    try {
      const orderPayload: Record<string, any> = {
        total: Number(total.toFixed(2)),
        subtotal: Number((subtotal ?? total).toFixed(2)),
        status: 'completed',
        payment_status: 'paid',
        notes: notes || `Pedido web por ${customerEmail}`,
      };

      if (userId && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        orderPayload.user_id = userId;
      }
      if (shippingAddress) {
        orderPayload.shipping_address = shippingAddress;
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (!orderError && orderData) {
        // Registrar order_items en Supabase si la orden se creó
        try {
          const orderItemsPayload = items.map((item) => ({
            order_id: orderData.id,
            product_id: typeof item.id === 'string' && item.id.includes('-') ? item.id : null,
            quantity: item.quantity,
            unit_price: Number(item.price.toFixed(2)),
            sku: item.sku || `SKU-${item.id}`,
          }));

          await supabase.from('order_items').insert(orderItemsPayload);
        } catch (itemErr) {
          console.warn('Could not insert order_items in Supabase:', itemErr);
        }

        return { success: true, order: orderData, source: 'supabase' as const };
      } else if (orderError) {
        console.warn('Supabase order insert rejected (likely RLS), falling back to API:', orderError.message);
      }
    } catch (err) {
      console.warn('Supabase order exception, falling back:', err);
    }
  }

  // Fallback seguro a PostgreSQL Backend API para garantizar que el cliente nunca quede sin poder comprar
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail,
      items,
      total,
    }),
  });

  if (!res.ok) {
    throw new Error('No se pudo procesar el pedido.');
  }

  const data = await res.json();
  return { success: true, order: data.order, source: 'postgresql' as const };
}

/**
 * 6. Verificación de salud y estado de todas las tablas de Supabase
 */
export async function verifyAllSupabaseTables(): Promise<TableStatus[]> {
  if (!supabase || !isSupabaseConfigured) {
    return [
      { tableName: 'config', connected: false, rowCount: 0, status: 'error', message: 'Credenciales de Supabase no configuradas' },
    ];
  }

  const tables = [
    { name: 'categories', label: 'Categorías (categories)' },
    { name: 'products', label: 'Catálogo de Productos (products)' },
    { name: 'product_images', label: 'Imágenes de Productos (product_images)' },
    { name: 'orders', label: 'Pedidos (orders)' },
    { name: 'order_items', label: 'Líneas de Pedido (order_items)' },
    { name: 'cart_items', label: 'Líneas de Carrito (cart_items)' },
    { name: 'reviews', label: 'Reseñas de Clientes (reviews)' },
    { name: 'coupons', label: 'Cupones de Descuento (coupons)' },
    { name: 'profiles', label: 'Perfiles de Usuario (profiles)' },
  ];

  const results: TableStatus[] = [];

  for (const t of tables) {
    try {
      const { data, error, count } = await supabase
        .from(t.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({
          tableName: t.label,
          connected: false,
          rowCount: 0,
          status: 'error',
          message: error.message,
        });
      } else {
        const total = count ?? 0;
        results.push({
          tableName: t.label,
          connected: true,
          rowCount: total,
          status: total > 0 ? 'ok' : 'empty',
          message: total > 0 ? `${total} registro(s) activos` : 'Tabla creada y conectada (0 registros)',
        });
      }
    } catch (err: any) {
      results.push({
        tableName: t.label,
        connected: false,
        rowCount: 0,
        status: 'error',
        message: err?.message || 'Error de conexión',
      });
    }
  }

  return results;
}
