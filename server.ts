import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getAllProducts,
  seedInitialProducts,
  getOrCreateUser,
  getUserCartByUid,
  saveUserCartByUid,
  createNewOrder,
  getUserOrdersByUid,
} from './src/db/queries.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'postgresql' });
  });

  // Products from Cloud SQL PostgreSQL
  app.get('/api/products', async (req, res) => {
    try {
      const dbProducts = await getAllProducts();
      res.json(dbProducts);
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch products' });
    }
  });

  // Seed products
  app.post('/api/products/seed', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array' });
      }
      const seeded = await seedInitialProducts(items);
      res.json({ success: true, count: seeded.length });
    } catch (error: any) {
      console.error('Failed to seed products:', error);
      res.status(500).json({ error: error.message || 'Failed to seed products' });
    }
  });

  // Sync user profile & load user cart
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@user.local`;
      const { displayName, photoUrl } = req.body;

      const user = await getOrCreateUser(uid, email, displayName, photoUrl);
      const cart = await getUserCartByUid(uid);

      res.json({ user, cart: cart || {} });
    } catch (error: any) {
      console.error('Failed to sync user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // Get user cart
  app.get('/api/cart', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const cart = await getUserCartByUid(uid);
      res.json(cart || {});
    } catch (error: any) {
      console.error('Failed to get cart:', error);
      res.status(500).json({ error: error.message || 'Failed to get cart' });
    }
  });

  // Save user cart
  app.post('/api/cart', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { cart } = req.body;
      if (!cart || typeof cart !== 'object') {
        return res.status(400).json({ error: 'Invalid cart payload' });
      }
      await saveUserCartByUid(uid, cart);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to save cart:', error);
      res.status(500).json({ error: error.message || 'Failed to save cart' });
    }
  });

  // Create order in PostgreSQL
  app.post('/api/orders', async (req: AuthRequest, res) => {
    try {
      let uid: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const { adminAuth } = await import('./src/lib/firebase-admin.ts');
          const decoded = await adminAuth.verifyIdToken(token);
          uid = decoded.uid;
        } catch {
          // Proceed as guest
        }
      }

      const { customerEmail, items, total } = req.body;
      if (!customerEmail || !items || !total) {
        return res.status(400).json({ error: 'Missing required order fields' });
      }

      const order = await createNewOrder({
        uid,
        customerEmail,
        items,
        total: Number(total),
      });

      res.json({ success: true, order });
    } catch (error: any) {
      console.error('Failed to create order:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });

  // User order history
  app.get('/api/orders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const orderList = await getUserOrdersByUid(uid);
      res.json(orderList);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch orders' });
    }
  });

  // Vite in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
