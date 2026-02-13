/**
 * Invoice Module
 * Handles invoice CRUD operations and management
 */

// Global reference for invoices (for inline onclick handlers)
window.invoices = window.invoices || [];

const Invoice = (function() {
    // State
    let invoices = window.invoices;
    let clients = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let editingInvoiceId = null;
    let currentInvoice = null; // For PDF export
    
    /**
     * Initialize invoice module
     */
    async function init() {
        console.log('Initializing Invoice module...');
        cacheElements();
        setupEventListeners();
        await loadClients();
        loadInvoices();
    }
    
    /**
     * Load clients for dropdown
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
            populateClientDropdown();
            
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    }
    
    /**
     * Populate client dropdown
     */
    function populateClientDropdown() {
        const clientSelect = document.getElementById('client-select');
        if (!clientSelect) return;
        
        clientSelect.innerHTML = '<option value="">-- Pilih Mitra --</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
    }
    
    /**
     * Select client and auto-fill form
     */
    function selectClient(clientId) {
        // Helper function to safely set element value
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        
        if (!clientId) {
            // Clear client fields if "-- Pilih Mitra --" is selected
            setValue('client-name', '');
            setValue('client-tax', '');
            setValue('client-email', '');
            setValue('client-address', '');
            setValue('invoice-tax', 0);
            setValue('invoice-discount', 0);
            calculateInvoiceTotal();
            return;
        }
        
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setValue('client-name', client.name);
            setValue('client-tax', client.npwp);
            setValue('client-email', client.email);
            setValue('client-address', client.address);
        }
    }
    
    /**
     * Calculate invoice total
     */
    function calculateInvoiceTotal() {
        const items = getInvoiceItems();
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax = parseFloat(document.getElementById('invoice-tax')?.value) || 0;
        const discount = parseFloat(document.getElementById('invoice-discount')?.value) || 0;
        const total = subtotal + tax - discount;
        
        document.getElementById('invoice-subtotal').textContent = App.formatCurrency(subtotal);
        document.getElementById('invoice-subtotal-hidden').value = subtotal;
        document.getElementById('invoice-total').textContent = App.formatCurrency(total);
        document.getElementById('invoice-total-hidden').value = total;
        
        // Update item totals
        document.querySelectorAll('.invoice-item').forEach((itemEl, index) => {
            const quantity = parseFloat(itemEl.querySelector('.item-quantity')?.value) || 0;
            const unitPrice = parseFloat(itemEl.querySelector('.item-price')?.value) || 0;
            const total = quantity * unitPrice;
            const totalEl = itemEl.querySelector('.item-total');
            if (totalEl) {
                totalEl.value = App.formatCurrency(total);
            }
        });
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            invoiceTable: document.getElementById('invoice-table'),
            invoiceTableBody: document.getElementById('invoice-table-body'),
            invoiceModal: document.getElementById('invoice-modal'),
            invoiceForm: document.getElementById('invoice-form'),
            addInvoiceBtn: document.getElementById('add-invoice-btn'),
            searchInput: document.getElementById('search-invoice'),
            statusFilter: document.getElementById('status-filter'),
            pagination: document.getElementById('invoice-pagination')
        };
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Add invoice button
        if (elements.addInvoiceBtn) {
            elements.addInvoiceBtn.addEventListener('click', () => openInvoiceModal());
        }
        
        // Close modal
        const closeModalBtn = document.getElementById('close-invoice-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeInvoiceModal);
        }
        
        // Form submission
        if (elements.invoiceForm) {
            elements.invoiceForm.addEventListener('submit', handleSubmit);
        }
        
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        // Status filter
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', handleFilterChange);
        }
        
        // Add invoice item
        const addItemBtn = document.getElementById('add-invoice-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', addInvoiceItem);
        }
        
        // Client select change
        const clientSelect = document.getElementById('client-select');
        if (clientSelect) {
            clientSelect.addEventListener('change', (e) => {
                selectClient(e.target.value);
            });
        }
        
        // Calculate total on item change
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity') || 
                e.target.classList.contains('item-price') ||
                e.target.id === 'invoice-tax' ||
                e.target.id === 'invoice-discount') {
                calculateInvoiceTotal();
            }
        });
    }
    
    /**
     * Load invoices from database
     */
    async function loadInvoices() {
        const user = App.getUser();
        if (!user) return;
        
        App.showLoading('Memuat invoice...');
        
        try {
            const { data, error } = await window.supabaseConfig.db
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            invoices = data || [];
            // Also update global reference for inline onclick handlers
            window.invoices = invoices;
            renderInvoices();
            
        } catch (error) {
            console.error('Error loading invoices:', error);
            App.showToast('error', 'Error', 'Gagal memuat invoice');
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * Render invoices table
     */
    function renderInvoices() {
        if (!elements.invoiceTableBody) return;
        
        const filteredInvoices = filterInvoices();
        const paginatedInvoices = paginate(filteredInvoices);
        
        if (paginatedInvoices.length === 0) {
            elements.invoiceTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" style="margin-bottom: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <p class="text-muted">Belum ada invoice</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.invoiceTableBody.innerHTML = paginatedInvoices.map(invoice => `
            <tr>
                <td>${invoice.invoice_number}</td>
                <td>${invoice.client_name}</td>
                <td>${App.formatDate(invoice.created_at)}</td>
                <td>${invoice.due_date ? App.formatDate(invoice.due_date) : '-'}</td>
                <td>${App.formatCurrency(invoice.total)}</td>
                <td><span class="badge badge-${getStatusColor(invoice.status)}">${getStatusText(invoice.status)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="Invoice.viewInvoice('${invoice.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="InvoicePDF.download(Invoice.getInvoiceById('${invoice.id}'))" title="Download PDF">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </button>
                        ${invoice.status !== 'paid' ? `
                            <button class="btn btn-sm btn-outline" onclick="Invoice.editInvoice('${invoice.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="Invoice.markAsPaid('${invoice.id}')" title="Tandai Lunas">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="Invoice.deleteInvoice('${invoice.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
        renderPagination(filteredInvoices.length);
    }
    
    /**
     * Filter invoices based on search and status
     */
    function filterInvoices() {
        const searchTerm = elements.searchInput?.value?.toLowerCase() || '';
        const statusFilter = elements.statusFilter?.value || 'all';
        
        // Use local invoices or fallback to window.invoices
        const invoiceList = invoices || window.invoices || [];
        
        return invoiceList.filter(invoice => {
            const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchTerm) ||
                invoice.client_name?.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }
    
    /**
     * Paginate invoices
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
        
        // Previous button
        html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="Invoice.goToPage(${currentPage - 1})">Prev</button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="Invoice.goToPage(${i})">${i}</button>`;
        }
        
        // Next button
        html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="Invoice.goToPage(${currentPage + 1})">Next</button>`;
        
        elements.pagination.innerHTML = html;
    }
    
    /**
     * Open invoice modal
     */
    function openInvoiceModal(invoice = null) {
        editingInvoiceId = invoice?.id || null;
        
        // Reset form
        document.getElementById('invoice-modal-title').textContent = invoice ? 'Edit Invoice' : 'Tambah Invoice';
        elements.invoiceForm.reset();
        
        // Helper function to safely set element value
        function setElValue(id, value) {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        }
        
        // Set default values
        setElValue('invoice-date', new Date().toISOString().split('T')[0]);
        setElValue('invoice-due-date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setElValue('invoice-status', 'pending');
        setElValue('invoice-tax', 0);
        setElValue('invoice-discount', 0);
        setElValue('invoice-notes', '');
        setElValue('client-select', '');
        
        // If editing, populate form
        if (invoice) {
            setElValue('invoice-number', invoice.invoice_number);
            setElValue('client-name', invoice.client_name);
            setElValue('client-email', invoice.client_email);
            setElValue('client-address', invoice.client_address);
            setElValue('invoice-date', invoice.created_at?.split('T')[0]);
            setElValue('invoice-due-date', invoice.due_date);
            setElValue('invoice-notes', invoice.notes);
            setElValue('invoice-status', invoice.status);
            setElValue('invoice-tax', invoice.tax);
            setElValue('invoice-discount', invoice.discount);
            
            // Populate items
            const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
            renderInvoiceItems(items);
        } else {
            // Generate invoice number
            setElValue('invoice-number', 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-4));
            renderInvoiceItems([]);
        }
        
        // Show modal
        elements.invoiceModal?.classList.add('active');
    }
    
    /**
     * Close invoice modal
     */
    function closeInvoiceModal() {
        elements.invoiceModal.classList.remove('active');
        editingInvoiceId = null;
    }
    
    /**
     * Render invoice items
     */
    function renderInvoiceItems(items) {
        const container = document.getElementById('invoice-items-container');
        if (!container) return;
        
        container.innerHTML = items.map((item, index) => `
            <div class="invoice-item" style="display: grid; grid-template-columns: 1fr 80px 120px 120px auto; gap: 8px; align-items: end; margin-bottom: 12px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Deskripsi</label>
                    <input type="text" class="form-input item-description" value="${item.description || ''}" placeholder="Nama item">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Jumlah</label>
                    <input type="number" class="form-input item-quantity" value="${item.quantity || 1}" min="1">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Harga</label>
                    <input type="number" class="form-input item-price" value="${item.unit_price || 0}" min="0">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Total</label>
                    <input type="text" class="form-input item-total" value="${App.formatCurrency(item.total || 0)}" readonly style="background: #F9FAFB;">
                </div>
                <button type="button" class="btn btn-sm btn-danger" onclick="Invoice.removeInvoiceItem(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');
        
        calculateInvoiceTotal();
    }
    
    /**
     * Add invoice item
     */
    function addInvoiceItem() {
        const container = document.getElementById('invoice-items-container');
        const items = getInvoiceItems();
        items.push({ description: '', quantity: 1, unit_price: 0, total: 0 });
        renderInvoiceItems(items);
    }
    
    /**
     * Remove invoice item
     */
    function removeInvoiceItem(index) {
        const items = getInvoiceItems();
        items.splice(index, 1);
        renderInvoiceItems(items);
    }
    
    /**
     * Get invoice items from form
     */
    function getInvoiceItems() {
        const container = document.getElementById('invoice-items-container');
        if (!container) return [];
        
        const items = [];
        container.querySelectorAll('.invoice-item').forEach(item => {
            items.push({
                description: item.querySelector('.item-description').value,
                quantity: parseInt(item.querySelector('.item-quantity').value) || 1,
                unit_price: parseFloat(item.querySelector('.item-price').value) || 0
            });
        });
        
        // Calculate totals
        items.forEach(item => {
            item.total = item.quantity * item.unit_price;
        });
        
        return items;
    }
    
    /**
     * Calculate invoice total
     */
    function calculateInvoiceTotal() {
        const items = getInvoiceItems();
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const tax = parseFloat(document.getElementById('invoice-tax')?.value) || 0;
        const discount = parseFloat(document.getElementById('invoice-discount')?.value) || 0;
        const total = subtotal + tax - discount;
        
        // Update display
        const subtotalEl = document.getElementById('invoice-subtotal');
        const totalEl = document.getElementById('invoice-total');
        if (subtotalEl) subtotalEl.textContent = App.formatCurrency(subtotal);
        if (totalEl) totalEl.textContent = App.formatCurrency(total);
        
        // Update hidden fields
        document.getElementById('invoice-subtotal-hidden')?.setAttribute('value', subtotal);
        document.getElementById('invoice-total-hidden')?.setAttribute('value', total);
    }
    
    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        
        const user = App.getUser();
        if (!user) return;
        
        const items = getInvoiceItems();
        if (items.length === 0) {
            App.showToast('error', 'Error', 'Tambahkan minimal satu item');
            return;
        }
        
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const total = parseFloat(document.getElementById('invoice-total-hidden')?.value) || subtotal;
        
        const invoiceData = {
            user_id: user.id,
            invoice_number: document.getElementById('invoice-number')?.value || '',
            client_name: document.getElementById('client-name')?.value || '',
            client_email: document.getElementById('client-email')?.value || '',
            client_address: document.getElementById('client-address')?.value || '',
            items: JSON.stringify(items),
            subtotal: subtotal,
            total: total,
            tax: parseFloat(document.getElementById('invoice-tax')?.value) || 0,
            discount: parseFloat(document.getElementById('invoice-discount')?.value) || 0,
            due_date: document.getElementById('invoice-due-date')?.value || '',
            notes: document.getElementById('invoice-notes')?.value || '',
            status: document.getElementById('invoice-status')?.value || 'pending'
        };
        
        App.showLoading('Menyimpan invoice...');
        
        try {
            // Ensure user record exists in users table
            const userCheck = await window.supabaseConfig.userHelpers.ensureUserExists();
            if (userCheck && userCheck.error) {
                console.warn('User check warning:', userCheck.error);
            }
            
            let result;
            
            if (editingInvoiceId) {
                // Update existing invoice
                result = await window.supabaseConfig.db
                    .from('invoices')
                    .update(invoiceData)
                    .eq('id', editingInvoiceId);
                
                App.showToast('success', 'Berhasil', 'Invoice berhasil diperbarui');
            } else {
                // Create new invoice
                result = await window.supabaseConfig.db
                    .from('invoices')
                    .insert(invoiceData);
                
                App.showToast('success', 'Berhasil', 'Invoice berhasil dibuat');
            }
            
            if (result.error) throw result.error;
            
            closeInvoiceModal();
            loadInvoices();
            
        } catch (error) {
            console.error('Error saving invoice:', error);
            App.showToast('error', 'Error', 'Gagal menyimpan invoice: ' + error.message);
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * View invoice details
     */
    async function viewInvoice(id) {
        const invoiceList = invoices || window.invoices || [];
        const invoice = invoiceList.find(i => i.id === id);
        if (!invoice) return;
        
        // Store current invoice for PDF export
        currentInvoice = invoice;
        
        // Show invoice details modal or print view
        const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
        
        let itemsHtml = items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${App.formatCurrency(item.unit_price)}</td>
                <td style="text-align: right;">${App.formatCurrency(item.total)}</td>
            </tr>
        `).join('');
        
        const modalContent = `
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                        <div>
                            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 4px;">${invoice.invoice_number}</h3>
                            <span class="badge badge-${getStatusColor(invoice.status)}">${getStatusText(invoice.status)}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #4F46E5;">${App.formatCurrency(invoice.total)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h4 style="font-weight: 600; margin-bottom: 8px;">Kepada:</h4>
                        <p style="margin-bottom: 4px;">${invoice.client_name}</p>
                        ${invoice.client_email ? `<p style="color: #6B7280; margin-bottom: 4px;">${invoice.client_email}</p>` : ''}
                        ${invoice.client_address ? `<p style="color: #6B7280;">${invoice.client_address}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <p style="margin-bottom: 4px;"><strong>Tanggal:</strong> ${App.formatDate(invoice.created_at)}</p>
                        <p style="margin-bottom: 4px;"><strong>Jatuh Tempo:</strong> ${invoice.due_date ? App.formatDate(invoice.due_date) : '-'}</p>
                    </div>
                </div>
                
                <table class="table" style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Deskripsi</th>
                            <th style="text-align: center;">Jumlah</th>
                            <th style="text-align: right;">Harga</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="text-align: right;"><strong>Subtotal</strong></td>
                            <td style="text-align: right;">${App.formatCurrency(invoice.subtotal)}</td>
                        </tr>
                        ${invoice.tax > 0 ? `
                            <tr>
                                <td colspan="3" style="text-align: right;">Pajak</td>
                                <td style="text-align: right;">${App.formatCurrency(invoice.tax)}</td>
                            </tr>
                        ` : ''}
                        ${invoice.discount > 0 ? `
                            <tr>
                                <td colspan="3" style="text-align: right;">Diskon</td>
                                <td style="text-align: right;">-${App.formatCurrency(invoice.discount)}</td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td colspan="3" style="text-align: right; font-size: 1.125rem;"><strong>Total</strong></td>
                            <td style="text-align: right; font-size: 1.125rem; font-weight: 700; color: #4F46E5;">${App.formatCurrency(invoice.total)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                ${invoice.notes ? `
                    <div style="background: #F9FAFB; padding: 12px; border-radius: 8px;">
                        <strong>Catatan:</strong> ${invoice.notes}
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer" style="display: flex; justify-content: space-between; gap: 10px;">
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="InvoicePDF.preview(Invoice.getCurrentInvoice())">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Preview
                    </button>
                    <button class="btn btn-outline" onclick="InvoicePDF.download(Invoice.getCurrentInvoice())">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Download PDF
                    </button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('view-invoice-modal').classList.remove('active')">Tutup</button>
                    <button class="btn btn-primary" onclick="InvoicePDF.print(Invoice.getCurrentInvoice())">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                        </svg>
                        Cetak
                    </button>
                </div>
            </div>
        `;
        
        // Create or update view modal
        let viewModal = document.getElementById('view-invoice-modal');
        if (!viewModal) {
            viewModal = document.createElement('div');
            viewModal.id = 'view-invoice-modal';
            viewModal.className = 'modal-overlay';
            viewModal.innerHTML = `
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3 class="modal-title">Detail Invoice</h3>
                        <button class="modal-close" onclick="document.getElementById('view-invoice-modal').classList.remove('active')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div id="view-invoice-content"></div>
                </div>
            `;
            document.body.appendChild(viewModal);
        }
        
        document.getElementById('view-invoice-content').innerHTML = modalContent;
        viewModal.classList.add('active');
    }
    
    /**
     * Edit invoice
     */
    function editInvoice(id) {
        const invoiceList = invoices || window.invoices || [];
        const invoice = invoiceList.find(i => i.id === id);
        if (!invoice) return;
        openInvoiceModal(invoice);
    }
    
    /**
     * Mark invoice as paid
     */
    async function markAsPaid(id) {
        const user = App.getUser();
        if (!user) return;
        
        if (!confirm('Tandai invoice ini sebagai lunas?')) return;
        
        try {
            // Get invoice details first
            const invoiceList = invoices || window.invoices || [];
            const invoice = invoiceList.find(i => i.id === id);
            if (!invoice) return;
            
            // Update invoice status
            const { error: invoiceError } = await window.supabaseConfig.db
                .from('invoices')
                .update({
                    status: 'paid',
                    paid_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', id);
            
            if (invoiceError) throw invoiceError;
            
            // Ensure user record exists in users table
            const userCheck = await window.supabaseConfig.userHelpers.ensureUserExists();
            if (userCheck && userCheck.error) {
                console.warn('User check warning:', userCheck.error);
            }
            
            // Create transaction for the payment
            const { error: transactionError } = await window.supabaseConfig.db
                .from('transactions')
                .insert({
                    user_id: user.id,
                    type: 'income',
                    amount: invoice.total,
                    category: 'Pendapatan Invoice',
                    description: `Pembayaran ${invoice.invoice_number}`,
                    reference_type: 'invoice',
                    reference_id: id,
                    transaction_date: new Date().toISOString().split('T')[0]
                });
            
            if (transactionError) throw transactionError;
            
            App.showToast('success', 'Berhasil', 'Invoice ditandai lunas dan dicatat sebagai pendapatan');
            loadInvoices();
            
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            App.showToast('error', 'Error', 'Gagal memproses pembayaran');
        }
    }
    
    /**
     * Delete invoice
     */
    async function deleteInvoice(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus invoice ini?')) return;
        
        try {
            const { error } = await window.supabaseConfig.db
                .from('invoices')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            App.showToast('success', 'Berhasil', 'Invoice berhasil dihapus');
            loadInvoices();
            
        } catch (error) {
            console.error('Error deleting invoice:', error);
            App.showToast('error', 'Error', 'Gagal menghapus invoice');
        }
    }
    
    /**
     * Handle search
     */
    function handleSearch() {
        currentPage = 1;
        renderInvoices();
    }
    
    /**
     * Handle filter change
     */
    function handleFilterChange() {
        currentPage = 1;
        renderInvoices();
    }
    
    /**
     * Go to page
     */
    function goToPage(page) {
        const filteredInvoices = filterInvoices();
        const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderInvoices();
        }
    }
    
    /**
     * Get status color
     */
    function getStatusColor(status) {
        const colors = { pending: 'warning', sent: 'info', paid: 'success' };
        return colors[status] || 'secondary';
    }
    
    /**
     * Get status text
     */
    function getStatusText(status) {
        const texts = { pending: 'Tertunda', sent: 'Terkirim', paid: 'Lunas' };
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
    
    /**
     * Get invoice by ID
     */
    function getInvoiceById(id) {
        // Use local invoices or fallback to window.invoices
        const invoiceList = invoices || window.invoices || [];
        if (!Array.isArray(invoiceList)) {
            console.warn('Invoices array not available');
            return null;
        }
        return invoiceList.find(i => i && i.id === id);
    }
    
    /**
     * Get current invoice (for PDF export)
     */
    function getCurrentInvoice() {
        return currentInvoice;
    }
    
    // Public API
    return {
        init,
        viewInvoice,
        editInvoice,
        markAsPaid,
        deleteInvoice,
        addInvoiceItem,
        removeInvoiceItem,
        goToPage,
        selectClient,
        calculateInvoiceTotal,
        getInvoiceById,
        getCurrentInvoice
    };
})();
