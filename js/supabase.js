const SUPABASE_URL = "https://zvtammcfyqcrjgoovvyt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iXbUaclnDaI6d0mRQKbe5Q_LwDkid9Z";

const fallbackSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async () => ({ data: { user: null }, error: null }),
    signUp: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null })
  },
  channel: () => ({
    on: () => ({
      on: () => ({
        subscribe: () => true
      })
    }),
    subscribe: () => true
  }),
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null })
        }),
        single: async () => ({ data: null, error: null })
      }),
      single: async () => ({ data: null, error: null })
    }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null })
  })
};

window.supabase = window.supabase || fallbackSupabase;

if (window.supabase && typeof window.supabase.createClient === 'function' && !SUPABASE_URL.includes('SUA_') && !SUPABASE_ANON_KEY.includes('SUA_')) {
  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const db = window.supabase;
window.db = db;
window.supabaseClient = db;
