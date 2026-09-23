import { useState, useEffect } from 'react';
import { useAuth, formatAuthError } from '@/context/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User, LogOut, PackageCheck, ShoppingBag, Clock, CheckCircle2,
  Database, ShieldCheck, Mail, Smartphone, Fingerprint, Lock,
  Eye, EyeOff, KeyRound, AlertCircle, Copy, Check, Sparkles, RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isBiometricAvailable } from '@/lib/biometric';

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const COUNTRY_CODES = [
  { code: '+34', flag: '🇪🇸', label: 'España (+34)' },
  { code: '+1', flag: '🇺🇸', label: 'Estados Unidos (+1)' },
  { code: '+52', flag: '🇲🇽', label: 'México (+52)' },
  { code: '+57', flag: '🇨🇴', label: 'Colombia (+57)' },
  { code: '+54', flag: '🇦🇷', label: 'Argentina (+54)' },
  { code: '+56', flag: '🇨🇱', label: 'Chile (+56)' },
  { code: '+51', flag: '🇵🇪', label: 'Perú (+51)' },
  { code: '+44', flag: '🇬🇧', label: 'Reino Unido (+44)' },
  { code: '+33', flag: '🇫🇷', label: 'Francia (+33)' },
  { code: '+49', flag: '🇩🇪', label: 'Alemania (+49)' },
];

interface UserAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSupabaseStatus?: () => void;
}

interface OrderRecord {
  id: number | string;
  customerEmail: string;
  total: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: number | string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export function UserAccountModal({ open, onOpenChange, onOpenSupabaseStatus }: UserAccountModalProps) {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithPhone,
    signUpWithPhone,
    loginWithFingerprint,
    enrollFingerprint,
    removeFingerprint,
    hasFingerprintEnrolled,
    savedBiometricRecord,
    logOut,
    getIdToken,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'fingerprint'>('email');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableBiometricsAfterLogin, setEnableBiometricsAfterLogin] = useState(true);

  // Phone specific fields
  const [countryCode, setCountryCode] = useState('+34');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [phoneAccessType, setPhoneAccessType] = useState<'otp' | 'password'>('otp');
  const [smsCode, setSmsCode] = useState('');
  const [generatedSmsCode, setGeneratedSmsCode] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Status & Feedback
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(true);

  // Orders
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    if (user && open) {
      loadOrders();
    }
    if (!open) {
      setAuthError(null);
      setAuthSuccessMsg(null);
      setSmsSent(false);
      setGeneratedSmsCode(null);
    }
  }, [user, open]);

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);

      // 1. Intentar cargar desde Supabase si está disponible
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: supaOrders, error } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .order('created_at', { ascending: false });

          if (!error && supaOrders && supaOrders.length > 0) {
            const formatted: OrderRecord[] = supaOrders.map((o: any) => ({
              id: typeof o.id === 'string' ? o.id.slice(0, 8) : o.id,
              customerEmail: user?.email || '',
              total: String(o.total),
              status: o.status || 'completado',
              createdAt: o.created_at,
              items: (o.items || []).map((it: any) => ({
                id: it.id,
                name: `Artículo (${it.sku || 'SKU'})`,
                price: Number(it.unit_price || 0),
                quantity: it.quantity || 1,
              })),
            }));
            setOrders(formatted);
            return;
          }
        } catch (supaErr) {
          console.warn('Supabase fetch orders fallback:', supaErr);
        }
      }

      // 2. Cargar desde API de respaldo PostgreSQL
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Enviar código SMS demo / OTP
  const handleSendSmsCode = () => {
    if (!phoneRaw.trim()) {
      setAuthError('Introduce un número de teléfono móvil válido.');
      return;
    }
    setAuthError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedSmsCode(code);
    setSmsSent(true);
    setSmsCode('');
    setAuthSuccessMsg(`Código de verificación enviado al ${countryCode} ${phoneRaw.trim()}`);
  };

  const handleCopySmsCode = () => {
    if (generatedSmsCode) {
      navigator.clipboard.writeText(generatedSmsCode);
      setSmsCode(generatedSmsCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Submit Correo Electrónico
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!email.trim()) {
      setAuthError('Por favor introduce tu correo electrónico.');
      return;
    }
    if (!password || password.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setActionLoading(true);
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
        if (enableBiometricsAfterLogin) {
          await enrollFingerprint(password);
        }
      } else {
        await signUpWithEmail(email, password, displayName);
        if (enableBiometricsAfterLogin) {
          await enrollFingerprint(password);
        }
      }
    } catch (err: any) {
      setAuthError(formatAuthError(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Teléfono Móvil
  const handleSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!phoneRaw.trim()) {
      setAuthError('Introduce un número de teléfono móvil.');
      return;
    }

    const fullPhone = `${countryCode}${phoneRaw.replace(/[^0-9]/g, '')}`;

    if (phoneAccessType === 'otp') {
      if (!smsSent) {
        handleSendSmsCode();
        return;
      }
      if (!smsCode.trim()) {
        setAuthError('Introduce el código de 6 dígitos recibido por SMS.');
        return;
      }
      if (generatedSmsCode && smsCode.trim() !== generatedSmsCode) {
        setAuthError('El código de verificación SMS no coincide. Verifica e inténtalo de nuevo.');
        return;
      }
    } else {
      if (!password || password.length < 4) {
        setAuthError('Introduce tu PIN o contraseña (mínimo 4 caracteres).');
        return;
      }
    }

    const secretForAuth = phoneAccessType === 'otp' ? `sms_${fullPhone}_secure` : password;

    try {
      setActionLoading(true);
      if (authMode === 'signin') {
        try {
          await signInWithPhone(fullPhone, secretForAuth);
        } catch (signInErr: any) {
          // Si es OTP y la cuenta no existe aún, registrar automáticamente
          if (phoneAccessType === 'otp' && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')) {
            await signUpWithPhone(fullPhone, secretForAuth, displayName);
          } else {
            throw signInErr;
          }
        }
      } else {
        await signUpWithPhone(fullPhone, secretForAuth, displayName);
      }

      if (enableBiometricsAfterLogin) {
        await enrollFingerprint(secretForAuth);
      }
    } catch (err: any) {
      setAuthError(formatAuthError(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Login con Huella Dactilar
  const handleFingerprintLogin = async () => {
    setAuthError(null);
    setActionLoading(true);
    try {
      const res = await loginWithFingerprint();
      if (!res.success) {
        setAuthError(res.error || 'No se pudo verificar la huella.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Error en autenticación biométrica.');
    } finally {
      setActionLoading(false);
    }
  };

  // Registrar Huella desde el panel de usuario logueado
  const handleEnrollBiometricsFromProfile = async () => {
    setActionLoading(true);
    setAuthError(null);
    try {
      const res = await enrollFingerprint(password || 'session_token');
      if (res.success) {
        setAuthSuccessMsg('¡Huella dactilar activada correctamente en este dispositivo!');
        setTimeout(() => setAuthSuccessMsg(null), 4000);
      } else {
        setAuthError(res.error || 'No se pudo activar la huella.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Error activando biometría.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-y-auto rounded-3xl p-6 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="size-5 text-primary" />
            {user ? 'Mi Cuenta' : authMode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? 'Gestiona tus compras, seguridad biométrica y sincronización con Supabase.'
              : authMode === 'signin'
              ? 'Accede con tu correo, teléfono móvil o huella dactilar.'
              : 'Únete para guardar tus pedidos, acceder con huella y sincronizar tu carrito.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="size-6 animate-spin text-primary" />
            <span>Cargando estado de la cuenta...</span>
          </div>
        ) : !user ? (
          <div className="space-y-4 py-2">
            {/* Selector de Método de Autenticación */}
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary/40 p-1 text-xs font-bold border border-border/50">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setAuthError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
                  authMethod === 'email'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="size-3.5" />
                <span>Correo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('phone');
                  setAuthError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
                  authMethod === 'phone'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="size-3.5" />
                <span>Móvil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('fingerprint');
                  setAuthError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition relative ${
                  authMethod === 'fingerprint'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Fingerprint className="size-3.5" />
                <span>Huella</span>
                {hasFingerprintEnrolled && (
                  <span className="size-1.5 rounded-full bg-emerald-500 absolute top-2 right-2" />
                )}
              </button>
            </div>

            {/* Alternar Iniciar Sesión / Registrarse (solo para email y teléfono) */}
            {authMethod !== 'fingerprint' && (
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted-foreground">
                  {authMode === 'signin' ? '¿No tienes cuenta todavía?' : '¿Ya tienes una cuenta registrada?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="font-bold text-primary hover:underline"
                >
                  {authMode === 'signin' ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </button>
              </div>
            )}

            {/* Mensajes de Alerta / Éxito */}
            {authError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccessMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2 font-medium">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* 1. Formulario CORREO ELECTRÓNICO */}
            {authMethod === 'email' && (
              <form onSubmit={handleSubmitEmail} className="space-y-3 pt-1">
                {authMode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Nombre completo
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej. María García"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Correo electrónico
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-xl h-10 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {biometricAvailable && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={enableBiometricsAfterLogin}
                      onChange={(e) => setEnableBiometricsAfterLogin(e.target.checked)}
                      className="rounded accent-emerald-500 size-4"
                    />
                    <span className="flex items-center gap-1.5">
                      <Fingerprint className="size-3.5 text-emerald-500" />
                      Activar acceso rápido con Huella Dactilar en este equipo
                    </span>
                  </label>
                )}

                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2 active:scale-[0.98] mt-2"
                >
                  {actionLoading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  {authMode === 'signin' ? 'Iniciar Sesión con Correo' : 'Registrarse con Correo'}
                </Button>
              </form>
            )}

            {/* 2. Formulario TELÉFONO MÓVIL */}
            {authMethod === 'phone' && (
              <form onSubmit={handleSubmitPhone} className="space-y-3 pt-1">
                {authMode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Tu Nombre
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Número de teléfono móvil
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-10 rounded-xl border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="tel"
                      required
                      placeholder="612 345 678"
                      value={phoneRaw}
                      onChange={(e) => {
                        setPhoneRaw(e.target.value);
                        setSmsSent(false);
                      }}
                      className="rounded-xl h-10 text-xs flex-1"
                    />
                  </div>
                </div>

                {/* Sub-opción: Código SMS o Contraseña */}
                <div className="flex rounded-xl bg-secondary/30 p-1 text-[11px] font-semibold border border-border/50">
                  <button
                    type="button"
                    onClick={() => setPhoneAccessType('otp')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      phoneAccessType === 'otp' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Código SMS Instantáneo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneAccessType('password')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      phoneAccessType === 'password' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    Contraseña / PIN
                  </button>
                </div>

                {phoneAccessType === 'otp' ? (
                  <div className="space-y-2">
                    {!smsSent ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSendSmsCode}
                        className="w-full h-10 text-xs rounded-xl font-bold gap-2"
                      >
                        <Smartphone className="size-4 text-primary" />
                        Enviar Código de Verificación SMS
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        {/* Banner con código para testing inmediato */}
                        {generatedSmsCode && (
                          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                                Código SMS Simulado:
                              </span>
                              <span className="font-mono text-base font-extrabold tracking-widest text-primary">
                                {generatedSmsCode}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCopySmsCode}
                              className="h-8 rounded-lg text-xs gap-1.5"
                            >
                              {copiedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              {copiedCode ? 'Pegado' : 'Pegar código'}
                            </Button>
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                            Introduce el código de 6 dígitos
                          </label>
                          <Input
                            type="text"
                            maxLength={6}
                            placeholder="Ej. 123456"
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
                            className="rounded-xl h-10 text-center font-mono text-base tracking-widest font-bold"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSendSmsCode}
                          className="text-[11px] text-muted-foreground hover:text-foreground text-center w-full block"
                        >
                          ¿No te llegó el código? <span className="text-primary font-semibold underline">Reenviar SMS</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Contraseña o PIN de tu móvil
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Introduce tu PIN o clave"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rounded-xl h-10 text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {biometricAvailable && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={enableBiometricsAfterLogin}
                      onChange={(e) => setEnableBiometricsAfterLogin(e.target.checked)}
                      className="rounded accent-emerald-500 size-4"
                    />
                    <span className="flex items-center gap-1.5">
                      <Fingerprint className="size-3.5 text-emerald-500" />
                      Guardar huella para acceder sin código la próxima vez
                    </span>
                  </label>
                )}

                <Button
                  type="submit"
                  disabled={actionLoading || (phoneAccessType === 'otp' && !smsSent)}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2 active:scale-[0.98]"
                >
                  {actionLoading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Smartphone className="size-4" />
                  )}
                  {phoneAccessType === 'otp' ? 'Verificar y Acceder' : 'Acceder con Móvil'}
                </Button>
              </form>
            )}

            {/* 3. Formulario HUELLA DACTILAR (FINGERPRINT / WEBAUTHN) */}
            {authMethod === 'fingerprint' && (
              <div className="py-4 space-y-4 text-center">
                <div className="relative mx-auto size-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 grid place-items-center text-emerald-600 dark:text-emerald-400">
                  <Fingerprint className="size-10 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-20 pointer-events-none" />
                </div>

                {hasFingerprintEnrolled && savedBiometricRecord ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Huella Dactilar Registrada
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Cuenta vinculada:{' '}
                      <strong className="text-foreground">{savedBiometricRecord.displayName || savedBiometricRecord.email}</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Toca el botón a continuación para verificar tu huella en el sensor de tu dispositivo.
                    </p>
                    <Button
                      type="button"
                      onClick={handleFingerprintLogin}
                      disabled={actionLoading}
                      className="w-full h-12 rounded-xl text-sm font-bold gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98] mt-3"
                    >
                      {actionLoading ? (
                        <RefreshCw className="size-5 animate-spin" />
                      ) : (
                        <Fingerprint className="size-5" />
                      )}
                      Tocar para Acceder con Huella
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground">
                      Acceso Biométrico / Huella Dactilar
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      Entra a tu cuenta en 1 segundo usando el sensor de huellas (Touch ID, Face ID o sensor biométrico Android/Windows) sin necesidad de recordar contraseñas.
                    </p>
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                      <span>💡 Para activar la huella por primera vez, inicia sesión con tu </span>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('email')}
                        className="text-primary font-bold hover:underline"
                      >
                        correo
                      </button>
                      <span> o </span>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('phone')}
                        className="text-primary font-bold hover:underline"
                      >
                        móvil
                      </button>
                      <span> y se vinculará automáticamente.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Separador Google */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-semibold">
                  o también
                </span>
              </div>
            </div>

            {/* Botón Google */}
            <Button
              variant="outline"
              onClick={() => signInWithGoogle()}
              className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-3 active:scale-[0.98] border-border"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continuar con Google
            </Button>
          </div>
        ) : (
          /* ================= USUARIO AUTENTICADO ================= */
          <div className="space-y-4 pt-1">
            {/* Cabecera del usuario */}
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  className="size-12 rounded-full object-cover border border-border shadow-xs shrink-0"
                />
              ) : (
                <div className="size-12 rounded-full bg-primary/20 text-primary grid place-items-center font-black shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <strong className="block truncate text-sm font-bold text-foreground">
                    {user.displayName || 'Cliente Essencia'}
                  </strong>
                  {hasFingerprintEnrolled && (
                    <span title="Huella biométrica activa">
                      <Fingerprint className="size-3.5 text-emerald-500 shrink-0" />
                    </span>
                  )}
                </div>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.email?.startsWith('phone_')
                    ? `Móvil: +${user.email.replace('phone_', '').replace('@phone.essencia.es', '')}`
                    : user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logOut()}
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5 shrink-0"
              >
                <LogOut className="size-3.5" />
                Salir
              </Button>
            </div>

            {/* Pestañas Perfil / Pedidos */}
            <div className="flex rounded-xl bg-secondary/50 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 rounded-lg py-2 transition ${
                  activeTab === 'profile'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Detalles y Seguridad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`flex-1 rounded-lg py-2 transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PackageCheck className="size-3.5" />
                Pedidos ({orders.length})
              </button>
            </div>

            {activeTab === 'profile' ? (
              <div className="space-y-3 text-xs">
                {authSuccessMsg && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                    {authSuccessMsg}
                  </div>
                )}

                {/* Tarjeta de Seguridad y Huella Dactilar */}
                <div className="rounded-2xl border border-border p-3.5 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Fingerprint className="size-4 text-emerald-500" />
                      Acceso con Huella Dactilar
                    </span>
                    {hasFingerprintEnrolled ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                        <CheckCircle2 className="size-3" /> Activada
                      </span>
                    ) : (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                        No configurada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {hasFingerprintEnrolled
                      ? 'Este dispositivo está autorizado para iniciar sesión tocando tu sensor de huella o biometría.'
                      : 'Vincula el sensor de tu teléfono o PC para acceder sin escribir contraseñas ni códigos.'}
                  </p>
                  <div className="pt-1 flex gap-2">
                    {hasFingerprintEnrolled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeFingerprint}
                        className="text-xs text-destructive hover:bg-destructive/10 h-8 rounded-xl font-medium"
                      >
                        Desvincular huella de este equipo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleEnrollBiometricsFromProfile}
                        disabled={actionLoading}
                        className="text-xs h-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <Fingerprint className="size-3.5" />
                        Activar Huella Dactilar Ahora
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-3 bg-secondary/20 flex justify-between items-center">
                  <span className="text-muted-foreground">ID de cliente:</span>
                  <span className="font-mono font-semibold text-[11px] truncate max-w-[200px]">
                    {user.uid}
                  </span>
                </div>

                <div className="rounded-xl border border-border p-3 bg-secondary/20 flex justify-between items-center">
                  <span className="text-muted-foreground">Base de Datos:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Database className="size-3.5 text-emerald-500" /> Supabase (weiofanfvngjhudxcabg)
                  </span>
                </div>

                {onOpenSupabaseStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenSupabaseStatus();
                    }}
                    className="w-full text-xs h-9 rounded-xl gap-2 font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <ShieldCheck className="size-4" />
                    Verificar Estado de Tablas Supabase
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {loadingOrders ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Cargando pedidos...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    <Clock className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    Aún no tienes pedidos registrados en tu cuenta.
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-border bg-card p-3 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Pedido #{order.id}</span>
                        <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 font-extrabold uppercase text-[10px]">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="border-t border-border/60 pt-2 flex items-center justify-between font-bold">
                        <span>Total:</span>
                        <span className="text-sm text-primary">
                          {money.format(Number(order.total))}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
