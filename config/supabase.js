/**
 * Supabase Configuration
 * 
 * IMPORTANT: Replace these values with your actual Supabase credentials
 * Get these from your Supabase Dashboard: Settings > API
 */

const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

/**
 * Initialize Supabase Client
 * Using the Supabase JavaScript library
 */
const { createClient } = window.supabase;

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_ANON_KEY;

let supabase = null;

function initSupabase() {
    if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
    return supabase;
}

/**
 * Get Supabase instance
 * Call this after initSupabase()
 */
function getSupabase() {
    if (!supabase) {
        return initSupabase();
    }
    return supabase;
}

/**
 * Auth helper functions
 */
const auth = {
    signUp: (email, password) => {
        return getSupabase().auth.signUp({
            email,
            password
        });
    },
    
    signIn: (email, password) => {
        return getSupabase().auth.signInWithPassword({
            email,
            password
        });
    },
    
    signOut: () => {
        return getSupabase().auth.signOut();
    },
    
    getSession: () => {
        return getSupabase().auth.getSession();
    },
    
    getUser: () => {
        return getSupabase().auth.getUser();
    },
    
    onAuthStateChange: (callback) => {
        return getSupabase().auth.onAuthStateChange(callback);
    }
};

/**
 * Database helper functions
 */
const db = {
    // Generic query builder
    from: (table) => {
        return getSupabase().from(table);
    },
    
    // Select with filters
    select: (table, columns = '*', filters = {}) => {
        let query = getSupabase().from(table).select(columns);
        
        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });
        
        return query;
    },
    
    // Insert
    insert: (table, data) => {
        return getSupabase().from(table).insert(data);
    },
    
    // Update
    update: (table, data, filters = {}) => {
        let query = getSupabase().from(table).update(data);
        
        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });
        
        return query;
    },
    
    // Delete
    delete: (table, filters = {}) => {
        let query = getSupabase().from(table).delete();
        
        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });
        
        return query;
    }
};

/**
 * Realtime subscription helpers
 */
const realtime = {
    subscribe: (table, callback, filters = {}) => {
        let channel = getSupabase()
            .channel(`${table}_changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                    filter: Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',')
                },
                callback
            )
            .subscribe();
        
        return channel;
    },
    
    unsubscribe: (channel) => {
        return getSupabase().removeChannel(channel);
    }
};

/**
 * Notification helpers
 */
const notifications = {
    create: (data) => {
        return db.insert('notifications', data);
    },
    
    getUnread: (userId) => {
        return db.select('notifications', '*', { user_id: userId, is_read: false })
            .order('created_at', { ascending: false });
    },
    
    markAsRead: (notificationId) => {
        return db.update('notifications', { is_read: true }, { id: notificationId });
    },
    
    markAllAsRead: (userId) => {
        return db.update('notifications', { is_read: true }, { user_id: userId });
    }
};

// Export for use in other modules
window.supabaseConfig = {
    initSupabase,
    getSupabase,
    auth,
    db,
    realtime,
    notifications,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
};
