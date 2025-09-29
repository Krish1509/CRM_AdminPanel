'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useModeAnimation, ThemeAnimationType } from 'react-theme-switch-animation';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  UserIcon, 
  LockClosedIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  SunIcon,
  MoonIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Rocket, Star, Moon as MoonLucide } from 'lucide-react';
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_TAGLINE } from '@/lib/config';
import GlobalSkeleton from '../(dashboard)/components/GlobalSkeleton';

interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface LoginErrors {
  username?: string;
  password?: string;
  general?: string;
}

// Separate component for search params logic
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showRememberMeAlert, setShowRememberMeAlert] = useState(false);
  const [mounted, setMounted] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Use the react-theme-switch-animation hook
  const { ref: themeSwitchRef, toggleSwitchTheme, isDarkMode: hookDarkMode } = useModeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 400,
    easing: "ease-in-out",
    globalClassName: "dark",
    isDarkMode: isDarkMode,
    onDarkModeChange: (isDark: boolean) => {
      setIsDarkMode(isDark);
      localStorage.setItem('darkMode', isDark.toString());
    }
  });

  // Check for dark mode preference - prevent flash
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(savedMode ? savedMode === 'true' : prefersDark);
    setMounted(true);
  }, []);

  // Auto-focus username field when component mounts
  useEffect(() => {
    if (mounted && usernameInputRef.current) {
      // Small delay to ensure smooth transition and dark mode is set
      const timer = setTimeout(() => {
        usernameInputRef.current?.focus();
        // Add a subtle highlight effect
        usernameInputRef.current?.classList.add('animate-pulse');
        setTimeout(() => {
          usernameInputRef.current?.classList.remove('animate-pulse');
        }, 1000);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // Aggressive preloading for super fast navigation
  useEffect(() => {
    const preloadEverything = () => {
      // Preload all critical routes in parallel
      Promise.all([
        router.prefetch('/dashboard'),
        router.prefetch('/orders'),
        router.prefetch('/users'),
        router.prefetch('/fabrics'),
        // Preload API endpoints too (removed users API call to prevent conflicts)
        fetch('/api/orders?limit=10').catch(() => {})
      ]).catch(() => {}); // Silent fail
    };
    
    // Start preloading immediately
    const timer = setTimeout(preloadEverything, 300);
    return () => clearTimeout(timer);
  }, [router]);

  // Auto-login check for active session
  useEffect(() => {
    const checkActiveSession = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        return; // No session data, stay on login page
      }

      setIsCheckingSession(true);
      
      try {
        const response = await fetch('/api/auth/validate-session', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache' // Force fresh validation
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Active session found, auto-login successful
            // Auto-redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }
        
        // Session is invalid, clear stored data
        // Session validation failed, clearing stored data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
      } catch (error) {
        // On error, clear stored data to be safe
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkActiveSession();
  }, [router]);

  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const toggleDarkMode = () => {
    // Use the hook's toggle function for smooth animation
    toggleSwitchTheme();
  };

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      // Optimized timeout - 15 seconds for reliability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Start login API call and dashboard prefetch in parallel
      const [response] = await Promise.all([
        fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            rememberMe: formData.rememberMe
          }),
          signal: controller.signal
        }),
        // Prefetch dashboard in parallel with login
        router.prefetch('/dashboard')
      ]);
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        // Store token and user data immediately
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Show success message and redirect in parallel
        setShowSuccessMessage(true);
        
        // Redirect immediately - no delay
        router.push('/dashboard');
        
        // Don't set loading to false - let the redirect handle it
        return;
      } else {
        setErrors({ general: data.message || `Login failed (${response.status})` });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setErrors({ general: 'Login is taking longer than expected. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof LoginErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Show alert when Remember Me is checked
    if (field === 'rememberMe' && value === true) {
      setShowRememberMeAlert(true);
      // Auto-hide alert after 4 seconds
      setTimeout(() => setShowRememberMeAlert(false), 4000);
    }
  };

  const handleInputFocus = (field: string) => {
    setFocusedField(field);
  };

  const handleInputBlur = () => {
    setFocusedField(null);
  };

  // Show skeleton while checking session or not mounted
  if (isCheckingSession || !mounted) {
    return <GlobalSkeleton type="login" />;
  }

  // Also show skeleton for a brief moment to prevent flash
  if (!mounted) {
    return <GlobalSkeleton type="login" minLoadTime={200} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row theme-switch-root">

      {/* Left Side - Professional Design (Hidden on mobile, 55% on desktop) */}
      <div className={`hidden lg:block lg:w-[55%] relative overflow-hidden transition-all duration-700 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' 
          : 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600'
      }`}>
        {/* Main curved background */}
        <div className="absolute inset-0">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(96, 165, 250, 0.6)"} />
                <stop offset="50%" stopColor={isDarkMode ? "rgba(30, 58, 138, 0.8)" : "rgba(59, 130, 246, 0.5)"} />
                <stop offset="100%" stopColor={isDarkMode ? "rgba(30, 41, 59, 0.9)" : "rgba(99, 102, 241, 0.6)"} />
              </linearGradient>
            </defs>
            <path
              d="M0,0 L1000,0 L1000,800 Q900,900 800,850 Q700,800 600,850 Q500,900 400,800 Q300,700 200,750 Q100,800 0,700 Z"
              fill="url(#gradient1)"
            />
          </svg>
        </div>
        
        {/* Secondary curve */}
        <div className="absolute inset-0">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <path
              d="M0,100 Q200,200 400,150 Q600,100 800,200 Q900,250 1000,200 L1000,1000 L0,1000 Z"
              fill="rgba(255, 255, 255, 0.05)"
            />
          </svg>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Desktop Particles - Only visible on 1024px and above (Very Subtle) */}
          <div className="hidden lg:block">
            {/* Minimal subtle particles for desktop */}
            <div className="absolute top-1/4 left-1/6 w-1 h-1 bg-white/8 rounded-full shadow-sm shadow-white/5 animate-pulse duration-12000"></div>
            <div className="absolute bottom-1/4 right-1/6 w-1 h-1 bg-blue-200/6 rounded-full shadow-sm shadow-blue-200/5 animate-pulse duration-15000 delay-3000"></div>
            <div className="absolute top-1/3 right-1/6 w-1 h-1 bg-white/6 rounded-full shadow-sm shadow-white/5 animate-pulse duration-14000 delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/6 w-1 h-1 bg-indigo-200/5 rounded-full shadow-sm shadow-indigo-200/5 animate-pulse duration-11000 delay-2000"></div>
            
            {/* Additional left section desktop particles */}
            <div className="absolute top-1/6 left-1/5 w-1 h-1 bg-white/7 rounded-full shadow-sm shadow-white/5 animate-pulse duration-13500 delay-500"></div>
            <div className="absolute top-2/3 right-1/5 w-1 h-1 bg-blue-200/5 rounded-full shadow-sm shadow-blue-200/5 animate-pulse duration-12500 delay-1500"></div>
            <div className="absolute bottom-1/6 right-1/4 w-1 h-1 bg-white/6 rounded-full shadow-sm shadow-white/5 animate-pulse duration-16000 delay-2500"></div>
            <div className="absolute top-4/5 left-1/4 w-1 h-1 bg-indigo-200/4 rounded-full shadow-sm shadow-indigo-200/5 animate-pulse duration-17000 delay-1800"></div>
            <div className="absolute bottom-2/5 left-1/5 w-1 h-1 bg-white/5 rounded-full shadow-sm shadow-white/5 animate-pulse duration-14500 delay-2200"></div>
            <div className="absolute top-1/2 right-1/6 w-1 h-1 bg-blue-200/6 rounded-full shadow-sm shadow-blue-200/5 animate-pulse duration-15500 delay-700"></div>
          </div>
          
          {/* Floating circles - Subtle and professional */}
          <div className="absolute top-20 left-20 w-32 h-32 border border-white/15 rounded-full animate-float-slow hover:scale-105 transition-transform duration-500"></div>
          <div className="absolute bottom-40 right-20 w-24 h-24 border border-white/18 rounded-full animate-float-slow delay-2000 hover:scale-105 transition-transform duration-500"></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 border border-white/12 rounded-full animate-float-slow delay-4000 hover:scale-105 transition-transform duration-500"></div>
          <div className="absolute top-32 right-32 w-20 h-20 border border-white/10 rounded-full animate-float-slow delay-3000 hover:scale-105 transition-transform duration-500"></div>
          
          {/* Floating icons - Subtle animations */}
          <Star className="absolute top-16 right-40 w-6 h-6 text-white/25 animate-float-gentle hover:scale-110 transition-transform duration-500" />
          <MoonLucide className="absolute bottom-32 left-24 w-5 h-5 text-white/30 animate-float-gentle delay-1500 hover:scale-110 transition-transform duration-500" />
          
          {/* Subtle particles */}
          <div className="absolute top-40 left-1/3 w-2 h-2 bg-white/15 rounded-full animate-fade-in-out"></div>
          <div className="absolute bottom-60 right-1/3 w-1.5 h-1.5 bg-white/12 rounded-full animate-fade-in-out delay-3000"></div>
          <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-blue-200/40 rounded-full animate-fade-in-out delay-1500"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-indigo-200/35 rounded-full animate-fade-in-out delay-4500"></div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full px-8 lg:px-16 text-white py-12 lg:py-0">
          {/* Dark Mode Toggle - Left Section (Mobile Only) */}
          <div className="lg:hidden absolute top-4 right-4 z-20">
            <button
              ref={themeSwitchRef}
              onClick={toggleDarkMode}
              className={`p-3 rounded-full transition-all duration-300 shadow-lg hover:scale-110 transform ${
                isDarkMode
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/90 border border-slate-600/50 hover:shadow-slate-500/25'
                  : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-200/50 shadow-xl hover:shadow-slate-300/25'
              }`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>
          
          <div className="max-w-lg text-center">
            {/* CRM Logo and Branding */}
            <div className="flex items-center justify-center mb-10 animate-fade-in-subtle">
              <div className={`h-18 w-18 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-700 hover:scale-105 hover:rotate-1 transform ${
                isDarkMode
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/40'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/50'
              }`}>
                <BuildingOfficeIcon className="h-9 w-9 text-white" />
              </div>
              <div className="ml-5 animate-slide-in-subtle">
                <h1 className="text-4xl font-bold tracking-tight text-white">{BRAND_NAME}</h1>
                <p className="text-blue-200 text-sm font-medium mt-1">{BRAND_TAGLINE}</p>
              </div>
            </div>
            
            <h2 className="text-5xl lg:text-6xl font-bold mb-8 leading-tight tracking-tight">
              Welcome to
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200">
                {BRAND_NAME}
              </span>
            </h2>
            
          </div>
        </div>
      </div>

      {/* Mobile Header - Only visible on mobile/tablet */}
      <div className={`lg:hidden relative overflow-hidden transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' 
          : 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600'
      }`}>
        {/* Mobile particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-4 left-4 w-2 h-2 bg-white/10 rounded-full animate-fade-in-out"></div>
          <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-white/8 rounded-full animate-fade-in-out delay-2000"></div>
          <div className="absolute bottom-4 left-1/3 w-1 h-1 bg-blue-200/30 rounded-full animate-fade-in-out delay-1000"></div>
          <div className="absolute bottom-6 right-1/4 w-1.5 h-1.5 bg-indigo-200/25 rounded-full animate-fade-in-out delay-3000"></div>
        </div>
        
        <div className="flex items-center justify-center py-6 px-4 relative z-10">
          {/* Dark Mode Toggle - Top Right of Left Side (Mobile) */}
          <div className="absolute top-4 right-4 z-20">
            <button
              ref={themeSwitchRef}
              onClick={toggleDarkMode}
              className={`p-3 rounded-full transition-all duration-300 shadow-lg hover:scale-110 transform ${
                isDarkMode
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/90 border border-slate-600/50 hover:shadow-slate-500/25'
                  : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-200/50 shadow-xl hover:shadow-slate-300/25'
              }`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>
          
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-xl transition-all duration-300 ${
            isDarkMode
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/40'
          }`}>
            <BuildingOfficeIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{BRAND_NAME}</h1>
            <p className="text-blue-200 text-xs font-medium mt-1">{BRAND_TAGLINE}</p>
          </div>
        </div>
      </div>

              {/* Right Side - Login Form (Full width on mobile, 45% on desktop) */}
        <div className={`flex-1 lg:w-[45%] flex items-center justify-center p-6 sm:p-8 lg:p-10 xl:p-12 transition-all duration-300 relative overflow-hidden ${
          isDarkMode 
            ? 'bg-slate-900' 
            : 'bg-white'
        }`}>
          {/* Mobile Particles - Only visible on 1024px and below */}
          <div className="lg:hidden absolute inset-0 pointer-events-none">
            {/* Subtle floating particles with smooth animations */}
            <div className="absolute top-1/5 left-1/6 w-1.5 h-1.5 bg-blue-400/40 rounded-full shadow-lg shadow-blue-400/30 animate-pulse duration-3000"></div>
            <div className="absolute top-1/3 right-1/5 w-1 h-1 bg-indigo-400/35 rounded-full shadow-md shadow-indigo-400/25 animate-pulse duration-2500 delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-purple-400/30 rounded-full shadow-lg shadow-purple-400/20 animate-pulse duration-4000 delay-500"></div>
            <div className="absolute bottom-1/4 right-1/6 w-1 h-1 bg-blue-300/40 rounded-full shadow-md shadow-blue-300/25 animate-pulse duration-3500 delay-1500"></div>
            <div className="absolute top-2/5 left-1/8 w-1 h-1 bg-indigo-300/35 rounded-full shadow-lg shadow-indigo-300/20 animate-pulse duration-3000 delay-2000"></div>
            
            {/* Elegant floating orbs with gentle glow */}
            <div className="absolute top-20 left-1/3 w-2.5 h-2.5 bg-blue-400/25 rounded-full shadow-xl shadow-blue-400/20 animate-pulse duration-5000 delay-300"></div>
            <div className="absolute bottom-28 right-1/4 w-2 h-2 bg-indigo-400/30 rounded-full shadow-lg shadow-indigo-400/25 animate-pulse duration-4500 delay-1200"></div>
            
            {/* Smooth floating elements with professional look */}
            <div className="absolute top-12 left-1/2 w-1.5 h-1.5 bg-purple-400/25 rounded-full shadow-lg shadow-purple-400/15 animate-pulse duration-4000 delay-700"></div>
            <div className="absolute bottom-20 left-1/5 w-1 h-1 bg-blue-300/30 rounded-full shadow-md shadow-blue-300/20 animate-pulse duration-3500 delay-1400"></div>
            
            {/* Additional subtle elements for depth */}
            <div className="absolute top-1/2 right-1/6 w-1 h-1 bg-indigo-400/20 rounded-full shadow-sm shadow-indigo-400/15 animate-pulse duration-6000 delay-800"></div>
            <div className="absolute bottom-1/6 left-1/3 w-1.5 h-1.5 bg-purple-300/25 rounded-full shadow-lg shadow-purple-300/15 animate-pulse duration-5000 delay-1600"></div>
            
            {/* Extra mobile particles for better coverage */}
            <div className="absolute top-1/6 right-1/8 w-1 h-1 bg-blue-300/25 rounded-full shadow-sm shadow-blue-300/15 animate-pulse duration-5000 delay-900"></div>
            <div className="absolute bottom-1/5 left-1/5 w-1.5 h-1.5 bg-indigo-300/20 rounded-full shadow-md shadow-indigo-300/15 animate-pulse duration-4500 delay-1100"></div>
            <div className="absolute top-3/5 right-1/4 w-1 h-1 bg-purple-300/30 rounded-full shadow-sm shadow-purple-300/20 animate-pulse duration-3800 delay-1300"></div>
            
            {/* Additional mobile particles for rich coverage */}
            <div className="absolute top-1/8 left-1/4 w-1 h-1 bg-blue-400/20 rounded-full shadow-sm shadow-blue-400/15 animate-pulse duration-4200 delay-400"></div>
            <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-indigo-400/25 rounded-full shadow-md shadow-indigo-400/20 animate-pulse duration-4800 delay-600"></div>
            <div className="absolute bottom-1/8 right-1/3 w-1 h-1 bg-purple-400/20 rounded-full shadow-sm shadow-purple-400/15 animate-pulse duration-3600 delay-1000"></div>
            <div className="absolute top-4/5 left-1/3 w-1.5 h-1.5 bg-blue-300/30 rounded-full shadow-md shadow-blue-300/20 animate-pulse duration-5200 delay-1200"></div>
            <div className="absolute bottom-2/5 left-1/6 w-1 h-1 bg-indigo-300/25 rounded-full shadow-sm shadow-indigo-300/15 animate-pulse duration-4400 delay-800"></div>
            <div className="absolute top-1/2 left-1/8 w-1 h-1 bg-purple-300/20 rounded-full shadow-sm shadow-purple-300/15 animate-pulse duration-5000 delay-1500"></div>
            <div className="absolute bottom-3/5 right-1/5 w-1.5 h-1.5 bg-blue-400/25 rounded-full shadow-md shadow-blue-400/20 animate-pulse duration-4600 delay-1100"></div>
          </div>
          
          {/* Desktop Particles - Only visible on 1024px and above (Very Subtle) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none">
            {/* Minimal subtle particles for desktop */}
            <div className="absolute top-1/4 left-1/6 w-1 h-1 bg-slate-400/10 rounded-full shadow-sm shadow-slate-400/5 animate-pulse duration-8000"></div>
            <div className="absolute bottom-1/4 right-1/6 w-1 h-1 bg-slate-500/8 rounded-full shadow-sm shadow-slate-500/5 animate-pulse duration-10000 delay-2000"></div>
            <div className="absolute top-1/3 right-1/8 w-1 h-1 bg-slate-400/8 rounded-full shadow-sm shadow-slate-400/5 animate-pulse duration-12000 delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/8 w-1 h-1 bg-slate-500/6 rounded-full shadow-sm shadow-slate-500/5 animate-pulse duration-9000 delay-3000"></div>
            
            {/* Additional desktop particles for better coverage */}
            <div className="absolute top-1/6 left-1/5 w-1 h-1 bg-slate-400/8 rounded-full shadow-sm shadow-slate-400/5 animate-pulse duration-11000 delay-500"></div>
            <div className="absolute top-2/3 right-1/5 w-1 h-1 bg-slate-500/6 rounded-full shadow-sm shadow-slate-500/5 animate-pulse duration-9500 delay-1500"></div>
            <div className="absolute bottom-1/6 right-1/4 w-1 h-1 bg-slate-400/7 rounded-full shadow-sm shadow-slate-400/5 animate-pulse duration-13000 delay-2500"></div>
            <div className="absolute top-4/5 left-1/4 w-1 h-1 bg-slate-500/5 rounded-full shadow-sm shadow-slate-500/5 animate-pulse duration-14000 delay-1800"></div>
            <div className="absolute bottom-2/5 left-1/5 w-1 h-1 bg-slate-400/6 rounded-full shadow-sm shadow-slate-400/5 animate-pulse duration-10500 delay-2200"></div>
            <div className="absolute top-1/2 right-1/6 w-1 h-1 bg-slate-500/7 rounded-full shadow-sm shadow-slate-500/5 animate-pulse duration-11500 delay-700"></div>
          </div>
          
          {/* Dark Mode Toggle - Right Section (Desktop Only) */}
          <div className="hidden lg:block absolute top-4 right-4 z-20">
            <button
              ref={themeSwitchRef}
              onClick={toggleDarkMode}
              className={`p-3 rounded-full transition-all duration-300 shadow-lg hover:scale-110 transform ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 hover:shadow-slate-500/25'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xl hover:shadow-slate-300/25'
              }`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>

        {/* Login Form Container */}
        <div className="w-full max-w-sm lg:max-w-sm xl:max-w-md">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <h3 className={`text-3xl sm:text-4xl lg:text-4xl font-bold mb-3 lg:mb-4 transition-colors duration-300 tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Welcome Back
            </h3>
            <p className={`text-lg sm:text-xl lg:text-xl transition-colors duration-300 font-medium ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Sign in to your account
            </p>
          </div>

          {/* Success Message */}
          {showSuccessMessage && (
            <div className={`mb-6 lg:mb-8 p-3 lg:p-4 rounded-xl flex items-center space-x-3 shadow-lg ${
              isDarkMode 
                ? 'bg-green-900/30 border border-green-700/50 backdrop-blur-sm' 
                : 'bg-green-50 border border-green-200 shadow-green-100'
            }`}>
              <CheckCircleIcon className={`h-5 w-5 lg:h-6 lg:w-6 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`} />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-green-300' : 'text-green-800'
              }`}>
                Registration successful! Please log in.
              </span>
            </div>
          )}

          {/* Error Message */}
          {errors.general && (
            <div className={`mb-6 lg:mb-8 p-3 lg:p-4 ml-6 rounded-xl flex items-center justify-center space-x-3 shadow-lg w-full lg:w-80 xl:w-96 ${
              isDarkMode 
                ? 'bg-transparent border-none shadow-none ' 
                : 'bg-transparent border-none shadow-none'
            }`}>
              <ExclamationTriangleIcon className={`h-5 w-5 lg:h-6 lg:w-6 ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`} />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-red-300' : 'text-red-800'
              }`}>
                {errors.general}
              </span>
            </div>
          )}

          {/* Remember Me Alert */}
          {showRememberMeAlert && (
            <div className={`mb-6 ml-8 lg:mb-8 p-4 lg:p-5 rounded-xl flex items-center space-x-3 shadow-lg w-full lg:w-80 xl:w-96 border-2 ${
              isDarkMode 
                ? 'bg-blue-900/30 border-blue-500/50 backdrop-blur-sm' 
                : 'bg-blue-50 border-blue-200 shadow-blue-100'
            } animate-fade-in-up`}>
              <div className={`p-2 rounded-full ${
                isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <CheckCircleIcon className={`h-5 w-5 lg:h-6 lg:w-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-semibold ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-800'
                }`}>
                  Session Extended!
                </h4>
                <p className={`text-xs ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  Your session will now last 30 days instead of 7 days
                </p>
              </div>
              <button
                onClick={() => setShowRememberMeAlert(false)}
                className={`p-1 rounded-full transition-colors duration-200 ${
                  isDarkMode 
                    ? 'text-blue-400 hover:bg-blue-500/20' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                <XMarkIcon className="h-4 w-4" /> {/* Add this import */} 
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8 flex flex-col items-center">
            {/* Username Field */}
            <div className="relative w-full lg:w-80 xl:w-96">
              <div className="relative transition-all duration-300">
                <div className={`absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none transition-colors duration-300 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <UserIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  onFocus={() => handleInputFocus('username')}
                  onBlur={handleInputBlur}
                  placeholder="Enter your username"
                  className={`w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 border-2 rounded-xl transition-all duration-300 focus:outline-none font-medium text-base ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:bg-slate-700 shadow-lg'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 focus:border-blue-500 shadow-lg'
                  } ${errors.username ? 'border-red-500' : ''}`}
                />
                {focusedField === 'username' && (
                  <div className={`absolute -top-2 left-3 lg:left-4 px-2 lg:px-3 text-xs font-semibold transition-colors duration-300 rounded-md ${
                    isDarkMode 
                      ? 'text-blue-400 bg-slate-900 border border-slate-700' 
                      : 'text-blue-600 bg-white border border-slate-200'
                  }`}>
                    Username
                  </div>
                )}
              </div>
              {errors.username && (
                <p className={`mt-2 text-sm font-medium ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {errors.username}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="relative w-full lg:w-80 xl:w-96">
              <div className="relative transition-all duration-300">
                <div className={`absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none transition-colors duration-300 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <LockClosedIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
                <input
                  type={isPasswordShown ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onFocus={() => handleInputFocus('password')}
                  onBlur={handleInputBlur}
                  placeholder="Enter your password"
                  className={`w-full pl-10 lg:pl-12 pr-12 lg:pr-14 py-3 lg:py-4 border-2 rounded-xl transition-all duration-300 focus:outline-none font-medium text-base ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:bg-slate-700 shadow-lg'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 focus:border-blue-500 shadow-lg'
                  } ${errors.password ? 'border-red-500' : ''}`}
                />
                {focusedField === 'password' && (
                  <div className={`absolute -top-2 left-3 lg:left-4 px-2 lg:px-3 text-xs font-semibold transition-colors duration-300 rounded-md ${
                    isDarkMode 
                      ? 'text-blue-400 bg-slate-900 border border-slate-700' 
                      : 'text-blue-600 bg-white border border-slate-200'
                  }`}>
                    Password
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsPasswordShown(!isPasswordShown)}
                  className={`absolute inset-y-0 right-0 pr-4 lg:pr-5 flex items-center transition-colors duration-300 ${
                    isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {isPasswordShown ? (
                    <EyeSlashIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                  ) : (
                    <EyeIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className={`mt-2 text-sm font-medium ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-left mb-6 w-full lg:w-80 xl:w-96">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div 
                  onClick={() => handleInputChange('rememberMe', !formData.rememberMe)}
                  className={`relative w-5 h-5 rounded-md border-2 transition-all duration-300 group-hover:scale-110 ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-600 group-hover:border-blue-400'
                      : 'bg-white border-slate-300 group-hover:border-blue-500'
                  }`}
                >
                  {formData.rememberMe && (
                    <div className={`absolute inset-0 flex items-center justify-center rounded-md transition-all duration-300 ${
                      isDarkMode
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-blue-600 border-blue-600'
                    }`}>
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span 
                  onClick={() => handleInputChange('rememberMe', !formData.rememberMe)}
                  className={`text-base font-medium transition-colors duration-300 group-hover:scale-105 transform ${
                    isDarkMode ? 'text-slate-300 group-hover:text-slate-200' : 'text-slate-700 group-hover:text-slate-900'
                  }`}
                >
                  Remember me
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full lg:w-80 xl:w-96 flex items-center justify-center px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold text-base lg:text-lg transition-all duration-300 cursor-pointer shadow-xl ${
                isLoading
                  ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 transform hover:scale-105'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 transform hover:scale-105'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <span>Sign in</span>
                  <ArrowRightIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes fade-in-subtle {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in-subtle {
          0% { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fade-in-out {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        
        .animate-float-gentle {
          animation: float-gentle 4s ease-in-out infinite;
        }
        
        .animate-fade-in-subtle {
          animation: fade-in-subtle 1.5s ease-out;
        }
        
        .animate-slide-in-subtle {
          animation: slide-in-subtle 1.5s ease-out 0.5s both;
        }
        
        .animate-fade-in-out {
          animation: fade-in-out 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
            <Suspense fallback={<GlobalSkeleton type="login" minLoadTime={200} />}>
      <LoginForm />
    </Suspense>
  );
}