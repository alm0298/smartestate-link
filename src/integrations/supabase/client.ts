// This file is auto-generated. Do not modify.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { debug, info, warn, error as loggerError } from '@/lib/logger';

// Check if we're using placeholder values (local dev)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lwsesoxppmoerwwvvdar.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3c2Vzb3hwcG1vZXJ3d3Z2ZGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODY2NzgsImV4cCI6MjA1NTM2MjY3OH0.fMnHpTaqGoLT6s6GZQc6LzePZ-NQk3i6jIzbEZGWKd8';

// Initialize the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// Test the connection
try {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      loggerError('Error getting session:', error);
    } else {
      debug('Session loaded successfully');
    }
  });
} catch (error) {
  loggerError('Error initializing Supabase client:', error);
}