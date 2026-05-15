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
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elegant p-8 border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
              <p className="text-muted-foreground mt-2">
                Enter your credentials to access management
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="pl-10 h-12 text-base"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 h-12 text-base"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
