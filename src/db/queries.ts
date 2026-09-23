import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { users, productsTable, orders, userCarts } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile', { cause: error });
  }
}

export async function getAllProducts() {
  try {
    return await db.select().from(productsTable);
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    throw new Error('Failed to retrieve products', { cause: error });
  }
}

export async function seedInitialProducts(initialProducts: Array<{
  name: string;
  category: string;
  price: number;
  oldPrice: number;
  rating: number;
  reviews: number;
  stock: number;
  badge?: string;
  description: string;
  image: string;
  sku: string;
  features: string[];
  specs: { label: string; value: string }[];
}>) {
  try {
    const existing = await db.select().from(productsTable).limit(1);
    if (existing.length > 0) {
      return existing;
    }

    const values = initialProducts.map((p) => ({
      name: p.name,
      category: p.category,
      price: p.price.toFixed(2),
      oldPrice: p.oldPrice.toFixed(2),
      rating: p.rating.toFixed(1),
      reviews: p.reviews,
      stock: p.stock,
      badge: p.badge || null,
      description: p.description,
      image: p.image,
      sku: p.sku,
      features: p.features,
      specs: p.specs,
    }));

    return await db.insert(productsTable).values(values).returning();
  } catch (error) {
    console.error('Error in seedInitialProducts:', error);
    throw new Error('Failed to seed products', { cause: error });
  }
}

export async function getUserCartByUid(uid: string) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) return null;

    const cartRecord = await db
      .select()
      .from(userCarts)
      .where(eq(userCarts.userId, user[0].id))
      .limit(1);

    if (!cartRecord.length) return null;
    return cartRecord[0].cartData as Record<number, number>;
  } catch (error) {
    console.error('Error in getUserCartByUid:', error);
    throw new Error('Failed to fetch user cart', { cause: error });
  }
}

export async function saveUserCartByUid(uid: string, cartData: Record<number, number>) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) throw new Error('User not found');

    const result = await db
      .insert(userCarts)
      .values({
        userId: user[0].id,
        cartData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userCarts.userId,
        set: {
          cartData,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in saveUserCartByUid:', error);
    throw new Error('Failed to save cart', { cause: error });
  }
}

export async function createNewOrder({
  uid,
  customerEmail,
  items,
  total,
}: {
  uid?: string;
  customerEmail: string;
  items: Array<{ id: number; name: string; price: number; quantity: number }>;
  total: number;
}) {
  try {
    let userId: number | null = null;
    if (uid) {
      const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      if (user.length) {
        userId = user[0].id;
      }
    }

    const result = await db
      .insert(orders)
      .values({
        userId,
        customerEmail,
        items,
        total: total.toFixed(2),
        status: 'completado',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in createNewOrder:', error);
    throw new Error('Failed to create order in database', { cause: error });
  }
}

export async function getUserOrdersByUid(uid: string) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) return [];

    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user[0].id))
      .orderBy(desc(orders.createdAt));
  } catch (error) {
    console.error('Error in getUserOrdersByUid:', error);
    throw new Error('Failed to fetch orders', { cause: error });
  }
}
