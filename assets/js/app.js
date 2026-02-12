/**
 * Finance System - Main Application Module
 * Initializes app, handles routing, and global configurations
 */

const App = (function() {
    // Private state
    let currentPage = '';
    let user = null;
    let isLoading = false;
    
    // DOM Elements
    const elements = {
        sidebar: null,
        navbar: null,
        mainContent: null,
        menuToggle: null,
        notificationsBtn: null,
        notificationsPanel: null,
        notificationsList: null,
        userMenuBtn: null,
        userDropdown: null,
        toastContainer: null
    };
    
    /**
     * Initialize the application
     */
    async function init() {
        console.log('Initializing Finance System...');
        
        // Cache DOM elements
        cacheElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize Supabase
        window.supabaseConfig.initSupabase();
        
        // Check authentication
        await checkAuth();
        
        // Setup global event listeners
        setupGlobalListeners();
        
        console.log('Finance System initialized');
    }
    
    /**
     * Cache DOM elements for performance
     */
    function cacheElements() {
        elements.sidebar = document.getElementById('sidebar');
        elements.navbar = document.getElementById('navbar');
        elements.mainContent = document.getElementById('main-content');
        elements.menuToggle = document.getElementById('menu-toggle');
        elements.notificationsBtn = document.getElementById('notifications-btn');
        elements.notificationsPanel = document.getElementById('notifications-panel');
        elements.notificationsList = document.getElementById('notifications-list');
        elements.userMenuBtn = document.getElementById('user-menu-btn');
        elements.userDropdown = document.getElementById('user-dropdown');
        elements.toastContainer = document.getElementById('toast-container');
    }
    
    /**
     * Setup event listeners for UI interactions
     */
    function setupEventListeners() {
        // Mobile menu toggle
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', toggleSidebar);
        }
        
        // Notifications toggle
        if (elements.notificationsBtn) {
            elements.notificationsBtn.addEventListener('click', toggleNotificationsPanel);
        }
        
        // User menu toggle
        if (elements.userMenuBtn) {
            elements.userMenuBtn.addEventListener('click', toggleUserDropdown);
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (elements.notificationsPanel && !elements.notificationsPanel.contains(e.target) && 
                elements.notificationsBtn && !elements.notificationsBtn.contains(e.target)) {
                elements.notificationsPanel.classList.remove('show');
            }
            
            if (elements.userDropdown && !elements.userDropdown.contains(e.target) && 
                elements.userMenuBtn && !elements.userMenuBtn.contains(e.target)) {
                elements.userDropdown.classList.remove('show');
            }
        });
        
        // Sidebar collapse
        const collapseBtn = document.getElementById('sidebar-collapse');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-collapsed');
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
    
    /**
     * Setup global event listeners
     */
    function setupGlobalListeners() {
        // Handle auth state changes
        window.supabaseConfig.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                redirectTo('login.html');
            }
        });
        
        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    }
    
    /**
     * Check authentication status
     */
    async function checkAuth() {
        try {
            const { data: { session } } = await window.supabaseConfig.auth.getSession();
            
            if (session) {
                user = session.user;
                updateUserUI();
                loadPage();
            } else {
                // Check if we're on login page
                if (!window.location.pathname.includes('login.html')) {
                    redirectTo('login.html');
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
            showToast('error', 'Authentication Error', error.message);
        }
    }
    
    /**
     * Update user interface with user info
     */
    function updateUserUI() {
        if (!user) return;
        
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userNameEl && user.email) {
            userNameEl.textContent = user.email.split('@')[0];
        }
        
        if (userAvatarEl && user.email) {
            userAvatarEl.textContent = user.email.charAt(0).toUpperCase();
        }
    }
    
    /**
     * Load current page based on URL
     */
    function loadPage() {
        const path = window.location.pathname;
        
        if (path.includes('login.html')) {
            currentPage = 'login';
            return;
        }
        
        // Determine current page
        if (path.includes('dashboard.html')) {
            currentPage = 'dashboard';
            if (typeof Dashboard !== 'undefined') {
                Dashboard.init();
            }
        } else if (path.includes('invoice.html')) {
            currentPage = 'invoice';
            if (typeof Invoice !== 'undefined') {
                Invoice.init();
            }
        } else if (path.includes('finance.html')) {
            currentPage = 'finance';
            if (typeof Finance !== 'undefined') {
                Finance.init();
            }
        } else if (path.includes('recon.html')) {
            currentPage = 'recon';
            if (typeof Recon !== 'undefined') {
                Recon.init();
            }
        } else if (path.includes('reports.html')) {
            currentPage = 'reports';
            if (typeof Reports !== 'undefined') {
                Reports.init();
            }
        } else {
            // Default to dashboard
            currentPage = 'dashboard';
            if (typeof Dashboard !== 'undefined') {
                Dashboard.init();
            }
        }
        
        // Update active nav item
        updateActiveNav();
        
        // Setup realtime subscriptions
        setupRealtimeSubscriptions();
    }
    
    /**
     * Update active navigation item
     */
    function updateActiveNav() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            if (href && href.includes(currentPage + '.html')) {
                item.classList.add('active');
            }
        });
    }
    
    /**
     * Setup realtime subscriptions for notifications
     */
    function setupRealtimeSubscriptions() {
        if (!user) return;
        
        const supabase = window.supabaseConfig.getSupabase();
        
        // Subscribe to notifications
        supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    handleNewNotification(payload.new);
                }
            )
            .subscribe();
        
        // Subscribe to reconciliation changes (for mismatch detection)
        supabase
            .channel('reconciliations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reconciliations',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new && payload.new.difference !== 0 && payload.new.difference !== payload.old?.difference) {
                        handleReconMismatch(payload.new);
                    }
                }
            )
            .subscribe();
        
        // Subscribe to invoice changes
        supabase
            .channel('invoices')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'invoices',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
                        showToast('success', 'Invoice Paid', `Invoice ${payload.new.invoice_number} has been marked as paid`);
                    }
                }
            )
            .subscribe();
    }
    
    /**
     * Handle new notification
     */
    function handleNewNotification(notification) {
        addNotificationToUI(notification);
        
        // Show toast
        showToast('info', notification.title, notification.message);
        
        // Update notification badge
        updateNotificationBadge();
    }
    
    /**
     * Handle reconciliation mismatch
     */
    function handleReconMismatch(recon) {
        const notification = {
            type: 'recon_mismatch',
            title: '⚠ Rekonsiliasi tidak cocok',
            message: `PDAM: ${recon.pdam_code}\nPelanggan: ${recon.customer_name}\nSelisih: ${formatCurrency(recon.difference)}`,
            created_at: new Date().toISOString(),
            is_read: false
        };
        
        addNotificationToUI(notification);
        showToast('warning', 'Rekonsiliasi Mismatch', `Selisih: ${formatCurrency(recon.difference)}`);
        
        // Save notification to database
        window.supabaseConfig.notifications.create({
            user_id: user.id,
            type: 'recon_mismatch',
            title: notification.title,
            message: notification.message,
            data: JSON.stringify(recon)
        });
    }
    
    /**
     * Add notification to UI
     */
    function addNotificationToUI(notification) {
        if (!elements.notificationsList) return;
        
        const item = document.createElement('div');
        item.className = `notification-item ${notification.is_read ? '' : 'unread'}`;
        item.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message.replace(/\n/g, '<br>')}</div>
                <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
            </div>
        `;
        
        elements.notificationsList.insertBefore(item, elements.notificationsList.firstChild);
        
        // Update badge count
        updateNotificationBadge();
    }
    
    /**
     * Update notification badge count
     */
    async function updateNotificationBadge() {
        if (!user) return;
        
        try {
            const { data } = await window.supabaseConfig.notifications.getUnread(user.id);
            const badge = document.getElementById('notification-count');
            if (badge) {
                badge.textContent = data?.length || 0;
                badge.style.display = data?.length ? 'block' : 'none';
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }
    
    /**
     * Toggle sidebar on mobile
     */
    function toggleSidebar() {
        if (elements.sidebar) {
            elements.sidebar.classList.toggle('open');
        }
    }
    
    /**
     * Toggle notifications panel
     */
    function toggleNotificationsPanel() {
        if (elements.notificationsPanel) {
            elements.notificationsPanel.classList.toggle('show');
            if (elements.notificationsPanel.classList.contains('show')) {
                loadNotifications();
            }
        }
    }
    
    /**
     * Toggle user dropdown
     */
    function toggleUserDropdown() {
        if (elements.userDropdown) {
            elements.userDropdown.classList.toggle('show');
        }
    }
    
    /**
     * Load notifications
     */
    async function loadNotifications() {
        if (!user || !elements.notificationsList) return;
        
        try {
            const { data } = await window.supabaseConfig.db
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            
            elements.notificationsList.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(notification => {
                    addNotificationToUI(notification);
                });
            } else {
                elements.notificationsList.innerHTML = `
                    <div class="empty-state" style="padding: 40px 20px;">
                        <p class="text-muted">Tidak ada notifikasi</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    /**
     * Handle logout
     */
    async function handleLogout() {
        try {
            await window.supabaseConfig.auth.signOut();
            showToast('success', 'Logged Out', 'You have been successfully logged out');
            setTimeout(() => {
                redirectTo('login.html');
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            showToast('error', 'Logout Failed', error.message);
        }
    }
    
    /**
     * Redirect to page
     */
    function redirectTo(page) {
        window.location.href = page;
    }
    
    /**
     * Close all modals
     */
    function closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    /**
     * Show toast notification
     */
    function showToast(type, title, message) {
        if (!elements.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    /**
     * Show loading overlay
     */
    function showLoading(message = 'Loading...') {
        let overlay = document.getElementById('loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <p style="margin-top: 16px; color: #6B7280;">${message}</p>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
        return overlay;
    }
    
    /**
     * Hide loading overlay
     */
    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * Format currency
     */
    function formatCurrency(amount, currency = 'IDR') {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }
    
    /**
     * Format date
     */
    function formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = format === 'short' 
            ? { day: 'numeric', month: 'short', year: 'numeric' }
            : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        return d.toLocaleDateString('id-ID', options);
    }
    
    /**
     * Format time ago
     */
    function formatTimeAgo(date) {
        const now = new Date();
        const d = new Date(date);
        const diff = now - d;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} hari lalu`;
        if (hours > 0) return `${hours} jam lalu`;
        if (minutes > 0) return `${minutes} menit lalu`;
        return 'Baru saja';
    }
    
    /**
     * Get current user
     */
    function getUser() {
        return user;
    }
    
    /**
     * Set loading state
     */
    function setLoading(state) {
        isLoading = state;
    }
    
    /**
     * Get loading state
     */
    function getLoading() {
        return isLoading;
    }
    
    // Public API
    return {
        init,
        showToast,
        showLoading,
        hideLoading,
        formatCurrency,
        formatDate,
        formatTimeAgo,
        getUser,
        setLoading,
        getLoading,
        redirectTo,
        closeAllModals
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
