/**
 * Reconciliation Module
 * Handles payment reconciliation operations
 */

const Recon = (function() {
    // State
    let reconciliations = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    
    /**
     * Initialize recon module
     */
    function init() {
        console.log('Initializing Reconciliation module...');
        cacheElements();
        setupEventListeners();
        loadReconciliations();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            reconTableBody: document.getElementById('recon-table-body'),
            reconModal: document.getElementById('recon-modal'),
            reconForm: document.getElementById('recon-form'),
            addReconBtn: document.getElementById('add-recon-btn'),
            searchInput: document.getElementById('search-recon'),
            statusFilter: document.getElementById('status-filter'),
            pagination: document.getElementById('recon-pagination'),
            viewReconModal: document.getElementById('view-recon-modal'),
            viewReconContent: document.getElementById('view-recon-content')
        };
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Add recon button
        if (elements.addReconBtn) {
            elements.addReconBtn.addEventListener('click', () => openReconModal());
        }
        
        // Close modal
        const closeModalBtn = document.getElementById('close-recon-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeReconModal);
        }
        
        // Close view modal
        const closeViewModalBtn = document.getElementById('close-view-recon-modal');
        if (closeViewModalBtn) {
            closeViewModalBtn.addEventListener('click', closeViewReconModal);
        }
        
        const closeViewReconBtn = document.getElementById('close-view-recon-btn');
        if (closeViewReconBtn) {
            closeViewReconBtn.addEventListener('click', closeViewReconModal);
        }
        
        // Form submission
        if (elements.reconForm) {
            elements.reconForm.addEventListener('submit', handleSubmit);
        }
        
        // Auto-calculate difference
        document.addEventListener('input', (e) => {
            if (e.target.id === 'total-bill' || e.target.id === 'payment-amount') {
                calculateDifference();
            }
        });
        
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        // Status filter
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', handleFilterChange);
        }
    }
    
    /**
     * Load reconciliations from database
     */
    async function loadReconciliations() {
        const user = App.getUser();
        if (!user) return;
        
        App.showLoading('Memuat rekonsiliasi...');
        
        try {
            const { data, error } = await window.supabaseConfig.db
                .from('reconciliations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            reconciliations = data || [];
            renderReconciliations();
            
        } catch (error) {
            console.error('Error loading reconciliations:', error);
            App.showToast('error', 'Error', 'Gagal memuat data rekonsiliasi');
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * Render reconciliations table
     */
    function renderReconciliations() {
        if (!elements.reconTableBody) return;
        
        const filteredData = filterData();
        const paginatedData = paginate(filteredData);
        
        if (paginatedData.length === 0) {
            elements.reconTableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px;">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" style="margin-bottom: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <p class="text-muted">Belum ada data rekonsiliasi</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.reconTableBody.innerHTML = paginatedData.map(recon => `
            <tr>
                <td>${recon.partner_code || '-'}</td>
                <td>${App.formatDate(recon.recon_date)}</td>
                <td>${recon.pdam_code || '-'}</td>
                <td>${recon.connection_number || '-'}</td>
                <td>${recon.customer_name}</td>
                <td>${App.formatCurrency(recon.total_bill)}</td>
                <td>${recon.account_number || '-'}</td>
                <td>${recon.payment_date ? App.formatDate(recon.payment_date) : '-'}</td>
                <td>${recon.payment_location || '-'}</td>
                <td>
                    <span class="badge badge-${getStatusColor(recon.status)}">${getStatusText(recon.status)}</span>
                </td>
                <td style="font-weight: 600; color: ${recon.difference !== 0 ? '#EF4444' : '#10B981'};">
                    ${recon.difference !== 0 ? App.formatCurrency(recon.difference) : 'Cocok'}
                </td>
                <td>
                    <div class="table-actions">
                        ${recon.status !== 'matched' ? `
                            <button class="btn btn-sm btn-outline" onclick="Recon.editRecon('${recon.id}')" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="Recon.markAsMatched('${recon.id}')" title="Centang (Tandai Cocok)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline" onclick="Recon.viewRecon('${recon.id}')" title="Lihat Detail">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        renderPagination(filteredData.length);
    }
    
    /**
     * Filter data
     */
    function filterData() {
        const searchTerm = elements.searchInput?.value?.toLowerCase() || '';
        const statusFilter = elements.statusFilter?.value || 'all';
        
        return reconciliations.filter(recon => {
            const matchesSearch = recon.customer_name?.toLowerCase().includes(searchTerm) ||
                recon.partner_code?.toLowerCase().includes(searchTerm) ||
                recon.pdam_code?.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || recon.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }
    
    /**
     * Paginate data
     */
    function paginate(data) {
        const start = (currentPage - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
    }
    
    /**
     * Render pagination
     */
    function renderPagination(totalItems) {
        if (!elements.pagination) return;
        
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (totalPages <= 1) {
            elements.pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="Recon.goToPage(${currentPage - 1})">Prev</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="Recon.goToPage(${i})">${i}</button>`;
        }
        
        html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="Recon.goToPage(${currentPage + 1})">Next</button>`;
        
        elements.pagination.innerHTML = html;
    }
    
    /**
     * Open recon modal
     */
    function openReconModal(recon = null) {
        document.getElementById('recon-modal-title').textContent = recon ? 'Edit Rekonsiliasi' : 'Tambah Rekonsiliasi';
        elements.reconForm.reset();
        
        document.getElementById('recon-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('difference').value = '0';
        document.getElementById('difference').style.color = '#10B981';
        
        if (recon) {
            document.getElementById('recon-id').value = recon.id;
            document.getElementById('partner-code').value = recon.partner_code || '';
            document.getElementById('recon-date').value = recon.recon_date || '';
            document.getElementById('pdam-code').value = recon.pdam_code || '';
            document.getElementById('connection-number').value = recon.connection_number || '';
            document.getElementById('customer-name').value = recon.customer_name || '';
            document.getElementById('total-bill').value = recon.total_bill || 0;
            document.getElementById('account-number').value = recon.account_number || '';
            document.getElementById('payment-date').value = recon.payment_date || '';
            document.getElementById('payment-location').value = recon.payment_location || '';
            document.getElementById('recon-notes').value = recon.notes || '';
            document.getElementById('recon-status').value = recon.status || 'unmatched';
        } else {
            document.getElementById('recon-id').value = '';
        }
        
        elements.reconModal.classList.add('active');
    }
    
    /**
     * Close recon modal
     */
    function closeReconModal() {
        elements.reconModal.classList.remove('active');
    }
    
    /**
     * Open view recon modal
     */
    function viewRecon(id) {
        const recon = reconciliations.find(r => r.id === id);
        if (!recon) return;
        
        const totalBill = recon.total_bill || 0;
        const difference = recon.difference || 0;
        
        elements.viewReconContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="detail-item">
                    <label>No Mitra Switching</label>
                    <span>${recon.partner_code || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Tanggal Recon</label>
                    <span>${App.formatDate(recon.recon_date)}</span>
                </div>
                <div class="detail-item">
                    <label>PDAM</label>
                    <span>${recon.pdam_code || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>No Sambungan</label>
                    <span>${recon.connection_number || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Nama Pelanggan</label>
                    <span>${recon.customer_name}</span>
                </div>
                <div class="detail-item">
                    <label>Rekening</label>
                    <span>${recon.account_number || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Total Tagihan (Rp)</label>
                    <span>${App.formatCurrency(totalBill)}</span>
                </div>
                <div class="detail-item">
                    <label>Tanggal Bayar</label>
                    <span>${recon.payment_date ? App.formatDate(recon.payment_date) : '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Lokasi Bayar</label>
                    <span>${recon.payment_location || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Selisih</label>
                    <span style="color: ${difference !== 0 ? '#EF4444' : '#10B981'}; font-weight: 600;">
                        ${App.formatCurrency(difference)}
                    </span>
                </div>
                <div class="detail-item">
                    <label>Status</label>
                    <span class="badge badge-${getStatusColor(recon.status)}">${getStatusText(recon.status)}</span>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <label>Keterangan</label>
                    <span>${recon.notes || '-'}</span>
                </div>
            </div>
        `;
        
        elements.viewReconModal.classList.add('active');
    }
    
    /**
     * Close view recon modal
     */
    function closeViewReconModal() {
        elements.viewReconModal.classList.remove('active');
    }
    
    /**
     * Calculate difference
     */
    function calculateDifference() {
        // Difference is now manually entered, no auto-calculation needed
    }
    
    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        
        const user = App.getUser();
        if (!user) return;
        
        const id = document.getElementById('recon-id').value;
        
        const reconData = {
            user_id: user.id,
            partner_code: document.getElementById('partner-code').value,
            recon_date: document.getElementById('recon-date').value,
            pdam_code: document.getElementById('pdam-code').value,
            connection_number: document.getElementById('connection-number').value,
            customer_name: document.getElementById('customer-name').value,
            total_bill: parseFloat(document.getElementById('total-bill').value) || 0,
            account_number: document.getElementById('account-number').value,
            payment_date: document.getElementById('payment-date').value || null,
            payment_location: document.getElementById('payment-location').value,
            notes: document.getElementById('recon-notes').value,
            status: document.getElementById('recon-status').value,
            difference: parseFloat(document.getElementById('difference').value) || 0
        };
        
        App.showLoading('Menyimpan data...');
        
        try {
            // Ensure user record exists in users table
            const userCheck = await window.supabaseConfig.userHelpers.ensureUserExists();
            if (userCheck && userCheck.error) {
                console.warn('User check warning:', userCheck.error);
            }
            
            let result;
            
            if (id) {
                result = await window.supabaseConfig.db
                    .from('reconciliations')
                    .update(reconData)
                    .eq('id', id);
            } else {
                result = await window.supabaseConfig.db
                    .from('reconciliations')
                    .insert(reconData);
            }
            
            if (result.error) throw result.error;
            
            App.showToast('success', 'Berhasil', 'Data rekonsiliasi berhasil disimpan');
            closeReconModal();
            loadReconciliations();
            
        } catch (error) {
            console.error('Error saving reconciliation:', error);
            App.showToast('error', 'Error', 'Gagal menyimpan data: ' + error.message);
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * Edit reconciliation
     */
    function editRecon(id) {
        const recon = reconciliations.find(r => r.id === id);
        if (!recon) return;
        openReconModal(recon);
    }
    
    /**
     * Mark reconciliation as matched (centang)
     */
    async function markAsMatched(id) {
        const recon = reconciliations.find(r => r.id === id);
        if (!recon) return;
        
        const user = App.getUser();
        if (!user) return;
        
        try {
            const { error } = await window.supabaseConfig.db
                .from('reconciliations')
                .update({ status: 'matched' })
                .eq('id', id);
            
            if (error) throw error;
            
            App.showToast('success', 'Berhasil', 'Rekonsiliasi ditandai cocok');
            loadReconciliations();
            
        } catch (error) {
            console.error('Error marking as matched:', error);
            App.showToast('error', 'Error', 'Gagal menandai cocok: ' + error.message);
        }
    }
    
    /**
     * Handle search
     */
    function handleSearch() {
        currentPage = 1;
        renderReconciliations();
    }
    
    /**
     * Handle filter change
     */
    function handleFilterChange() {
        currentPage = 1;
        renderReconciliations();
    }
    
    /**
     * Go to page
     */
    function goToPage(page) {
        const filteredData = filterData();
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderReconciliations();
        }
    }
    
    /**
     * Get status color
     */
    function getStatusColor(status) {
        const colors = { matched: 'success', unmatched: 'danger' };
        return colors[status] || 'secondary';
    }
    
    /**
     * Get status text
     */
    function getStatusText(status) {
        const texts = { matched: 'Cocok', unmatched: 'Tidak Cocok' };
        return texts[status] || status;
    }
    
    /**
     * Debounce helper
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public API
    return {
        init,
        editRecon,
        goToPage,
        viewRecon,
        markAsMatched
    };
})();
