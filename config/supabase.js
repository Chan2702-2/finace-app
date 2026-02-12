/**
 * Supabase Configuration
 * 
 * IMPORTANT: For Vercel deployment, set these as Environment Variables:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * 
 * Get these from your Supabase Dashboard: Settings > API
 */

// Get from environment variables or use fallback for local development
const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://nrhzjfdybfleetakqbsy.supabase.co';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaHpqZmR5YmZsZWV0YWtxYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODUwMTcsImV4cCI6MjA4NjQ2MTAxN30.SvVNbaA6r3h3t2b63Tx0iwEMmffbuxdXUhhgbBb-HgA';

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
    signUp: (email, password, options = {}) => {
        return getSupabase().auth.signUp({
            email,
            password,
            options
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

/**
 * User helpers - Ensure user record exists
 */
const userHelpers = {
    /**
     * Ensure user record exists in users table
     * Call this before inserting data to any table with user_id FK
     */
    ensureUserExists: async () => {
        try {
            const { data: { session } } = await getSupabase().auth.getSession();
            if (!session || !session.user) {
                console.error('No session found');
                return { error: 'No session found' };
            }
            
            const userId = session.user.id;
            const userEmail = session.user.email;
            const userName = session.user.user_metadata?.full_name || userEmail;
            
            // Check if user exists in users table
            const { data: existingUser, error: checkError } = await getSupabase()
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking user:', checkError);
                return { error: checkError };
            }
            
            // If user doesn't exist, create it
            if (!existingUser) {
                console.log('Creating user record in users table...');
                const { data: newUser, error: insertError } = await getSupabase()
                    .from('users')
                    .insert({
                        id: userId,
                        email: userEmail,
                        full_name: userName,
                        role: 'user'
                    })
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('Error creating user:', insertError);
                    return { error: insertError };
                }
                
                console.log('User record created:', newUser);
                return { success: true, user: newUser };
            }
            
            console.log('User already exists:', existingUser);
            return { success: true, user: existingUser };
        } catch (error) {
            console.error('Error in ensureUserExists:', error);
            return { error };
        }
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
    userHelpers,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
};
