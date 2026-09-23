import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ChevronDown,
  Eye,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { categories, type Category, type Product } from "@/data/products";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

interface HeaderDynamicSearchProps {
  search: string;
  setSearch: (value: string) => void;
  activeCategory: Category;
  setActiveCategory: (category: Category) => void;
  matchingProducts: Product[];
  onOpenQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onScrollToCatalog: () => void;
}

export function HeaderDynamicSearch({
  search,
  setSearch,
  activeCategory,
  setActiveCategory,
  matchingProducts,
  onOpenQuickView,
  onAddToCart,
  onScrollToCatalog,
}: HeaderDynamicSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggested quick searches
  const suggestedQueries = [
    "MagSafe",
    "GaN 65W",
    "Auriculares ANC",
    "Power Bank",
    "Smartwatch",
    "Cable USB-C",
  ];

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setCategoryMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setCategoryMenuOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelectCategory = (cat: Category) => {
    setActiveCategory(cat);
    setCategoryMenuOpen(false);
    onScrollToCatalog();
  };

  const handleSelectSuggestion = (query: string) => {
    setSearch(query);
    setIsOpen(false);
    onScrollToCatalog();
  };

  const handleViewAllResults = () => {
    setIsOpen(false);
    onScrollToCatalog();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Barra de Búsqueda Dinámica */}
      <div
        className={`flex items-center rounded-2xl border bg-card transition-all duration-200 shadow-xs ${
          isOpen
            ? "border-primary ring-2 ring-primary/20 shadow-md"
            : "border-border/80 hover:border-border"
        }`}
      >
        {/* Selector de Categoría integrado */}
        <div className="relative shrink-0 border-r border-border/60">
          <button
            type="button"
            onClick={() => setCategoryMenuOpen((prev) => !prev)}
            className="flex h-11 items-center gap-1.5 px-3 sm:px-3.5 text-xs font-semibold text-foreground hover:bg-secondary/70 rounded-l-2xl transition"
            title="Filtrar por categoría"
          >
            <span className="max-w-[100px] sm:max-w-[120px] truncate">
              {activeCategory === "Todos" ? "Todas" : activeCategory}
            </span>
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                categoryMenuOpen ? "rotate-180 text-primary" : ""
              }`}
            />
          </button>

          {/* Menú flotante de selección de categoría */}
          {categoryMenuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-2xl border border-border bg-card p-1.5 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Seleccionar Categoría
              </div>
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition text-left ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{cat}</span>
                    {activeCategory === cat && <Sparkles className="size-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input de búsqueda en tiempo real */}
        <div className="relative flex flex-1 items-center">
          <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={
              activeCategory === "Todos"
                ? "Buscar por nombre, categoría, modelo..."
                : `Buscar en ${activeCategory}...`
            }
            className="h-11 w-full bg-transparent pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Botón de limpiar búsqueda */}
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              aria-label="Borrar término de búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover / Dropdown de Resultados y Sugerencias en Tiempo Real */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          {search.trim() ? (
            /* Resultados que coinciden con la búsqueda */
            <div>
              <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 px-4 py-2.5 text-xs">
                <span className="font-semibold text-muted-foreground">
                  {matchingProducts.length}{" "}
                  {matchingProducts.length === 1 ? "resultado encontrado" : "resultados encontrados"}
                </span>
                {activeCategory !== "Todos" && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    En {activeCategory}
                  </span>
                )}
              </div>

              {matchingProducts.length > 0 ? (
                <div className="max-h-80 overflow-y-auto divide-y divide-border/50 p-1.5">
                  {matchingProducts.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="group flex items-center justify-between gap-3 rounded-xl p-2.5 transition hover:bg-secondary/70"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onOpenQuickView(product);
                          setIsOpen(false);
                        }}
                        className="flex flex-1 items-center gap-3 text-left min-w-0"
                      >
                        <img
                          src={product.image}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 rounded-lg object-cover bg-secondary shrink-0 border border-border/60"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
                            {product.category}
                          </p>
                          <h4 className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-extrabold text-foreground">
                              {money.format(product.price)}
                            </span>
                            <span className="text-[11px] text-muted-foreground line-through">
                              {money.format(product.oldPrice)}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenQuickView(product);
                            setIsOpen(false);
                          }}
                          title="Vista rápida"
                          className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(product);
                            setIsOpen(false);
                          }}
                          title="Añadir al carrito"
                          className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                        >
                          <ShoppingBag className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm font-bold text-foreground">No encontramos productos</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prueba con otra palabra o selecciona &quot;Todas las categorías&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("Todos");
                      setSearch("");
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              )}

              {/* Pie con botón para ver resultados en el catálogo */}
              {matchingProducts.length > 0 && (
                <div className="border-t border-border/70 bg-secondary/40 p-2 text-center">
                  <button
                    type="button"
                    onClick={handleViewAllResults}
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-card py-2 text-xs font-bold text-foreground hover:bg-secondary hover:text-primary transition border border-border/60"
                  >
                    Ver los {matchingProducts.length} productos en el catálogo
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Sugerencias y categorías populares cuando aún no se ha escrito */
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                  <Tag className="size-3.5 text-primary" />
                  Búsquedas populares
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedQueries.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => handleSelectSuggestion(query)}
                      className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/70 pt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                  <Sparkles className="size-3.5 text-primary" />
                  Explorar por categoría
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {categories.slice(1, 7).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`truncate rounded-lg p-2 text-left text-xs font-semibold transition border ${
                        activeCategory === cat
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-secondary/40 text-foreground hover:bg-secondary"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
