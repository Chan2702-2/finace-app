/**
 * Authentication Module
 * Handles login, signup, and session management
 */

const Auth = (function() {
    // DOM Elements
    let elements = {};
    
    /**
     * Initialize auth module
     */
    function init() {
        cacheElements();
        setupEventListeners();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            loginForm: document.getElementById('login-form'),
            signupForm: document.getElementById('signup-form'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            confirmPasswordInput: document.getElementById('confirm-password'),
            fullNameInput: document.getElementById('full-name'),
            signupEmailInput: document.getElementById('signup-email'),
            signupPasswordInput: document.getElementById('signup-password'),
            loginBtn: document.getElementById('login-btn'),
            signupBtn: document.getElementById('signup-btn'),
            showPasswordBtn: document.getElementById('show-password-btn'),
            toggleAuthLink: document.getElementById('toggle-auth-link'),
            authTitle: document.getElementById('auth-title'),
            authSubtitle: document.getElementById('auth-subtitle'),
            toggleAuthText: document.getElementById('toggle-auth-text'),
            loginError: document.getElementById('login-error'),
            signupError: document.getElementById('signup-error')
        };
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Login form
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLogin);
        }
        
        // Signup form
        if (elements.signupForm) {
            elements.signupForm.addEventListener('submit', handleSignup);
        }
        
        // Toggle password visibility
        if (elements.showPasswordBtn) {
            elements.showPasswordBtn.addEventListener('click', () => {
                const passwordInput = elements.passwordInput || document.getElementById('password');
                const confirmPasswordInput = elements.confirmPasswordInput;
                
                const togglePassword = (input) => {
                    if (input.type === 'password') {
                        input.type = 'text';
                        elements.showPasswordBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                            </svg>
                        `;
                    } else {
                        input.type = 'password';
                        elements.showPasswordBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        `;
                    }
                };
                
                if (passwordInput) togglePassword(passwordInput);
                if (confirmPasswordInput) togglePassword(confirmPasswordInput);
            });
        }
        
        // Toggle between login and signup
        if (elements.toggleAuthLink) {
            elements.toggleAuthLink.addEventListener('click', (e) => {
                e.preventDefault();
                toggleAuthMode();
            });
        }
        
        // Check if already logged in
        checkSession();
    }
    
    /**
     * Handle login form submission
     */
    async function handleLogin(e) {
        e.preventDefault();
        
        const email = elements.emailInput.value.trim();
        const password = elements.passwordInput.value;
        
        // Clear previous errors
        if (elements.loginError) {
            elements.loginError.textContent = '';
            elements.loginError.style.display = 'none';
        }
        
        // Validate
        if (!email || !password) {
            showError('login-error', 'Email dan password wajib diisi');
            return;
        }
        
        // Show loading state
        const btn = elements.loginBtn;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"/>
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            Memproses...
        `;
        
        try {
            const { data, error } = await window.supabaseConfig.auth.signIn(email, password);
            
            if (error) {
                throw error;
            }
            
            // Success
            App.showToast('success', 'Login Berhasil', 'Selamat datang kembali!');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            showError('login-error', getErrorMessage(error.message));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
    
    /**
     * Handle signup form submission
     */
    async function handleSignup(e) {
        e.preventDefault();
        
        const fullName = elements.fullNameInput ? elements.fullNameInput.value.trim() : '';
        const email = elements.signupEmailInput ? elements.signupEmailInput.value.trim() : elements.emailInput.value.trim();
        const password = elements.signupPasswordInput ? elements.signupPasswordInput.value : elements.passwordInput.value;
        const confirmPassword = elements.confirmPasswordInput.value;
        
        // Clear previous errors
        if (elements.signupError) {
            elements.signupError.textContent = '';
            elements.signupError.style.display = 'none';
        }
        
        // Validate
        if (!email || !password || !confirmPassword) {
            showError('signup-error', 'Semua field wajib diisi');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('signup-error', 'Password tidak cocok');
            return;
        }
        
        if (password.length < 8) {
            showError('signup-error', 'Password minimal 8 karakter');
            return;
        }
        
        // Show loading state
        const btn = elements.signupBtn;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"/>
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            Memproses...
        `;
        
        try {
            const { data, error } = await window.supabaseConfig.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            
            if (error) {
                throw error;
            }
            
            // Success
            App.showToast('success', 'Pendaftaran Berhasil', 'Silakan cek email untuk verifikasi');
            
            // Show message about email verification
            if (elements.signupForm) {
                elements.signupForm.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="#10B981" style="margin-bottom: 20px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h3 style="color: #111827; margin-bottom: 12px;">Pendaftaran Berhasil!</h3>
                        <p style="color: #6B7280; margin-bottom: 20px;">Silakan cek email Anda untuk verifikasi akun.</p>
                        <a href="login.html" class="btn btn-primary">Kembali ke Login</a>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            showError('signup-error', getErrorMessage(error.message));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
    
    /**
     * Toggle between login and signup mode
     */
    function toggleAuthMode() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm && signupForm) {
            if (loginForm.style.display !== 'none') {
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
                if (elements.authTitle) elements.authTitle.textContent = 'Buat Akun';
                if (elements.authSubtitle) elements.authSubtitle.textContent = 'Daftar untuk mulai menggunakan sistem';
                if (elements.toggleAuthText) elements.toggleAuthText.textContent = 'Sudah punya akun?';
                if (elements.toggleAuthLink) {
                    elements.toggleAuthLink.textContent = 'Masuk';
                }
            } else {
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                if (elements.authTitle) elements.authTitle.textContent = 'Masuk';
                if (elements.authSubtitle) elements.authSubtitle.textContent = 'Masuk ke dashboard keuangan Anda';
                if (elements.toggleAuthText) elements.toggleAuthText.textContent = 'Belum punya akun?';
                if (elements.toggleAuthLink) {
                    elements.toggleAuthLink.textContent = 'Daftar';
                }
            }
        }
    }
    
    /**
     * Check existing session
     */
    async function checkSession() {
        try {
            const { data: { session } } = await window.supabaseConfig.auth.getSession();
            
            if (session) {
                // Already logged in, redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }
    
    /**
     * Show error message
     */
    function showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
    
    /**
     * Get user-friendly error message
     */
    function getErrorMessage(errorMsg) {
        const errorMessages = {
            'Invalid login credentials': 'Email atau password salah',
            'Email not confirmed': 'Email belum diverifikasi, silakan cek inbox Anda',
            'User already registered': 'Email sudah terdaftar',
            'Password should be at least 6 characters': 'Password minimal 6 karakter',
            'Invalid email': 'Format email tidak valid',
            'Too many requests': 'Terlalu banyak percobaan, coba lagi nanti',
            'network': 'Koneksi internet terputus, periksa jaringan Anda'
        };
        
        for (const [key, value] of Object.entries(errorMessages)) {
            if (errorMsg.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        
        return errorMsg || 'Terjadi kesalahan, coba lagi';
    }
    
    // Public API
    return {
        init
    };
})();
