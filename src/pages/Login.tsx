import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isNativePlatform } from '@/hooks/usePlatform';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isNative = isNativePlatform();

  // On web, redirect away from login to signup
  useEffect(() => {
    if (!isNative) {
      navigate('/signup', { replace: true });
    }
  }, [isNative, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen care-gradient flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      <div className="mb-8">
        <Logo size="lg" variant="light" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-8 tracking-wide">LOGIN</h1>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
        <div>
          <label className="block text-white/80 text-sm mb-2 uppercase tracking-wide">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="care-input text-white border-white/30 bg-transparent placeholder:text-white/50"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-white/80 text-sm mb-2 uppercase tracking-wide">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="care-input text-white border-white/30 bg-transparent placeholder:text-white/50 pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6"
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <div className="text-center">
          <button type="button" className="text-white hover:text-white/80 text-sm font-medium">
            Reset Password
          </button>
        </div>

        <p className="text-center text-care-orange text-sm">
          First time logging in? Please try your email address as your password!
        </p>

      </form>
    </div>
  );
};

export default Login;
