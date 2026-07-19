// ApplyJob — Supabase Client + Auth + Usage Tracking + Dodo Payments
// Uses Supabase JS loaded via CDN in sidepanel.html

(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION — Replace these with your actual values
  // ============================================================

  // SUPABASE — Get from: https://supabase.com → Your Project → Settings → API
  const SUPABASE_URL = 'https://jcemvvitzvveqbtvzttl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_laa5HY5U_kQWXDQvunnDVA_xgizlkbV';   // Update this with your actual Anon Key


  // ============================================================
  // LOCAL STORAGE ADAPTER (for Supabase session persistence)
  // ============================================================
  const localStorageAdapter = {
    getItem(key) {
      return localStorage.getItem(key);
    },
    setItem(key, value) {
      localStorage.setItem(key, value);
    },
    removeItem(key) {
      localStorage.removeItem(key);
    }
  };

  // ============================================================
  // SUPABASE CLIENT INIT
  // ============================================================
  let _supabase = null;

  function getClient() {
    if (_supabase) return _supabase;

    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.error('[ApplyJob] Supabase JS not loaded. Check CDN script tag.');
      return null;
    }

    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: localStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });

    return _supabase;
  }

  // ============================================================
  // AUTH FUNCTIONS
  // ============================================================
  async function signUp(email, password, fullName) {
    const client = getClient();
    if (!client) return { error: { message: 'Supabase not configured' } };

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (!error && data.user) {
      // Create user_profiles row
      await client.from('user_profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        plan: 'free',
        resume_count: 0,
        cover_letter_count: 0
      });
    }

    return { data, error };
  }

  async function signIn(email, password) {
    const client = getClient();
    if (!client) return { error: { message: 'Supabase not configured' } };

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  }

  async function signOut() {
    const client = getClient();
    if (!client) return;

    await client.auth.signOut();
  }

  async function getUser() {
    const client = getClient();
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    return user;
  }

  async function getSession() {
    const client = getClient();
    if (!client) return null;

    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  function onAuthStateChange(callback) {
    const client = getClient();
    if (!client) return { data: { subscription: { unsubscribe() { } } } };

    return client.auth.onAuthStateChange(callback);
  }

  // ============================================================
  // USAGE / QUOTA TRACKING
  // ============================================================
  async function getUserProfile() {
    const client = getClient();
    if (!client) return null;

    const user = await getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[ApplyJob] Get profile error:', error);
      return null;
    }

    return data;
  }

  async function checkQuota(type) {
    // Everything is free in BYOK mode as long as they have a key
    return {
      allowed: true,
      remaining: Infinity,
      used: 0,
      limit: Infinity,
      plan: 'free'
    };
  }

  async function incrementUsage(type) {
    // type = 'resume' or 'cover_letter'
    const client = getClient();
    if (!client) return;

    const user = await getUser();
    if (!user) return;

    const column = type === 'resume' ? 'resume_count' : 'cover_letter_count';

    // Fetch current count then increment
    const { data: profile } = await client
      .from('user_profiles')
      .select(column)
      .eq('id', user.id)
      .single();

    if (profile) {
      await client
        .from('user_profiles')
        .update({ [column]: (profile[column] || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }

  async function isPro() {
    return true; // Everyone is treated as Pro (unlimited)
  }

  async function createCheckoutSession() {
    return { error: 'Payments are disabled. This version is 100% free with BYOK.' };
  }

  async function refreshPlanStatus() {
    return 'free';
  }

  function isDodoConfigured() {
    return false;
  }

  function isConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
  }

  // ============================================================
  // EXPOSE GLOBALLY
  // ============================================================
  window.ApplyJobAuth = {
    getClient,
    signUp,
    signIn,
    signOut,
    getUser,
    getSession,
    onAuthStateChange,
    getUserProfile,
    checkQuota,
    incrementUsage,
    isPro,
    createCheckoutSession,
    refreshPlanStatus,
    isDodoConfigured,
    isConfigured,
    DODO_MODE: 'none'
  };
})();
