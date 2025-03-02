import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { debug, info, error as loggerError } from '@/lib/logger';

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if the Supabase API key is valid on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error && error.message.includes("Invalid API key")) {
          setApiKeyValid(false);
          loggerError('[Auth] Invalid API key detected:', error);
        }
      } catch (err) {
        loggerError('[Auth] Error checking API key:', err);
        setApiKeyValid(false);
      }
    };
    
    checkApiKey();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyValid) {
      toast({
        variant: "destructive",
        title: "API Configuration Error",
        description: "There's an issue with the API configuration. Please contact support.",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      debug('[Auth] Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        loggerError('[Auth] Sign up error:', error);
        if (error.message.includes("User already registered")) {
          toast({
            variant: "destructive",
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
          });
        } else if (error.message.includes("Invalid API key")) {
          setApiKeyValid(false);
          toast({
            variant: "destructive",
            title: "API Configuration Error",
            description: "There's an issue with the API configuration. Please contact support.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
          });
        }
      } else {
        info('[Auth] Sign up successful for:', email);
        
        if (data?.user && !data.user.confirmed_at) {
          toast({
            title: "Check Your Email",
            description: "We've sent a confirmation link to your email. Please check your inbox and click the link to activate your account.",
          });
        } else {
          toast({
            title: "Success!",
            description: "Account created successfully. You can now sign in.",
          });
        }
      }
    } catch (err) {
      loggerError('[Auth] Unexpected error during sign up:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyValid) {
      toast({
        variant: "destructive",
        title: "API Configuration Error",
        description: "There's an issue with the API configuration. Please contact support.",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Invalid Credentials",
            description: "Please check your email and password and try again.",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            variant: "destructive",
            title: "Email Not Confirmed",
            description: "Please check your email for the confirmation link.",
          });
        } else if (error.message.includes("Invalid API key")) {
          setApiKeyValid(false);
          toast({
            variant: "destructive",
            title: "API Configuration Error",
            description: "There's an issue with the API configuration. Please contact support.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
          });
        }
      } else {
        navigate("/");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // If API key is invalid, show a friendly message
  if (!apiKeyValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Service Temporarily Unavailable</h2>
            <p className="mt-2 text-gray-600">
              We're experiencing some technical difficulties with our authentication service. 
              Our team has been notified and is working to resolve this issue.
            </p>
          </div>
          <div className="mt-6">
            <Button 
              className="w-full" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            If this issue persists, please contact support.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-display">Welcome to SmartEstate</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing up..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
