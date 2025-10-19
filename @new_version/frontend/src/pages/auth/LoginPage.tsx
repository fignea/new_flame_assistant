import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AlertCircle, 
  Flame, 
  Shield, 
  Zap, 
  ArrowRight, 
  Star, 
  Check, 
  Sun, 
  Moon, 
  Bot,
  Building2,
  Users
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  
  const { login, register } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegisterMode) {
        await register({
          email,
          password,
          name,
          tenant_slug: tenantSlug || undefined
        });
      } else {
        await login({
          email,
          password,
          tenant_slug: tenantSlug || undefined
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || `Error al ${isRegisterMode ? 'registrarse' : 'iniciar sesión'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card text-gray-900 dark:text-dark-primary overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* Floating Particles */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 4}s`
            }}
          />
        ))}
        
        {/* Mouse Follower Gradient */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl transition-all duration-1000 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <nav className="p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              FLAME
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-dark-secondary">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sistema Online</span>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-gray-200 dark:border-dark-border hover:border-purple-500/50 transition-all duration-300 hover:scale-105"
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 text-purple-400" />
              )}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Hero Content */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full px-4 py-2 border border-purple-500/30">
                  <Star className="w-4 h-4 text-purple-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium">
                    {isRegisterMode ? 'Crea tu cuenta' : 'Accede a tu cuenta'}
                  </span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  {isRegisterMode ? 'Únete a' : 'Inicia Sesión en'}
                  <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                    FLAME
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 dark:text-dark-secondary leading-relaxed max-w-2xl">
                  {isRegisterMode 
                    ? 'Crea tu organización y comienza a usar la plataforma más avanzada de mensajería IA.'
                    : 'Conecta con la plataforma más avanzada de mensajería IA.'
                  }
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Zap className="w-6 h-6" />,
                    title: isRegisterMode ? "Configuración Rápida" : "Acceso Instantáneo",
                    description: isRegisterMode ? "Configura en minutos" : "Conecta en segundos"
                  },
                  {
                    icon: <Shield className="w-6 h-6" />,
                    title: "Seguro y Confiable",
                    description: "Protección empresarial"
                  },
                  {
                    icon: <Building2 className="w-6 h-6" />,
                    title: "Multi-tenant",
                    description: "Aislamiento completo"
                  }
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className="group p-4 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-dark-border hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105"
                  >
                    <div className="text-purple-500 dark:text-purple-400 mb-2 group-hover:text-pink-400 transition-colors">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-dark-secondary">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Login/Register Card */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <div className="relative group">
                  {/* Card Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  
                  {/* Main Card */}
                  <div className="relative bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 dark:border-dark-border">
                    
                    {/* Card Header */}
                    <div className="text-center mb-8">
                      <div className="relative inline-block mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                          <Bot className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur animate-pulse"></div>
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                        {isRegisterMode ? '¡Crea tu Cuenta!' : '¡Bienvenido de Vuelta!'}
                      </h2>
                      <p className="text-gray-600 dark:text-dark-secondary">
                        {isRegisterMode ? 'Comienza tu experiencia FLAME' : 'Accede a tu cuenta FLAME'}
                      </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6">
                      <button
                        type="button"
                        onClick={() => setIsRegisterMode(false)}
                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                          !isRegisterMode
                            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Iniciar Sesión
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRegisterMode(true)}
                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                          isRegisterMode
                            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Registrarse
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name (only for register) */}
                      {isRegisterMode && (
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre completo
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Users className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              id="name"
                              name="name"
                              type="text"
                              autoComplete="name"
                              required={isRegisterMode}
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                              placeholder="Tu nombre completo"
                            />
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                            placeholder="tu@email.com"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Contraseña
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Tenant Slug (optional) */}
                      <div>
                        <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Organización (opcional)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building2 className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="tenantSlug"
                            name="tenantSlug"
                            type="text"
                            value={tenantSlug}
                            onChange={(e) => setTenantSlug(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                            placeholder="mi-empresa"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {isRegisterMode 
                            ? 'Si no especificas una organización, se creará una nueva para ti.'
                            : 'Especifica el slug de tu organización para acceder.'
                          }
                        </p>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                          <AlertCircle className="h-4 w-4" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="relative z-10 flex items-center justify-center space-x-2">
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>{isRegisterMode ? 'Creando cuenta...' : 'Iniciando sesión...'}</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5" />
                              <span>{isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </span>
                        
                        {/* Button Glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center justify-center space-x-2 text-green-400 mb-2">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Credenciales de demostración</span>
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 space-y-1 text-center">
                        <div><strong>Email:</strong> admin@demo.flame.com</div>
                        <div><strong>Contraseña:</strong> flame123</div>
                        <div><strong>Organización:</strong> (dejar vacío)</div>
                      </div>
                    </div>

                    {/* Security Badge */}
                    <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center justify-center space-x-2 text-green-400">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-medium">Seguridad Empresarial Garantizada</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center border-t border-gray-200/50 dark:border-dark-border/50">
          <p className="text-sm text-gray-600 dark:text-dark-secondary">
            © 2025 Flame by Fignea SRL. Transformando la comunicación empresarial con IA.
          </p>
        </footer>
      </div>
    </div>
  );
};