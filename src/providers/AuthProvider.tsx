import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { debug, info, error as loggerError } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    info('[AuthProvider] Initialization');
    
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      debug('[AuthProvider] Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (session?.user) {
        debug('[AuthProvider] Setting initial user:', {
          id: session.user.id,
          email: session.user.email,
          lastSignIn: session.user.last_sign_in_at
        });
        setUser(session.user);
      } else {
        info('[AuthProvider] No initial user found');
      }
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      debug('[AuthProvider] Auth state changed:', {
        event: _event,
        userId: session?.user?.id
      });
      
      setUser(session?.user ?? null);
      setSession(session);
    });

    return () => {
      debug('[AuthProvider] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    info('[AuthProvider] Signing out user:', user?.id);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    debug('[AuthProvider] Still loading...');
    return <div>Loading...</div>;
  }

  info('[AuthProvider] Ready:', {
    hasUser: !!user,
    userId: user?.id,
    hasSession: !!session
  });

  return (
    <AuthContext.Provider value={{ user, session, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
