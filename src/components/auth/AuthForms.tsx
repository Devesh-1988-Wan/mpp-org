import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AuthFormsProps {
  onSuccess?: () => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          toast({
            title: "Account created",
            description: "Please check your email to verify your account.",
          });
          setMode('signin');
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been successfully signed in.",
          });
          onSuccess?.();
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          toast({
            title: "Reset email sent",
            description: "Please check your email for password reset instructions.",
          });
          setMode('signin');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin' && 'Enter your credentials to access your account'}
            {mode === 'signup' && 'Create a new account to get started'}
            {mode === 'forgot' && 'Enter your email to receive reset instructions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (
                <>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Email'}
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              {mode === 'signin' && (
                <>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => switchMode('forgot')}
                    className="text-sm"
                  >
                    Forgot your password?
                  </Button>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Don't have an account?{' '}
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => switchMode('signup')}
                      className="text-sm p-0"
                    >
                      Sign up
                    </Button>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => switchMode('signin')}
                    className="text-sm p-0"
                  >
                    Sign in
                  </Button>
                </div>
              )}

              {mode === 'forgot' && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => switchMode('signin')}
                  className="text-sm"
                >
                  Back to Sign In
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};