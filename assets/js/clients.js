/**
 * Clients Module
 * Handles client management functionality
 */

const Clients = (function() {
    let clients = [];
    let editingClientId = null;
    let deletingClientId = null;
    
    // DOM Elements
    const elements = {};
    
    /**
     * Initialize clients module
     */
    async function init() {
        console.log('Initializing Clients...');
        cacheElements();
        setupEventListeners();
        
        // Ensure user record exists
        const userCheck = await window.supabaseConfig.userHelpers.ensureUserExists();
        if (userCheck && userCheck.error) {
            console.warn('User check warning:', userCheck.error);
        }
        
        await loadClients();
        setupAuthListener();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.clientsList = document.getElementById('clients-list');
        elements.searchInput = document.getElementById('search-client');
        elements.addClientBtn = document.getElementById('add-client-btn');
        elements.clientModal = document.getElementById('client-modal');
        elements.viewClientModal = document.getElementById('view-client-modal');
        elements.deleteModal = document.getElementById('delete-modal');
        elements.clientForm = document.getElementById('client-form');
        elements.notificationsPanel = document.getElementById('notifications-panel');
        elements.notificationsList = document.getElementById('notifications-list');
        elements.notificationCount = document.getElementById('notification-count');
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Add client button
        if (elements.addClientBtn) {
            elements.addClientBtn.addEventListener('click', () => openClientModal());
        }
        
        // Modal close buttons
        document.getElementById('modal-close')?.addEventListener('click', closeClientModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeClientModal);
        document.getElementById('view-modal-close')?.addEventListener('click', closeViewModal);
        document.getElementById('view-modal-cancel')?.addEventListener('click', closeViewModal);
        document.getElementById('delete-modal-close')?.addEventListener('click', closeDeleteModal);
        document.getElementById('delete-modal-cancel')?.addEventListener('click', closeDeleteModal);
        
        // Form submission
        if (elements.clientForm) {
            elements.clientForm.addEventListener('submit', handleSubmit);
        }
        
        // Delete confirmation
        document.getElementById('delete-confirm')?.addEventListener('click', confirmDelete);
        
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', handleSearch);
        }
        
        // Modal backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                closeClientModal();
                closeViewModal();
                closeDeleteModal();
            });
        });
    }
    
    /**
     * Setup auth state listener
     */
    function setupAuthListener() {
        window.supabaseConfig.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                window.location.href = 'login.html';
            }
        });
    }
    
    /**
     * Load clients from database
     */
    async function loadClients() {
        const user = App.getUser();
        if (!user) return;
        
        try {
            const { data, error } = await window.supabaseConfig.db
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true });
            
            if (error) throw error;
            
            clients = data || [];
            renderClients();
            
        } catch (error) {
            console.error('Error loading clients:', error);
            if (elements.clientsList) {
                elements.clientsList.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px 16px; color: #EF4444;">
                            Error memuat data: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    /**
     * Render clients table
     */
    function renderClients(filteredClients = null) {
        const clientList = filteredClients || clients;
        
        if (!elements.clientsList) return;
        
        if (clientList.length === 0) {
            elements.clientsList.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px 16px; color: #6B7280;">
                        ${filteredClients ? 'Tidak ada mitra yang cocok' : 'Belum ada mitra. Klik "Tambah Mitra" untuk menambahkan.'}
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.clientsList.innerHTML = clientList.map(client => `
            <tr style="border-bottom: 1px solid #F3F4F6; hover: bg-gray-50;">
                <td style="padding: 16px;">
                    <div style="font-weight: 500; color: #111827;">${escapeHtml(client.name)}</div>
                    <div style="font-size: 0.875rem; color: #6B7280;">${escapeHtml(client.email || '-')}</div>
                </td>
                <td style="padding: 16px;">
                    <div style="color: #374151;">${escapeHtml(client.phone || '-')}</div>
                </td>
                <td style="padding: 16px;">
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #374151;">
                        ${escapeHtml(client.address || '-')}
                    </div>
                </td>
                <td style="padding: 16px;">
                    <div style="color: #374151;">${escapeHtml(client.npwp || '-')}</div>
                </td>
                <td style="padding: 16px;">
                    <div style="color: #374151;">${escapeHtml(client.pks_number || '-')}</div>
                    <div style="font-size: 0.75rem; color: #6B7280;">${client.pks_duration ? client.pks_duration + ' bulan' : '-'}</div>
                </td>
                <td style="padding: 16px; text-align: right;">
                    <button class="btn btn-sm btn-outline" onclick="Clients.view('${client.id}')" style="margin-right: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="Clients.edit('${client.id}')" style="margin-right: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Clients.removeClient('${client.id}', '${escapeHtml(client.name)}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    /**
     * Handle search
     */
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderClients();
            return;
        }
        
        const filtered = clients.filter(client => 
            client.name?.toLowerCase().includes(searchTerm) ||
            client.email?.toLowerCase().includes(searchTerm) ||
            client.phone?.includes(searchTerm) ||
            client.npwp?.toLowerCase().includes(searchTerm) ||
            client.pks_number?.toLowerCase().includes(searchTerm)
        );
        
        renderClients(filtered);
    }
    
    /**
     * Open client modal
     */
    function openClientModal(client = null) {
        editingClientId = client?.id || null;
        
        document.getElementById('modal-title').textContent = client ? 'Edit Mitra' : 'Tambah Mitra';
        
        document.getElementById('client-id').value = client?.id || '';
        document.getElementById('client-name').value = client?.name || '';
        document.getElementById('client-email').value = client?.email || '';
        document.getElementById('client-phone').value = client?.phone || '';
        document.getElementById('client-address').value = client?.address || '';
        document.getElementById('client-npwp').value = client?.npwp || '';
        document.getElementById('client-pks-number').value = client?.pks_number || '';
        document.getElementById('client-pks-duration').value = client?.pks_duration || '';
        document.getElementById('client-notes').value = client?.notes || '';
        
        elements.clientModal.classList.add('active');
    }
    
    /**
     * Close client modal
     */
    function closeClientModal() {
        elements.clientModal.classList.remove('active');
        editingClientId = null;
        elements.clientForm.reset();
    }
    
    /**
     * View client details
     */
    async function view(clientId) {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;
        
        const detailsHtml = `
            <div style="display: grid; gap: 16px;">
                <div>
                    <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">Nama Mitra</label>
                    <div style="font-weight: 600; color: #111827; margin-top: 4px;">${escapeHtml(client.name)}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">Email</label>
                        <div style="color: #374151; margin-top: 4px;">${escapeHtml(client.email || '-')}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">No. HP</label>
                        <div style="color: #374151; margin-top: 4px;">${escapeHtml(client.phone || '-')}</div>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">Alamat</label>
                    <div style="color: #374151; margin-top: 4px;">${escapeHtml(client.address || '-')}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">NPWP</label>
                        <div style="color: #374151; margin-top: 4px;">${escapeHtml(client.npwp || '-')}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">No. PKS</label>
                        <div style="color: #374151; margin-top: 4px;">${escapeHtml(client.pks_number || '-')}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">Lama PKS</label>
                        <div style="color: #374151; margin-top: 4px;">${client.pks_duration ? client.pks_duration + ' bulan' : '-'}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">Tanggal Dibuat</label>
                        <div style="color: #374151; margin-top: 4px;">${App.formatDate(client.created_at)}</div>
                    </div>
                </div>
                
                ${client.notes ? `
                <div>
                    <label style="font-size: 0.75rem; color: #6B7280; text-transform: uppercase;">Catatan</label>
                    <div style="color: #374151; margin-top: 4px;">${escapeHtml(client.notes)}</div>
                </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('client-details').innerHTML = detailsHtml;
        elements.viewClientModal.classList.add('active');
    }
    
    /**
     * Close view modal
     */
    function closeViewModal() {
        elements.viewClientModal.classList.remove('active');
    }
    
    /**
     * Edit client
     */
    function edit(clientId) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            openClientModal(client);
        }
    }
    
    /**
     * Open delete confirmation
     */
    function removeClient(clientId, clientName) {
        deletingClientId = clientId;
        document.getElementById('delete-client-name').textContent = clientName;
        elements.deleteModal.classList.add('active');
    }
    
    /**
     * Close delete modal
     */
    function closeDeleteModal() {
        elements.deleteModal.classList.remove('active');
        deletingClientId = null;
    }
    
    /**
     * Confirm delete
     */
    async function confirmDelete() {
        if (!deletingClientId) return;
        
        try {
            const { error } = await window.supabaseConfig.db
                .from('clients')
                .delete()
                .eq('id', deletingClientId);
            
            if (error) throw error;
            
            App.showToast('success', 'Berhasil', 'Mitra berhasil dihapus');
            closeDeleteModal();
            await loadClients();
            
        } catch (error) {
            console.error('Error deleting client:', error);
            App.showToast('error', 'Error', 'Gagal menghapus mitra: ' + error.message);
        }
    }
    
    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        
        const user = App.getUser();
        if (!user) return;
        
        const clientData = {
            user_id: user.id,
            name: document.getElementById('client-name').value.trim(),
            email: document.getElementById('client-email').value.trim() || null,
            phone: document.getElementById('client-phone').value.trim() || null,
            address: document.getElementById('client-address').value.trim() || null,
            npwp: document.getElementById('client-npwp').value.trim() || null,
            pks_number: document.getElementById('client-pks-number').value.trim() || null,
            pks_duration: parseInt(document.getElementById('client-pks-duration').value) || null,
            notes: document.getElementById('client-notes').value.trim() || null
        };
        
        App.showLoading('Menyimpan mitra...');
        
        try {
            let result;
            
            if (editingClientId) {
                // Update existing client
                result = await window.supabaseConfig.db
                    .from('clients')
                    .update(clientData)
                    .eq('id', editingClientId);
                
                App.showToast('success', 'Berhasil', 'Mitra berhasil diperbarui');
            } else {
                // Create new client
                result = await window.supabaseConfig.db
                    .from('clients')
                    .insert(clientData);
                
                App.showToast('success', 'Berhasil', 'Mitra berhasil dibuat');
            }
            
            if (result.error) throw result.error;
            
            App.hideLoading();
            App.showToast('success', 'Berhasil', editingClientId ? 'Mitra berhasil diperbarui' : 'Mitra berhasil dibuat');
            closeClientModal();
            await loadClients();
            
        } catch (error) {
            App.hideLoading();
            console.error('Error saving client:', error);
            App.showToast('error', 'Error', 'Gagal menyimpan mitra: ' + error.message);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API
    return {
        init,
        view,
        edit,
        removeClient
    };
})();
