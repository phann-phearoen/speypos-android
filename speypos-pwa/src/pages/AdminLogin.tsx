import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthCompatibilityProvider } from '@/lib/compatibility/auth';
import { useToast } from '@/hooks/use-toast';

const authCompatibility = getAuthCompatibilityProvider();

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated as admin - moved to useEffect to prevent render issues
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Show loading state while redirecting
  if (isAuthenticated && isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !password.trim()) {
      setError('Please enter both name and password');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authCompatibility.login(name.trim(), password);
      
      if (response.error) {
        setError(response.error === 'Invalid credentials' ? 'Invalid credentials. Please try again.' : response.error);
        return;
      }

      if (response.data) {
        if (response.data.role !== 'admin') {
          setError('Access denied. Admin privileges required.');
          return;
        }

        login(response.data);
        toast({
          title: 'Welcome back!',
          description: `Logged in as ${response.data.name}`,
        });
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError('Connection error. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-pos-header text-pos-header-foreground flex items-center px-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-pos-header-foreground hover:bg-pos-header-foreground/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 ml-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-sm">SP</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">SpeyPOS Admin</span>
        </div>
      </header>

      {/* Login Form */}
      <main className="admin-login-shell flex-1 flex items-center justify-center overflow-auto p-4 sm:p-6">
        <div className="w-full max-w-5xl">
          <div className="admin-login-card grid overflow-hidden rounded-2xl border border-border bg-card shadow-elegant lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="hidden border-r border-border bg-muted/40 p-8 lg:flex lg:flex-col lg:justify-between">
              <div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Admin Access</h2>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                  Secure management access for store configuration, catalog updates, and operational controls.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Optimized for tablet landscape usage with on-screen keyboard.
              </div>
            </section>

            <section className="p-6 sm:p-8">
              <div className="mb-6 text-center lg:text-left">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 lg:mx-0 lg:hidden">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
                <p className="mt-2 text-muted-foreground">
                  Enter your credentials to access management
                </p>
              </div>

              <form onSubmit={handleSubmit} className="admin-login-form space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2 lg:gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="admin-login-input h-12 pl-10 text-base"
                        autoComplete="username"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="admin-login-input h-12 pl-10 text-base"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="admin-login-submit h-14 w-full text-lg font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
