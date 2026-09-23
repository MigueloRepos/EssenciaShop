import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  oldPrice: numeric('old_price', { precision: 10, scale: 2 }).notNull(),
  rating: numeric('rating', { precision: 3, scale: 1 }).notNull(),
  reviews: integer('reviews').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  badge: text('badge'),
  description: text('description').notNull(),
  image: text('image').notNull(),
  sku: text('sku').notNull(),
  features: jsonb('features').$type<string[]>().notNull(),
  specs: jsonb('specs').$type<{ label: string; value: string }[]>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  customerEmail: text('customer_email').notNull(),
  items: jsonb('items').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userCarts = pgTable('user_carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  cartData: jsonb('cart_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  cart: one(userCarts, {
    fields: [users.id],
    references: [userCarts.userId],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const userCartsRelations = relations(userCarts, ({ one }) => ({
  user: one(users, {
    fields: [userCarts.userId],
    references: [users.id],
  }),
}));
