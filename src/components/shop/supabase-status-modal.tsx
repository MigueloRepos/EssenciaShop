import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, Zap } from 'lucide-react';
import { verifyAllSupabaseTables, type TableStatus } from '@/lib/supabase-service';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SupabaseStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupabaseStatusModal({ open, onOpenChange }: SupabaseStatusModalProps) {
  const [statuses, setStatuses] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const runVerification = async () => {
    setLoading(true);
    try {
      const results = await verifyAllSupabaseTables();
      setStatuses(results);
      setCheckedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      runVerification();
    }
  }, [open]);

  const allConnected = statuses.length > 0 && statuses.every((s) => s.connected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto rounded-3xl p-6 bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Database className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Conexión Supabase Activa</span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Verificación de Tablas Supabase</span>
            {allConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3.5" /> 100% Verificado
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Comprobación en tiempo real del estado de comunicación entre cada sección de la tienda y las tablas de tu proyecto Supabase (<code className="font-mono text-[11px] text-foreground">weiofanfvngjhudxcabg</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tarjeta resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground block font-medium">Estado General</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="size-4" /> Conectado
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground block font-medium">Tablas Verificadas</span>
              <span className="text-sm font-bold text-foreground mt-1 block">
                {statuses.length} Tablas
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/30 p-3 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Autenticación / RLS</span>
              <span className="text-sm font-bold text-foreground mt-1 flex items-center gap-1">
                <Zap className="size-4 text-amber-500" /> Anon Key Activa
              </span>
            </div>
          </div>

          {/* Listado de tablas y estado */}
          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="size-5 animate-spin text-primary" />
                <span>Consultando las tablas de Supabase...</span>
              </div>
            ) : (
              statuses.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-secondary/20 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`size-7 rounded-lg grid place-items-center shrink-0 ${
                        item.connected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      <Layers className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold block text-foreground truncate">
                        {item.tableName}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {item.message}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        item.connected
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {item.connected ? 'Conectada' : 'Error'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {checkedAt && (
            <p className="text-[11px] text-muted-foreground text-right">
              Última comprobación: {checkedAt.toLocaleTimeString('es-ES')}
            </p>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runVerification}
              disabled={loading}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-verificar tablas
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              Entendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
