import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Shield, 
  Zap, 
  MessageCircle, 
  Users, 
  Brain, 
  ArrowRight, 
  Star, 
  Check, 
  Sun, 
  Moon, 
  Crown, 
  Bot 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { WebChatWidget } from '../components/WebChatWidget';

const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "IA Avanzada",
      description: "Asistentes inteligentes que transforman tu comunicación"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Mensajería Unificada",
      description: "Todas tus conversaciones en un solo lugar"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Colaboración Épica",
      description: "Equipos conectados como nunca antes"
    }
  ];

  const stats = [
    { number: "99.9%", label: "Uptime" },
    { number: "2M+", label: "Mensajes/día" },
    { number: "500+", label: "Agentes AI" }
  ];

  const handleGetStarted = () => {
    navigate('/login');
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
                  <span className="text-sm font-medium">Revoluciona tu comunicación</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  El Futuro de la
                  <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                    Mensajería IA
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 dark:text-dark-secondary leading-relaxed max-w-2xl">
                  Conecta, colabora y conquista con una plataforma empresarial avanzada. 
                  <span className="text-purple-500 dark:text-purple-400 font-semibold"> Potenciada por IA.</span>
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {features.map((feature, index) => (
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

              {/* Stats */}
              <div className="flex justify-center lg:justify-start space-x-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-dark-secondary">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - CTA Card */}
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
                      
                      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">¡Únete GRATIS Ahora!</h2>
                      <p className="text-gray-600 dark:text-dark-secondary">Acceso instantáneo a la revolución</p>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-3 mb-8">
                      {[
                        "FREE * Acceso inmediato a IA",
                        "FREE *Integración Web lista para sitio",
                        "Setup en menos de 5 minutos"
                      ].map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-dark-secondary">{benefit}</span>
                        </div>
                      ))}
                      {[
                        "Acceso a IA avanzada",
                        "Integración Whatsapp Business e Instagram",
                        "Soporte 24/7 incluido"
                      ].map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full flex items-center justify-center">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-dark-secondary">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={handleGetStarted}
                      className="group relative w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2">
                        <Zap className="w-5 h-5" />
                        <span>Comenzar Ahora</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      
                      {/* Button Glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>

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

      {/* Widget de Chat Web */}
      <WebChatWidget
        userId={1}
        apiUrl="http://localhost:3001/api/integrations/web"
        title="¡Hola! ¿Tienes alguna pregunta?"
        subtitle="Estamos aquí para ayudarte a descubrir Flame AI"
        primaryColor="#8B5CF6"
        position="bottom-right"
        showAvatar={true}
        enableSound={true}
      />
    </div>
  );
};

export default LandingPage;
