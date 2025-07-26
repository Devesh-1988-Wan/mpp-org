import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function AuthForms() {
  const { signIn, signUp, authBackend, setAuthBackend } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const action = isSignUp ? signUp : signIn;
    const { error } = await action(email, password);
    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* --- Backend Switcher --- */}
      <div className="flex flex-col items-center space-y-2">
        <Label>Choose Login Method</Label>
        <ToggleGroup
          type="single"
          value={authBackend}
          onValueChange={(value) => {
            if (value) setAuthBackend(value as 'supabase' | 'sqlserver');
          }}
        >
          <ToggleGroupItem value="sqlserver">SQL Server</ToggleGroupItem>
          <ToggleGroupItem value="supabase">Supabase</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create an account" : "Sign In"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials below to {isSignUp ? "create your account" : "log in"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
        </Button>
      </form>
      <p className="text-sm text-center text-muted-foreground">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <Button
          variant="link"
          className="p-0"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Sign In" : "Sign Up"}
        </Button>
      </p>
    </div>
  );
}