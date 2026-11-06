import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { supabase, isConfigured } from '../../lib/supabase';
import { useAuth } from './AuthProvider';

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, isAdmin } = useAuth() || {};

  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailNotice, setEmailNotice] = useState(false);

  // Si ya tiene sesión activa, redirigir automáticamente al workspace
  useEffect(() => {
    if (session) {
      if (isAdmin) {
        navigate('/super-admin', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [session, isAdmin, navigate]);

  // Medidor de fortaleza de contraseña en modo registro
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Aceptable', color: 'bg-amber-500' };
    if (score <= 3) return { score: 3, label: 'Buena', color: 'bg-sky-500' };
    return { score: 4, label: 'Segura', color: 'bg-emerald-500' };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setEmailNotice(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Por favor completa tu correo y contraseña.');
      return;
    }

    if (authTab === 'signup') {
      if (password.length < 6) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isConfigured && supabase) {
        if (authTab === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password
          });
          if (error) {
            if (error.message.includes('already registered') || error.status === 422) {
              throw new Error('Este correo ya está registrado. Selecciona "Iniciar Sesión" arriba.');
            }
            throw new Error(error.message);
          }
          if (data?.user && !data?.session) {
            setEmailNotice(true);
            setSubmitting(false);
            return;
          }
        } else {
          // Iniciar sesión
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
            }
            if (error.message.includes('Email not confirmed')) {
              throw new Error('Confirma tu correo electrónico antes de ingresar.');
            }
            throw new Error(error.message);
          }
        }
      }

      // Redirigir a la app
      if (cleanEmail === 'signalnotestudio@gmail.com') {
        navigate('/super-admin', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al autenticar');
    } finally {
      setSubmitting(false);
    }
  };

  // Acceso de emergencia offline (Para cajas sin conexión a internet)
  const handleOfflineAccess = () => {
    navigate('/app?tab=pos', { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      {/* Glow ambiental de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Cabecera / Branding Notion-style */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-extrabold text-lg shadow-inner">
            FY
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">FacturasYa POS</h1>
          <p className="text-xs text-zinc-400">
            Punto de Venta Fiscal y Gestión Cloud para Restaurantes
          </p>
        </div>

        {/* Selector de Pestañas: Iniciar Sesión / Crear Cuenta */}
        <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setErrorMsg('');
              setEmailNotice(false);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authTab === 'login'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('signup');
              setErrorMsg('');
              setEmailNotice(false);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authTab === 'signup'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Crear Cuenta Gratis
          </button>
        </div>

        {/* Notificación de confirmación por correo */}
        {emailNotice && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-bold text-white">¡Cuenta creada con éxito!</p>
              <p className="mt-0.5 text-[11px] text-zinc-300">
                Hemos enviado un correo a <span className="font-mono text-emerald-300">{email}</span>. Confirma el enlace para ingresar.
              </p>
            </div>
          </div>
        )}

        {/* Banner de error */}
        {errorMsg && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de autenticación */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@restaurante.com"
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-9 pr-10 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {authTab === 'signup' && password && (
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {authTab === 'signup' && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md cursor-pointer"
          >
            {submitting ? (
              <span className="inline-block w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{authTab === 'login' ? 'Iniciar Sesión' : 'Registrar Restaurante'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        

        {/* Pie de página con información y links */}
        <div className="text-center pt-2 text-[11px] text-zinc-500 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-zinc-400">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Compatible con Impresoras Fiscales SENIAT (HKA80 / COM2)</span>
          </div>
          <p>
            <Link to="/landing" className="text-zinc-400 hover:text-white underline underline-offset-2">
              Ver detalles de FacturasYa Cloud
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
