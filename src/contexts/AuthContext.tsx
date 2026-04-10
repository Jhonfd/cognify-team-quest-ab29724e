import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: AppRole | null;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    setUserRole((data?.role as AppRole) ?? null);
  };

  const ensureUserRecords = async (authUser: User) => {
    const name = typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name.trim() : '';
    const role = authUser.user_metadata?.role === 'admin' ? 'admin' : 'student';
    const email = authUser.email ?? '';

    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase.from('profiles').select('id, name, email').eq('user_id', authUser.id).maybeSingle(),
      supabase.from('user_roles').select('id').eq('user_id', authUser.id).maybeSingle(),
    ]);

    if (!profile) {
      await supabase.from('profiles').insert({
        user_id: authUser.id,
        name,
        email,
      });
    } else if ((!profile.name && name) || (email && profile.email !== email)) {
      await supabase
        .from('profiles')
        .update({
          name: profile.name || name,
          email,
        })
        .eq('id', profile.id);
    }

    if (!roleRow) {
      await supabase.from('user_roles').insert({
        user_id: authUser.id,
        role,
      });
    }
  };

  const syncUserState = async (authUser: User) => {
    try {
      await ensureUserRecords(authUser);
      await fetchRole(authUser.id);
    } catch (error) {
      console.error('Error syncing user records:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => void syncUserState(session.user), 0);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void syncUserState(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: AppRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw error;

    if (data.session?.user) {
      await syncUserState(data.session.user);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
