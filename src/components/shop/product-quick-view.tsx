import { useState, useEffect } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Heart,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/products";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

interface ProductQuickViewProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
}

export function ProductQuickView({
  product,
  open,
  onOpenChange,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
}: ProductQuickViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"specs" | "features">("specs");

  // Reset quantity when product changes
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setCopied(false);
      setActiveTab("specs");
    }
  }, [product, open]);

  if (!product) return null;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const discountPercent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-4xl overflow-y-auto rounded-[2rem] p-5 sm:p-7 md:p-8 bg-card border-border/80 shadow-2xl">
        {/* Mobile grab pill */}
        <div className="mx-auto -mt-1 mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/25 md:hidden" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 items-start">
          {/* Columna Izquierda: Galería e Imagen de Producto */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary border border-border/60">
              <img
                src={product.image}
                alt={product.name}
                width={1008}
                height={1008}
                className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
              />
              {product.badge && (
                <span className="absolute left-3.5 top-3.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-extrabold uppercase text-background shadow-md">
                  {product.badge}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="absolute right-3.5 top-3.5 rounded-full bg-destructive px-3 py-1 text-[11px] font-extrabold text-destructive-foreground shadow-md">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Garantías y Beneficios Rápidos */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary/50 p-3 text-center text-xs">
              <div className="flex flex-col items-center gap-1">
                <Truck className="size-4 text-primary" />
                <span className="text-[11px] font-semibold">Envío 24-48h</span>
              </div>
              <div className="flex flex-col items-center gap-1 border-x border-border/60">
                <RotateCcw className="size-4 text-primary" />
                <span className="text-[11px] font-semibold">30 días cambio</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-[11px] font-semibold">Garantía 2 años</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Información, Especificaciones y Compra */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" />
                {product.category}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                SKU: {product.sku}
              </span>
            </div>

            <DialogTitle className="mt-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
              {product.name}
            </DialogTitle>

            {/* Valoraciones y Disponibilidad */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="flex text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${
                        i < Math.floor(product.rating)
                          ? "fill-current"
                          : "fill-primary/30 text-primary/30"
                      }`}
                    />
                  ))}
                </div>
                <strong className="ml-1 text-sm font-bold">{product.rating}</strong>
                <span className="text-muted-foreground">({product.reviews} opiniones)</span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>En stock ({product.stock} disponibles)</span>
              </div>
            </div>

            {/* Precios */}
            <div className="mt-4 flex items-baseline gap-3 border-y border-border/70 py-3.5">
              <span className="text-3xl font-extrabold text-foreground">
                {money.format(product.price)}
              </span>
              <span className="text-base text-muted-foreground line-through">
                {money.format(product.oldPrice)}
              </span>
              <span className="ml-auto text-xs font-extrabold text-primary bg-primary/10 rounded-lg px-2.5 py-1">
                Ahorras {money.format(product.oldPrice - product.price)}
              </span>
            </div>

            {/* Descripción Técnica */}
            <DialogDescription className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </DialogDescription>

            {/* Pestañas: Ficha Técnica / Características */}
            <div className="mt-5">
              <div className="flex border-b border-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className={`pb-2.5 pr-4 transition-colors relative ${
                    activeTab === "specs"
                      ? "text-primary font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Especificaciones Técnicas
                  {activeTab === "specs" && (
                    <span className="absolute bottom-0 left-0 right-4 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("features")}
                  className={`pb-2.5 px-4 transition-colors relative ${
                    activeTab === "features"
                      ? "text-primary font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Puntos Clave
                  {activeTab === "features" && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary" />
                  )}
                </button>
              </div>

              <div className="mt-3 min-h-[110px]">
                {activeTab === "specs" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {product.specs.map((spec, i) => (
                      <div
                        key={i}
                        className="flex flex-col rounded-xl bg-secondary/60 p-2.5 border border-border/40"
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          {spec.label}
                        </span>
                        <span className="mt-0.5 font-bold text-foreground">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {product.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="size-4 shrink-0 text-primary mt-0.5" />
                        <span className="font-medium text-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Selector de Cantidad y Botón de Añadir al Carrito */}
            <div className="mt-6 border-t border-border/70 pt-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Selector de unidades */}
                <div className="flex items-center justify-between sm:justify-start gap-3 rounded-xl border border-border bg-secondary/50 p-1.5">
                  <button
                    type="button"
                    aria-label="Disminuir cantidad"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="grid size-9 place-items-center rounded-lg bg-card text-foreground transition hover:bg-secondary disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-extrabold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="grid size-9 place-items-center rounded-lg bg-card text-foreground transition hover:bg-secondary disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Botón principal Añadir al Carrito */}
                <Button
                  onClick={() => {
                    onAddToCart(product, quantity);
                    onOpenChange(false);
                  }}
                  className="h-12 flex-1 rounded-xl text-sm font-bold shadow-md active:scale-[0.98]"
                >
                  <ShoppingBag className="size-4" />
                  Añadir al carrito · {money.format(product.price * quantity)}
                </Button>

                {/* Botón Favorito */}
                <button
                  type="button"
                  onClick={() => onToggleFavorite(product.id)}
                  aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
                  className={`grid size-12 shrink-0 place-items-center rounded-xl border transition active:scale-95 ${
                    isFavorite
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-secondary/50 text-foreground hover:border-destructive hover:text-destructive"
                  }`}
                >
                  <Heart className={`size-5 ${isFavorite ? "fill-current" : ""}`} />
                </button>

                {/* Botón Compartir */}
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Compartir producto"
                  title="Copiar enlace"
                  className="hidden sm:grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50 text-muted-foreground transition hover:text-foreground active:scale-95"
                >
                  {copied ? <Check className="size-5 text-emerald-500" /> : <Share2 className="size-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
