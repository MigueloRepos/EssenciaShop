import { useMemo, useState, useEffect, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, BadgeCheck, BatteryCharging, Cable, Car, Check, ChevronDown,
  Database, Eye, Fingerprint, Gamepad2, Headphones, Heart, Home, Instagram, LayoutGrid, Menu, MessageCircle, Minus,
  PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles,
  Star, Tag, Trash2, Truck, UserRound, Watch, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProductQuickView } from "@/components/shop/product-quick-view";
import { HeaderDynamicSearch } from "@/components/shop/header-dynamic-search";
import { UserAccountModal } from "@/components/shop/user-account-modal";
import { SupabaseStatusModal } from "@/components/shop/supabase-status-modal";
import { useAuth } from "@/context/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getSupabaseCategories, placeStoreOrder, validateSupabaseCoupon } from "@/lib/supabase-service";
import { categories, products, type Category, type Product } from "@/data/products";
import heroTech from "@/assets/hero-tech.jpg";
import casesImage from "@/assets/product-cases.jpg";
import chargingImage from "@/assets/product-charging.jpg";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const categoryIcons: LucideIcon[] = [Smartphone, Cable, Headphones, BatteryCharging, Watch, Car, Gamepad2, Sparkles];

export function ShopHome() {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const { user, getIdToken, hasFingerprintEnrolled } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>("Todos");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [supabaseStatusOpen, setSupabaseStatusOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ id: number | string; total: number; source?: string } | null>(null);
  const [supabaseCategories, setSupabaseCategories] = useState<string[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent?: number; fixed?: number } | null>(null);

  // 1. Sincronizar categorías en tiempo real con la tabla 'categories' de Supabase
  useEffect(() => {
    getSupabaseCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setSupabaseCategories(cats.map((c) => c.name));
        }
      })
      .catch(console.error);
  }, []);

  // Inicializar productos en Cloud SQL si la base de datos está vacía
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length === 0) {
          fetch('/api/products/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: products }),
          }).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  // Cargar carrito persistente desde PostgreSQL cuando el usuario inicia sesión
  useEffect(() => {
    if (!user) return;
    getIdToken().then((token) => {
      if (!token) return;
      fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((savedCart) => {
          if (savedCart && typeof savedCart === 'object' && Object.keys(savedCart).length > 0) {
            setCart((prev) => ({ ...savedCart, ...prev }));
          }
        })
        .catch(console.error);
    });
  }, [user]);

  // Persistir carrito en PostgreSQL en tiempo real
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      const token = await getIdToken();
      if (!token) return;
      fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cart }),
      }).catch(console.error);
    }, 600);
    return () => clearTimeout(timer);
  }, [cart, user]);

  const shownProducts = useMemo(() => products.filter((product) => {
    if (onlyFavorites && !favorites.includes(product.id)) {
      return false;
    }
    const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
    if (!matchesCategory) return false;

    const query = search.trim().toLowerCase();
    if (!query) return true;

    const haystack = `${product.name} ${product.category} ${product.description} ${product.sku} ${product.features.join(" ")}`.toLowerCase();
    return haystack.includes(query);
  }), [activeCategory, search, onlyFavorites, favorites]);

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find((item) => item.id === Number(id));
    return sum + (product?.price ?? 0) * qty;
  }, 0);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.percent) {
      return (cartTotal * appliedCoupon.percent) / 100;
    }
    return Math.min(cartTotal, appliedCoupon.fixed || 0);
  }, [appliedCoupon, cartTotal]);

  const subtotalAfterDiscount = Math.max(0, cartTotal - discountAmount);
  const calculatedShipping = subtotalAfterDiscount >= 50 || subtotalAfterDiscount === 0 ? 0 : 3.99;
  const finalCartTotal = subtotalAfterDiscount + calculatedShipping;

  const addToCart = (product: Product, quantity = 1) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + quantity }));
    setCartOpen(true);
  };

  const openQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

  const setQuantity = (id: number, qty: number) => {
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id]; else next[id] = qty;
      return next;
    });
  };

  const handleCheckout = async () => {
    if (cartCount === 0) return;
    const items = Object.entries(cart).map(([id, qty]) => {
      const p = products.find((prod) => prod.id === Number(id));
      return {
        id: Number(id),
        name: p?.name || `Producto #${id}`,
        price: p?.price || 0,
        quantity: qty,
        sku: p?.sku,
      };
    });

    try {
      setSubmittingOrder(true);
      const result = await placeStoreOrder({
        customerEmail: user?.email || 'cliente@essenciashop.es',
        items,
        total: finalCartTotal,
        subtotal: cartTotal,
        userId: user?.uid,
      });

      if (result && result.order) {
        setOrderSuccess({
          id: result.order.id,
          total: finalCartTotal,
          source: result.source === 'supabase' ? 'Supabase' : 'Base de datos',
        });
        setCart({});
        setAppliedCoupon(null);
        setCartOpen(false);
      }
    } catch (err) {
      console.error('Error creating order in database:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const chooseCategory = (category: Category) => {
    setActiveCategory(category);
    setOnlyFavorites(false);
    setMenuOpen(false);
    document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFavoritesView = () => {
    setOnlyFavorites((current) => !current);
    setActiveCategory("Todos");
    document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
  };

  const submitNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribed(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground pb-24 lg:pb-0">
      <div className="bg-dark-surface text-primary-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-primary-foreground/20 px-4 py-2 text-[10px] font-semibold sm:text-xs">
          <TopItem icon={Truck} text="Envíos a todo el país" />
          <TopItem icon={ShieldCheck} text="Pagos seguros" />
          <TopItem icon={Headphones} text="Soporte 24/7" />
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-18 lg:h-20 lg:px-6">
          <a href="#inicio" className="text-xl font-extrabold tracking-tight sm:text-2xl shrink-0">
            Essencia<span className="text-primary">Shop</span>
          </a>

          {/* Barra de búsqueda dinámica en tiempo real para escritorio y tablet */}
          <div className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6">
            <HeaderDynamicSearch
              search={search}
              setSearch={setSearch}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              matchingProducts={shownProducts}
              onOpenQuickView={openQuickView}
              onAddToCart={(p) => addToCart(p, 1)}
              onScrollToCatalog={() => {
                document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>

          <nav className="hidden xl:flex items-center gap-6 shrink-0">
            <NavLink href="#inicio">Inicio</NavLink>
            <NavLink href="#productos">Tienda</NavLink>
            <NavLink href="#categorias">Categorías</NavLink>
            <NavLink href="#ofertas">Ofertas</NavLink>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            <button
              onClick={() => setSupabaseStatusOpen(true)}
              aria-label="Estado de Tablas Supabase"
              title="Verificar conexión de tablas en Supabase"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95"
            >
              <Database className="size-3.5 text-emerald-500" />
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase</span>
            </button>

            <button
              aria-label="Buscar"
              title="Buscar"
              onClick={() => setSearchOpen((value) => !value)}
              className="grid size-10 place-items-center rounded-full transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Search className="size-5" />
            </button>
            <button
              aria-label="Cuenta"
              title={
                user
                  ? `Mi Cuenta (${user.displayName || user.email})`
                  : hasFingerprintEnrolled
                  ? "Iniciar sesión (Huella dactilar disponible)"
                  : "Iniciar sesión o Registrarse"
              }
              onClick={() => setAccountOpen(true)}
              className="relative flex size-10 place-items-center justify-center rounded-full transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Usuario"}
                  className="size-7 rounded-full object-cover ring-2 ring-primary/40"
                />
              ) : (
                <UserRound className={`size-5 ${user ? "text-primary" : ""}`} />
              )}
              {hasFingerprintEnrolled && (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-emerald-500 text-white shadow-xs" title="Huella dactilar activa">
                  <Fingerprint className="size-2.5" />
                </span>
              )}
            </button>
            <button
              aria-label="Favoritos"
              title="Favoritos"
              onClick={toggleFavoritesView}
              className={`hidden size-10 place-items-center rounded-full transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid ${onlyFavorites ? "text-primary font-bold" : ""}`}
            >
              <div className="relative">
                <Heart className={`size-5 ${onlyFavorites || favorites.length > 0 ? "fill-current text-primary" : ""}`} />
                {favorites.length > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-extrabold text-destructive-foreground ring-2 ring-background shadow-xs">
                    {favorites.length}
                  </span>
                )}
              </div>
            </button>
            <button
              aria-label={`Abrir carrito${cartCount > 0 ? `, ${cartCount} artículos` : ""}`}
              title={`Carrito de compras (${cartCount} ${cartCount === 1 ? "artículo" : "artículos"})`}
              onClick={() => setCartOpen(true)}
              className="group grid size-10 place-items-center rounded-full transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative">
                <ShoppingBag className="size-5 transition-transform duration-200 group-hover:scale-105" />
                {cartCount > 0 && <CartBadge count={cartCount} />}
              </div>
            </button>
            <button
              aria-label="Abrir menú"
              title="Menú"
              onClick={() => setMenuOpen(true)}
              className="relative grid size-10 place-items-center rounded-full transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              <Menu className="size-5" />
              {cartCount > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
          </div>
        </div>

        {/* Desplegable de búsqueda dinámica para móvil */}
        {searchOpen && (
          <div className="border-t border-border/60 bg-card/95 p-3 md:hidden animate-in fade-in slide-in-from-top-2">
            <HeaderDynamicSearch
              search={search}
              setSearch={setSearch}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              matchingProducts={shownProducts}
              onOpenQuickView={openQuickView}
              onAddToCart={(p) => addToCart(p, 1)}
              onScrollToCatalog={() => {
                document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        )}
      </header>

      <main>
        <section id="inicio" className="relative mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="relative min-h-[690px] overflow-hidden rounded-[2rem] bg-secondary sm:min-h-[660px] lg:min-h-[720px]">
            <img
              src={heroTech}
              alt="Smartphone, auriculares, reloj, batería y cargador inalámbrico"
              width={1600}
              height={1200}
              className="absolute inset-0 h-full w-full object-cover object-[58%_center] lg:object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/5" />
            <div className="relative z-10 flex min-h-[690px] max-w-2xl flex-col justify-center px-6 py-16 sm:min-h-[660px] sm:px-12 lg:min-h-[720px] lg:px-20">
              <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-xs font-bold text-primary backdrop-blur-lg">
                <Zap className="size-3.5 fill-current" /> ACCESORIOS · GADGETS · TECNOLOGÍA
              </div>
              <h1 className="max-w-xl text-balance text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
                Tecnología que <span className="text-primary">encaja contigo.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                Accesorios seleccionados para hacer tu día más simple, conectado y extraordinario.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="premium" size="lg" asChild>
                  <a href="#productos">Comprar ahora <ArrowRight /></a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl lg:hidden"
                  onClick={() => setMenuOpen(true)}
                >
                  <LayoutGrid className="size-4" /> Ver categorías
                </Button>
              </div>
              <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <HeroBenefit icon={Truck} title="Envío nacional" text="Rápido y rastreable" />
                <HeroBenefit icon={ShieldCheck} title="Pago protegido" text="Compra con confianza" />
                <HeroBenefit icon={BadgeCheck} title="Garantía" text="30 días de respaldo" />
              </div>
            </div>
          </div>
        </section>

        <section id="categorias" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-28">
          <SectionHeading
            eyebrow="Explora lo esencial"
            title="Encuentra lo que necesitas"
            action="Ver productos"
            href="#productos"
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.slice(1).map((category, index) => {
              const Icon = categoryIcons[index] ?? Sparkles;
              const isCurrent = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => chooseCategory(category)}
                  className={`group flex min-h-36 flex-col items-center justify-center gap-4 rounded-2xl border px-3 py-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isCurrent ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card"
                  }`}
                >
                  <span className={`grid size-12 place-items-center rounded-xl transition ${
                    isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  }`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-bold leading-4">{category}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="productos" className="border-y border-border/70 bg-card py-16 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading eyebrow="Selección Essencia" title="Productos destacados" />

            {/* Banner de estado de búsqueda y filtros activos en tiempo real */}
            {(search.trim() || activeCategory !== "Todos" || onlyFavorites) && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
                    <Search className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold text-foreground">
                      {onlyFavorites ? (
                        "Mostrando tus productos Favoritos"
                      ) : search.trim() ? (
                        <>
                          Filtrando por <strong>“{search}”</strong>
                          {activeCategory !== "Todos" && <> en <strong>{activeCategory}</strong></>}
                        </>
                      ) : (
                        <>Categoría activa: <strong>{activeCategory}</strong></>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shownProducts.length} {shownProducts.length === 1 ? "producto encontrado" : "productos encontrados"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {search.trim() && (
                    <button
                      onClick={() => setSearch("")}
                      className="rounded-lg bg-secondary px-3 py-1.5 font-bold text-primary hover:bg-secondary/80 transition"
                    >
                      Limpiar texto
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSearch("");
                      setActiveCategory("Todos");
                      setOnlyFavorites(false);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-secondary transition"
                  >
                    Restablecer todo
                  </button>
                </div>
              </div>
            )}

            {/* Selector rápido de categorías en el catálogo */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category && !onlyFavorites ? "default" : "outline"}
                  className="shrink-0 rounded-full text-xs font-semibold"
                  onClick={() => chooseCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            {shownProducts.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {shownProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      layout="position"
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                      transition={{
                        duration: 0.45,
                        ease: [0.22, 1, 0.36, 1],
                        delay: Math.min(index * 0.04, 0.35),
                      }}
                      className="h-full"
                    >
                      <ProductCard
                        product={product}
                        favorite={favorites.includes(product.id)}
                        cartQty={cart[product.id] ?? 0}
                        onFavorite={() => setFavorites((current) =>
                          current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]
                        )}
                        onAdd={(qty) => addToCart(product, qty)}
                        onQuickView={() => openQuickView(product)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-border py-16 text-center">
                {onlyFavorites ? (
                  <>
                    <Heart className="mx-auto size-10 text-muted-foreground/50" />
                    <h3 className="mt-4 font-bold">No tienes favoritos aún</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Toca el corazón en cualquier producto para guardarlo aquí.</p>
                    <Button variant="default" className="mt-5 rounded-xl" onClick={() => setOnlyFavorites(false)}>
                      Explorar catálogo
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="mx-auto size-10 text-muted-foreground/50" />
                    <h3 className="mt-4 font-bold">No encontramos productos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o selecciona otra categoría.</p>
                    <Button variant="outline" className="mt-5 rounded-xl" onClick={() => { setSearch(""); setActiveCategory("Todos"); }}>
                      Restablecer filtros
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section id="ofertas" className="mx-auto grid max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-28">
          <PromoBanner
            title="Carga sin límites"
            text="Energía compacta para todos tus dispositivos con tecnología GaN."
            image={chargingImage}
            action={() => chooseCategory("Cargadores y Cables")}
            dark
          />
          <PromoBanner
            title="Fundas premium para tu teléfono"
            text="Protección sofisticada con agarre magnético, diseñada para destacar."
            image={casesImage}
            action={() => chooseCategory("Fundas y Protectores")}
          />
        </section>

        <section className="bg-secondary/70 py-16 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Comprar mejor</p>
              <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">¿Por qué elegir EssenciaShop?</h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Reason icon={Sparkles} title="Productos seleccionados" text="Elegimos accesorios útiles, actuales y con diseño cuidado." />
              <Reason icon={PackageCheck} title="Envíos con seguimiento" text="Sigue tu pedido desde que sale hasta que llega a tus manos." />
              <Reason icon={ShieldCheck} title="Pagos seguros" text="Tu compra está protegida en cada paso del proceso." />
              <Reason icon={Headphones} title="Atención 24/7" text="Estamos disponibles para ayudarte cuando lo necesites." />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-28">
          <SectionHeading eyebrow="Opiniones verificadas" title="Lo cuentan nuestros clientes" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Testimonial quote="La calidad se siente desde que abres el paquete. El cargador es compacto y carga rapidísimo." name="Laura M." label="Compra verificada" />
            <Testimonial quote="La funda queda perfecta y se ve mucho mejor que en las fotos. Volveré a comprar sin duda." name="Carlos R." label="Compra verificada" />
            <Testimonial quote="Mi pedido llegó antes de lo esperado y el seguimiento fue muy claro. Excelente experiencia." name="Andrea P." label="Compra verificada" />
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:pb-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-20">
            <div className="relative z-10 mx-auto max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-foreground/70">Sé el primero en saberlo</p>
              <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">Suscríbete y recibe ofertas exclusivas</h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-primary-foreground/75 sm:text-base">Novedades, lanzamientos y descuentos seleccionados directamente en tu correo.</p>
              {subscribed ? (
                <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-xl bg-primary-foreground/15 px-5 py-3 font-bold">
                  <Check className="size-5" /> ¡Gracias por suscribirte!
                </div>
              ) : (
                <form onSubmit={submitNewsletter} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
                  <Input
                    required
                    type="email"
                    aria-label="Correo electrónico"
                    placeholder="tu@email.com"
                    className="h-13 border-primary-foreground/30 bg-primary-foreground text-foreground placeholder:text-muted-foreground sm:flex-1"
                  />
                  <Button type="submit" variant="secondary" className="h-13 rounded-xl px-6">
                    Suscribirme <ArrowRight />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Menú Pulgar-First (Bottom Sheet Ergonómico) */}
      <ThumbMenuSheet
        open={menuOpen}
        setOpen={setMenuOpen}
        activeCategory={activeCategory}
        onSelectCategory={chooseCategory}
        onOpenSearch={() => {
          setMenuOpen(false);
          setSearchSheetOpen(true);
        }}
        favoritesCount={favorites.length}
        onToggleFavorites={() => {
          setMenuOpen(false);
          toggleFavoritesView();
        }}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => {
          setMenuOpen(false);
          setCartOpen(true);
        }}
        onOpenAccount={() => {
          setMenuOpen(false);
          setAccountOpen(true);
        }}
        onOpenSupabaseStatus={() => {
          setMenuOpen(false);
          setSupabaseStatusOpen(true);
        }}
      />

      {/* Búsqueda rápida estilo Pulgar-First (Bottom Sheet) */}
      <ThumbSearchSheet
        open={searchSheetOpen}
        setOpen={setSearchSheetOpen}
        search={search}
        setSearch={setSearch}
        resultCount={shownProducts.length}
        onSelectChip={(query) => {
          setSearch(query);
          setSearchSheetOpen(false);
          document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
        }}
        onViewResults={() => {
          setSearchSheetOpen(false);
          document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Carrito Lateral con sincronización y cupones de Supabase */}
      <CartDrawer
        open={cartOpen}
        setOpen={setCartOpen}
        cart={cart}
        total={cartTotal}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        setQuantity={setQuantity}
        onCheckout={handleCheckout}
        submittingOrder={submittingOrder}
      />

      {/* Modal de Mi Cuenta y Pedidos */}
      <UserAccountModal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onOpenSupabaseStatus={() => setSupabaseStatusOpen(true)}
      />

      {/* Modal de Verificación de Tablas Supabase */}
      <SupabaseStatusModal
        open={supabaseStatusOpen}
        onOpenChange={setSupabaseStatusOpen}
      />

      {/* Modal de confirmación de pedido */}
      {orderSuccess && (
        <Dialog open={Boolean(orderSuccess)} onOpenChange={(v) => !v && setOrderSuccess(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border text-center space-y-4">
            <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto">
              <PackageCheck className="size-8" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">¡Pedido confirmado con éxito!</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Tu pedido <strong className="text-foreground font-bold">#{orderSuccess.id}</strong> por valor de <strong className="text-primary font-bold">{money.format(orderSuccess.total)}</strong> se ha procesado y registrado correctamente.
              </DialogDescription>
            </div>
            <div className="rounded-2xl bg-secondary/50 p-4 text-xs text-left space-y-2 border border-border/60">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID Pedido:</span>
                <span className="font-bold font-mono">#{orderSuccess.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base de Datos:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{orderSuccess.source || 'Supabase'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">Completado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmación enviada a:</span>
                <span className="font-bold truncate max-w-[200px]">{user?.email || "cliente@essenciashop.es"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Garantía:</span>
                <span className="font-bold">3 años oficial</span>
              </div>
            </div>
            <Button
              onClick={() => setOrderSuccess(null)}
              className="w-full h-11 rounded-xl text-sm font-bold"
            >
              Seguir comprando
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Vista Rápida Modal / Slide-over de Producto */}
      <ProductQuickView
        product={quickViewProduct}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onAddToCart={addToCart}
        isFavorite={quickViewProduct ? favorites.includes(quickViewProduct.id) : false}
        onToggleFavorite={(id) => {
          setFavorites((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
          );
        }}
      />

      {/* Barra de Navegación Fija en Zona Pulgar (Mobile Thumb-First Dock) */}
      <ThumbNavBar
        activeCategory={activeCategory}
        onlyFavorites={onlyFavorites}
        favoritesCount={favorites.length}
        cartCount={cartCount}
        onNavigateHome={() => {
          setOnlyFavorites(false);
          setActiveCategory("Todos");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenCategories={() => setMenuOpen(true)}
        onOpenSearch={() => setSearchSheetOpen(true)}
        onToggleFavorites={toggleFavoritesView}
        onOpenCart={() => setCartOpen(true)}
      />
    </div>
  );
}

/* =========================================================================
   COMPONENTES DEL MENÚ PULGAR-FIRST (THUMB-FIRST NAVIGATION)
   ========================================================================= */

/**
 * Barra de navegación principal en la zona natural del pulgar (inferior en móvil).
 * Alturas mínimas de 52px, iconos claros y accesibilidad táctil óptima.
 */
function ThumbNavBar({
  activeCategory,
  onlyFavorites,
  favoritesCount,
  cartCount,
  onNavigateHome,
  onOpenCategories,
  onOpenSearch,
  onToggleFavorites,
  onOpenCart,
}: {
  activeCategory: Category;
  onlyFavorites: boolean;
  favoritesCount: number;
  cartCount: number;
  onNavigateHome: () => void;
  onOpenCategories: () => void;
  onOpenSearch: () => void;
  onToggleFavorites: () => void;
  onOpenCart: () => void;
}) {
  const isHomeActive = !onlyFavorites && activeCategory === "Todos";
  const isCategoryActive = activeCategory !== "Todos" && !onlyFavorites;

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-40 mx-auto max-w-lg lg:hidden">
      <nav
        aria-label="Menú principal de navegación para pulgar"
        className="glass-panel flex items-center justify-between gap-1 rounded-2xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
      >
        {/* 1. Inicio */}
        <button
          type="button"
          onClick={onNavigateHome}
          className={`group flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
            isHomeActive
              ? "bg-primary text-primary-foreground font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
          aria-label="Ir al inicio"
        >
          <Home className={`size-5 transition-transform duration-150 ${isHomeActive ? "scale-105" : "group-hover:scale-110"}`} />
          <span className="mt-0.5 text-[10px] tracking-tight leading-tight">Inicio</span>
        </button>

        {/* 2. Categorías / Explorar */}
        <button
          type="button"
          onClick={onOpenCategories}
          className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
            isCategoryActive
              ? "bg-primary text-primary-foreground font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
          aria-label="Abrir menú de categorías con el pulgar"
        >
          <LayoutGrid className={`size-5 transition-transform duration-150 ${isCategoryActive ? "scale-105" : "group-hover:scale-110"}`} />
          <span className="mt-0.5 text-[10px] tracking-tight leading-tight">Explorar</span>
          {isCategoryActive && (
            <span className="absolute -top-1 right-2 size-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>

        {/* 3. Buscar */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-secondary/60 active:scale-95"
          aria-label="Buscar con el pulgar"
        >
          <Search className="size-5 transition-transform duration-150 group-hover:scale-110" />
          <span className="mt-0.5 text-[10px] tracking-tight leading-tight">Buscar</span>
        </button>

        {/* 4. Favoritos */}
        <button
          type="button"
          onClick={onToggleFavorites}
          className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
            onlyFavorites
              ? "bg-destructive text-destructive-foreground font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
          aria-label="Ver favoritos con el pulgar"
        >
          <Heart
            className={`size-5 transition-transform duration-150 ${
              onlyFavorites || favoritesCount > 0 ? "fill-current" : ""
            } ${isCategoryActive ? "" : "group-hover:scale-110"}`}
          />
          <span className="mt-0.5 text-[10px] tracking-tight leading-tight">Deseos</span>
          {favoritesCount > 0 && !onlyFavorites && (
            <span className="absolute top-1 right-2 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-extrabold text-destructive-foreground ring-2 ring-background">
              {favoritesCount}
            </span>
          )}
        </button>

        {/* 5. Carrito */}
        <button
          type="button"
          onClick={onOpenCart}
          className="group relative flex flex-1 flex-col items-center justify-center py-1.5 px-1 rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-secondary/60 active:scale-95"
          aria-label={`Abrir carrito de compras${cartCount > 0 ? `, ${cartCount} artículos` : ""}`}
        >
          <div className="relative">
            <ShoppingBag className="size-5 transition-transform duration-150 group-hover:scale-110" />
            {cartCount > 0 && <CartBadge count={cartCount} />}
          </div>
          <span className="mt-0.5 text-[10px] tracking-tight leading-tight">Carrito</span>
        </button>
      </nav>
    </div>
  );
}

/**
 * Menú Bottom Sheet Pulgar-First:
 * Se abre desde la parte inferior para que todas las categorías y enlaces queden
 * al alcance directo del pulgar sin tener que alcanzar la parte alta de la pantalla.
 */
function ThumbMenuSheet({
  open,
  setOpen,
  activeCategory,
  onSelectCategory,
  onOpenSearch,
  favoritesCount,
  onToggleFavorites,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenAccount,
  onOpenSupabaseStatus,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeCategory: Category;
  onSelectCategory: (category: Category) => void;
  onOpenSearch: () => void;
  favoritesCount: number;
  onToggleFavorites: () => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenAccount?: () => void;
  onOpenSupabaseStatus?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] rounded-t-[2.2rem] border-t border-border bg-card p-5 sm:p-6 overflow-y-auto"
      >
        {/* Indicador táctil de arrastre (grab pill) para el pulgar */}
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-extrabold tracking-tight">Explorar Catálogo</SheetTitle>
              <SheetDescription className="text-xs">
                Acceso rápido con un toque de pulgar
              </SheetDescription>
            </div>
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80"
            >
              <Search className="size-3.5" /> Buscar
            </button>
          </div>
        </SheetHeader>

        {/* Acceso rápido a categorías con diseño táctil grande */}
        <div className="mt-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Categorías
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {categories.map((category, index) => {
              const Icon = index === 0 ? Sparkles : categoryIcons[index - 1] ?? Sparkles;
              const isSelected = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={`flex min-h-[58px] items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? "border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary"
                      : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-card text-primary shadow-xs"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs leading-snug line-clamp-2">{category}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accesos Rápidos de Navegación */}
        <div className="mt-6 border-t border-border/70 pt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Atajos directos
          </p>
          <div className="space-y-2">
            <a
              href="#ofertas"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm font-semibold transition hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-primary fill-current" /> Ofertas especiales y promociones
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </a>

            <button
              onClick={onToggleFavorites}
              className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm font-semibold transition hover:bg-secondary text-left"
            >
              <span className="flex items-center gap-2">
                <Heart className={`size-4 ${favoritesCount > 0 ? "text-destructive fill-current" : "text-muted-foreground"}`} />
                Mis Favoritos {favoritesCount > 0 ? `(${favoritesCount})` : ""}
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onOpenCart();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm font-semibold transition hover:bg-secondary text-left"
            >
              <span className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingBag className={`size-4 ${cartCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-black text-primary-foreground ring-1 ring-background">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </div>
                Mi Carrito
                {cartCount > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                    {cartCount} {cartCount === 1 ? "artículo" : "artículos"}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {cartCount > 0 && (
                  <span className="text-xs font-bold text-foreground">{money.format(cartTotal)}</span>
                )}
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onOpenAccount?.();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm font-semibold transition hover:bg-secondary text-left"
            >
              <span className="flex items-center gap-2">
                <UserRound className="size-4 text-primary" />
                Mi Cuenta / Mis Pedidos
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onOpenSupabaseStatus?.();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold transition hover:bg-emerald-500/15 text-left text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            >
              <span className="flex items-center gap-2">
                <Database className="size-4 text-emerald-500" />
                Estado Tablas Supabase
              </span>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                100% Conectado
              </span>
            </button>

            <a
              href="#productos"
              onClick={() => {
                onSelectCategory("Todos");
                setOpen(false);
              }}
              className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm font-semibold transition hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Todos los productos destacados
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Barra de acción inferior al alcance del pulgar */}
        <div className="mt-6 border-t border-border pt-4">
          <Button
            onClick={onOpenCart}
            className="h-12 w-full justify-between rounded-xl text-sm font-bold shadow-md"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-4" />
              Ver Carrito {cartCount > 0 && `(${cartCount})`}
            </span>
            <span>{money.format(cartTotal)}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Bottom Sheet de búsqueda ergonómica en zona pulgar:
 * Permite buscar sin estirar la mano a la esquina superior del móvil.
 */
function ThumbSearchSheet({
  open,
  setOpen,
  search,
  setSearch,
  resultCount,
  onSelectChip,
  onViewResults,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  resultCount: number;
  onSelectChip: (term: string) => void;
  onViewResults: () => void;
}) {
  const quickTags = ["MagSafe", "GaN 65W", "ANC", "Power Bank", "Smartwatch", "USB-C", "Soporte Auto"];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] rounded-t-[2.2rem] border-t border-border bg-card p-5 overflow-y-auto"
      >
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        <SheetHeader className="text-left">
          <SheetTitle className="text-xl font-extrabold">Búsqueda Rápida</SheetTitle>
          <SheetDescription className="text-xs">
            Escribe o toca una etiqueta para filtrar inmediatamente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="¿Qué estás buscando?"
              className="h-12 rounded-xl bg-secondary/60 pl-11 pr-11 text-base shadow-inner"
            />
            {search && (
              <button
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Etiquetas populares para tocar con el pulgar */}
        <div className="mt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mb-2.5">
            Búsquedas sugeridas
          </p>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectChip(tag)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  search.toLowerCase() === tag.toLowerCase()
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/60 text-foreground hover:bg-secondary"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen y botón de confirmación en la zona inferior */}
        <div className="mt-8 border-t border-border pt-4">
          <Button
            onClick={onViewResults}
            className="h-12 w-full rounded-xl font-bold shadow-md"
          >
            Ver {resultCount} resultado{resultCount === 1 ? "" : "s"} <ArrowRight className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* =========================================================================
   COMPONENTES DE APOYO EXISTENTES
   ========================================================================= */

function TopItem({ icon: Icon, text }: { icon: typeof Truck; text: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5 px-2">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </a>
  );
}

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className="absolute -right-2.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-primary-foreground shadow-sm ring-2 ring-background animate-in zoom-in-75 duration-200 pointer-events-none select-none"
      aria-label={`${count} artículos en el carrito`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primary-foreground">
      {value}
    </span>
  );
}

function HeroBenefit({ icon: Icon, title, text }: { icon: typeof Truck; title: string; text: string }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-xl p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <strong className="block text-xs">{title}</strong>
        <span className="block truncate text-[10px] text-muted-foreground">{text}</span>
      </span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action, href }: { eyebrow: string; title: string; action?: string; href?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h2>
      </div>
      {action && href && (
        <a href={href} className="hidden items-center gap-2 text-sm font-bold text-primary hover:underline sm:flex">
          {action}<ArrowRight className="size-4" />
        </a>
      )}
    </div>
  );
}

function ProductCard({
  product,
  favorite,
  cartQty = 0,
  onFavorite,
  onAdd,
  onQuickView,
}: {
  product: Product;
  favorite: boolean;
  cartQty?: number;
  onFavorite: () => void;
  onAdd: (quantity: number) => void;
  onQuickView: () => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-background p-3 transition duration-300 hover:-translate-y-1 hover:shadow-glass">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={1008}
          height={1008}
          onClick={onQuickView}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105 cursor-pointer"
        />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1.5 text-[10px] font-extrabold uppercase text-background">
            {product.badge}
          </span>
        )}
        <button
          onClick={onFavorite}
          aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          className={`absolute right-3 top-3 grid size-10 place-items-center rounded-full border border-glass-border bg-glass backdrop-blur-lg transition active:scale-90 ${
            favorite ? "text-destructive" : "text-foreground hover:text-destructive"
          }`}
        >
          <Heart className={`size-4 ${favorite ? "fill-current" : ""}`} />
        </button>

        {/* Botón flotante de Vista Rápida en hover */}
        <div className="absolute inset-x-3 bottom-3 hidden sm:flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          <button
            type="button"
            onClick={onQuickView}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-background/92 py-2 px-3 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition hover:bg-background hover:text-primary active:scale-95"
          >
            <Eye className="size-3.5" />
            Vista rápida
          </button>
        </div>
      </div>
      <div className="p-2 pt-4">
        <p className="text-[11px] font-bold uppercase text-muted-foreground">{product.category}</p>
        <h3
          onClick={onQuickView}
          className="mt-1 min-h-12 font-bold leading-6 cursor-pointer transition-colors hover:text-primary"
        >
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className="flex text-primary"><Star className="size-3.5 fill-current" /></span>
          <strong>{product.rating}</strong>
          <span className="text-muted-foreground">({product.reviews})</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <strong className="text-xl">{money.format(product.price)}</strong>
            <span className="ml-2 text-xs text-muted-foreground line-through">{money.format(product.oldPrice)}</span>
          </div>
          {quantity > 1 && (
            <span className="text-xs font-bold text-primary">
              Total: {money.format(product.price * quantity)}
            </span>
          )}
        </div>

        {/* Controles de Compra Múltiple: Selector de cantidad (+/-) y acción Añadir */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* Selector de cantidad (+/-) */}
            <div className="flex h-10 items-center rounded-xl border border-border bg-secondary/50 p-1 shrink-0 shadow-inner">
              <button
                type="button"
                aria-label="Restar una unidad"
                title="Restar unidad"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="grid size-8 place-items-center rounded-lg bg-card text-foreground transition hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-black text-foreground select-none">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Sumar una unidad"
                title={quantity >= product.stock ? "Stock máximo alcanzado" : "Sumar unidad"}
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="grid size-8 place-items-center rounded-lg bg-card text-foreground transition hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            {/* Botón principal de añadir */}
            <Button
              onClick={() => {
                onAdd(quantity);
                setQuantity(1);
              }}
              className="h-10 flex-1 rounded-xl text-xs font-bold active:scale-[0.98] gap-1.5 px-2.5 shadow-sm"
            >
              <ShoppingBag className="size-3.5 shrink-0" />
              <span className="truncate">
                Añadir{quantity > 1 ? ` (${quantity})` : ""}
              </span>
            </Button>

            {/* Botón Vista Rápida */}
            <button
              type="button"
              onClick={onQuickView}
              aria-label={`Vista rápida de ${product.name}`}
              title="Vista rápida y ficha técnica"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/60 text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95"
            >
              <Eye className="size-4" />
            </button>
          </div>

          {/* Estado de stock y en cesta */}
          <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
            <span>
              Stock: <strong className="text-foreground">{product.stock}</strong>
            </span>
            {cartQty > 0 && (
              <span className="font-extrabold text-primary flex items-center gap-1">
                <Check className="size-3" /> {cartQty} en el carrito
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function PromoBanner({
  title,
  text,
  image,
  action,
  dark = false,
}: {
  title: string;
  text: string;
  image: string;
  action: () => void;
  dark?: boolean;
}) {
  return (
    <div
      className={`relative min-h-96 overflow-hidden rounded-[2rem] ${
        dark ? "bg-dark-surface text-primary-foreground" : "bg-secondary text-foreground"
      }`}
    >
      <img
        src={image}
        alt=""
        loading="lazy"
        width={1008}
        height={1008}
        className="absolute right-0 top-0 h-full w-[62%] object-cover object-center opacity-90"
      />
      <div
        className={`absolute inset-0 ${
          dark
            ? "bg-gradient-to-r from-dark-surface via-dark-surface/90 to-transparent"
            : "bg-gradient-to-r from-secondary via-secondary/90 to-transparent"
        }`}
      />
      <div className="relative z-10 flex h-full min-h-96 max-w-[65%] flex-col justify-center p-7 sm:p-10">
        <p className={`text-xs font-extrabold uppercase tracking-[0.18em] ${dark ? "text-primary-foreground/60" : "text-primary"}`}>
          Oferta especial
        </p>
        <h3 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h3>
        <p className={`mt-3 text-sm leading-6 ${dark ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{text}</p>
        <Button variant={dark ? "secondary" : "default"} className="mt-7 w-fit rounded-xl" onClick={action}>
          Descubrir <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function Reason({ icon: Icon, title, text }: { icon: typeof Truck; title: string; text: string }) {
  return (
    <div>
      <span className="grid size-12 place-items-center rounded-xl bg-card text-primary shadow-sm">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function Testimonial({ quote, name, label }: { quote: string; name: string; label: string }) {
  return (
    <blockquote className="rounded-2xl border border-border bg-card p-7 shadow-sm">
      <div className="flex text-primary">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className="size-4 fill-current" />
        ))}
      </div>
      <p className="mt-5 text-sm leading-7">“{quote}”</p>
      <footer className="mt-6 border-t border-border pt-5">
        <strong className="block text-sm">{name}</strong>
        <span className="text-xs text-muted-foreground">{label}</span>
      </footer>
    </blockquote>
  );
}

function CartDrawer({
  open,
  setOpen,
  cart,
  total,
  appliedCoupon,
  setAppliedCoupon,
  setQuantity,
  onCheckout,
  submittingOrder = false,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  cart: Record<number, number>;
  total: number;
  appliedCoupon?: { code: string; percent?: number; fixed?: number } | null;
  setAppliedCoupon?: (coupon: { code: string; percent?: number; fixed?: number } | null) => void;
  setQuantity: (id: number, qty: number) => void;
  onCheckout?: () => void;
  submittingOrder?: boolean;
}) {
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const rows = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((product) => product.id === Number(id)), qty }))
    .filter((row): row is { product: Product; qty: number } => Boolean(row.product));

  const totalItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const discountAmount = appliedCoupon
    ? appliedCoupon.percent
      ? (total * appliedCoupon.percent) / 100
      : Math.min(total, appliedCoupon.fixed || 0)
    : 0;

  const subtotalAfterCoupon = Math.max(0, total - discountAmount);
  const shippingCost = subtotalAfterCoupon >= 50 || subtotalAfterCoupon === 0 ? 0 : 3.99;
  const grandTotal = subtotalAfterCoupon + shippingCost;

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setValidatingCoupon(true);
    setCouponMsg(null);
    try {
      const res = await validateSupabaseCoupon(couponCodeInput.trim());
      if (res.valid) {
        setAppliedCoupon?.({
          code: couponCodeInput.trim().toUpperCase(),
          percent: res.discountPercent,
          fixed: res.discountFixed,
        });
        setCouponMsg({ text: res.message || "Cupón aplicado con éxito", isError: false });
      } else {
        setCouponMsg({ text: res.message || "Cupón no válido", isError: true });
      }
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-[92%] flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>Tu carrito</span>
            {totalItemsCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-extrabold text-primary">
                {totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            {totalItemsCount
              ? `${totalItemsCount} ${totalItemsCount === 1 ? "artículo añadido" : "artículos añadidos"} a la cesta`
              : "Aún no has añadido productos."}
          </SheetDescription>
        </SheetHeader>
        {rows.length ? (
          <>
            {/* Barra de progreso de Envío Gratis */}
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Truck className="size-3.5 text-primary" />
                  {total >= 50 ? (
                    <strong className="text-primary">¡Tienes Envío Estándar GRATIS!</strong>
                  ) : (
                    <span>Te faltan <strong className="text-primary">{money.format(50 - total)}</strong> para envío gratis</span>
                  )}
                </span>
                <span className="font-extrabold text-muted-foreground">{Math.min(100, Math.round((total / 50) * 100))}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, (total / 50) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {rows.map(({ product, qty }) => (
                <div
                  key={product.id}
                  className="relative flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition hover:border-border"
                >
                  <div className="flex gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      width={1008}
                      height={1008}
                      className="size-20 shrink-0 rounded-xl object-cover bg-secondary border border-border/50"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="block truncate text-sm font-bold text-foreground" title={product.name}>
                          {product.name}
                        </strong>
                        <button
                          type="button"
                          onClick={() => setQuantity(product.id, 0)}
                          aria-label={`Eliminar ${product.name}`}
                          title="Eliminar artículo"
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground">{money.format(product.price)} / ud.</span>
                      </div>

                      {/* Selector de cantidad múltiple (+/-) y subtotal por producto */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-xl border border-border bg-secondary/60 p-0.5 shadow-inner">
                          <button
                            type="button"
                            aria-label={qty <= 1 ? "Eliminar producto" : "Restar una unidad"}
                            title={qty <= 1 ? "Eliminar del carrito" : "Restar unidad"}
                            onClick={() => setQuantity(product.id, qty - 1)}
                            className="grid size-7 place-items-center rounded-lg bg-card text-foreground transition hover:bg-secondary active:scale-90 shadow-xs"
                          >
                            {qty <= 1 ? <Trash2 className="size-3 text-destructive" /> : <Minus className="size-3" />}
                          </button>

                          <input
                            type="number"
                            min={1}
                            max={product.stock}
                            value={qty}
                            aria-label={`Cantidad de ${product.name}`}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                setQuantity(product.id, Math.min(product.stock, Math.max(1, val)));
                              }
                            }}
                            className="h-7 w-9 bg-transparent text-center text-xs font-black text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />

                          <button
                            type="button"
                            aria-label="Sumar una unidad"
                            title={qty >= product.stock ? "Stock máximo alcanzado" : "Sumar unidad"}
                            onClick={() => setQuantity(product.id, qty + 1)}
                            disabled={qty >= product.stock}
                            className="grid size-7 place-items-center rounded-lg bg-card text-foreground transition hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 shadow-xs"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="block text-sm font-extrabold text-foreground">
                            {money.format(product.price * qty)}
                          </span>
                          {qty >= product.stock && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Máx. disponible
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cupones de descuento sincronizados con la tabla coupons de Supabase */}
            <div className="border-t border-border pt-3">
              <div className="flex gap-2">
                <Input
                  value={couponCodeInput}
                  onChange={(e) => {
                    setCouponCodeInput(e.target.value);
                    setCouponMsg(null);
                  }}
                  placeholder="Cupón (ej: ESSENCIA10)"
                  className="h-9 text-xs uppercase font-mono rounded-xl"
                  disabled={Boolean(appliedCoupon)}
                />
                {appliedCoupon ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAppliedCoupon?.(null);
                      setCouponCodeInput("");
                      setCouponMsg(null);
                    }}
                    className="h-9 px-3 text-xs rounded-xl text-destructive"
                  >
                    Quitar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCodeInput.trim()}
                    className="h-9 px-3 text-xs rounded-xl font-bold"
                  >
                    {validatingCoupon ? "..." : "Aplicar"}
                  </Button>
                )}
              </div>
              {couponMsg && (
                <p className={`mt-1 text-[11px] ${couponMsg.isError ? "text-destructive" : "text-emerald-600 dark:text-emerald-400 font-semibold"}`}>
                  {couponMsg.text}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-foreground">{money.format(total)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Descuento ({appliedCoupon?.code}):</span>
                    <span>-{money.format(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span className="font-bold text-foreground">
                    {shippingCost === 0 ? <strong className="text-emerald-600 dark:text-emerald-400">GRATIS</strong> : "3,99 €"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                <span className="font-bold text-base">Total final</span>
                <strong className="text-2xl font-black text-foreground">
                  {money.format(grandTotal)}
                </strong>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">Impuestos incluidos · Conexión directa a Supabase.</p>
              <Button
                disabled={submittingOrder}
                onClick={onCheckout}
                className="mt-4 h-12 w-full rounded-xl text-sm font-bold shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                {submittingOrder ? "Procesando pedido..." : `Finalizar compra (${totalItemsCount})`}{" "}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
              <h3 className="mt-4 font-bold">Tu carrito está vacío</h3>
              <Button variant="outline" className="mt-5" onClick={() => setOpen(false)}>
                Seguir comprando
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Footer() {
  return (
    <footer className="bg-dark-surface text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a href="#inicio" className="text-2xl font-extrabold">
              Essencia<span className="text-electric">Shop</span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6 text-primary-foreground/60">
              Tecnología útil y accesorios seleccionados para acompañarte cada día.
            </p>
            <div className="mt-6 flex gap-2">
              <Social icon={Instagram} label="Instagram" />
              <Social icon={Heart} label="TikTok" />
              <Social icon={Smartphone} label="Facebook" />
            </div>
          </div>
          <FooterColumn title="Navegación" links={["Inicio", "Tienda", "Categorías", "Ofertas"]} />
          <FooterColumn title="Ayuda" links={["Preguntas frecuentes", "Envíos y entregas", "Cambios y devoluciones", "Seguimiento"]} />
          <div>
            <h3 className="text-sm font-extrabold">Contacto</h3>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/60">
              <li>hola@essenciashop.com</li>
              <li>Lunes a domingo, 24/7</li>
              <li>Atención en todo el país</li>
            </ul>
            <div className="mt-7 flex gap-2">
              {["VISA", "MC", "AMEX"].map((method) => (
                <span key={method} className="rounded-md border border-primary-foreground/20 px-2 py-1 text-[10px] font-extrabold">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/45 sm:flex-row">
          <span>© 2026 EssenciaShop. Prototipo visual.</span>
          <span>Privacidad · Términos · Cookies</span>
        </div>
      </div>
    </footer>
  );
}

function Social({ icon: Icon, label }: { icon: typeof Instagram; label: string }) {
  return (
    <a
      href="#inicio"
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-full border border-primary-foreground/15 text-primary-foreground/70 transition hover:border-primary-foreground/40 hover:text-primary-foreground"
    >
      <Icon className="size-4" />
    </a>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold">{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link}>
            <a href={link === "Inicio" ? "#inicio" : "#productos"} className="text-sm text-primary-foreground/60 transition hover:text-primary-foreground">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
