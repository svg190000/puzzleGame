import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase, isSupabaseConfigured, SUPABASE_URL } from '../config/supabase';

// Required for expo-auth-session
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your credentials.');
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your credentials.');
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your credentials.');
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Create redirect URL for the app
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'puzzle',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      
      if (error) throw error;
      
      // Open the OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );
      
      if (result.type === 'success') {
        const url = result.url;
        const hash = url.split('#')[1];
        if (!hash) throw new Error('Failed to get authentication tokens');

        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          return { data: sessionData, error: null };
        }
        throw new Error('Failed to get authentication tokens');
      } else if (result.type === 'cancel') {
        // User cancelled
        return { data: null, error: null };
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return { error: null };
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please add your credentials.');
    }
    
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      isAuthenticated: !!user,
      isConfigured: isSupabaseConfigured(),
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      clearError,
    }),
    [user, session, loading, error, signUp, signIn, signInWithGoogle, signOut, resetPassword, clearError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
