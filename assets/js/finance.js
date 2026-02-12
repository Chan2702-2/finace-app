/**
 * Finance Module
 * Handles transaction CRUD operations (income/expense)
 */

const Finance = (function() {
    // State
    let transactions = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    
    /**
     * Initialize finance module
     */
    function init() {
        console.log('Initializing Finance module...');
        cacheElements();
        setupEventListeners();
        loadTransactions();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            transactionTableBody: document.getElementById('transaction-table-body'),
            transactionModal: document.getElementById('transaction-modal'),
            transactionForm: document.getElementById('transaction-form'),
            addTransactionBtn: document.getElementById('add-transaction-btn'),
            downloadReportBtn: document.getElementById('download-report-btn'),
            searchInput: document.getElementById('search-transaction'),
            typeFilter: document.getElementById('type-filter'),
            pagination: document.getElementById('transaction-pagination'),
            totalIncome: document.getElementById('total-income'),
            totalExpense: document.getElementById('total-expense'),
            balance: document.getElementById('balance')
        };
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Add transaction button
        if (elements.addTransactionBtn) {
            elements.addTransactionBtn.addEventListener('click', () => openTransactionModal());
        }
        
        // Download report button
        if (elements.downloadReportBtn) {
            elements.downloadReportBtn.addEventListener('click', downloadReport);
        }
        
        // Close modal
        const closeModalBtn = document.getElementById('close-transaction-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeTransactionModal);
        }
        
        // Form submission
        if (elements.transactionForm) {
            elements.transactionForm.addEventListener('submit', handleSubmit);
        }
        
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        // Type filter
        if (elements.typeFilter) {
            elements.typeFilter.addEventListener('change', handleFilterChange);
        }
    }
    
    /**
     * Load transactions from database
     */
    async function loadTransactions() {
        const user = App.getUser();
        if (!user) return;
        
        App.showLoading('Memuat transaksi...');
        
        try {
            const { data, error } = await window.supabaseConfig.db
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('transaction_date', { ascending: false });
            
            if (error) throw error;
            
            transactions = data || [];
            renderTransactions();
            updateTotals();
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            App.showToast('error', 'Error', 'Gagal memuat transaksi');
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * Render transactions table
     */
    function renderTransactions() {
        if (!elements.transactionTableBody) return;
        
        const filteredTransactions = filterTransactions();
        const paginatedTransactions = paginate(filteredTransactions);
        
        if (paginatedTransactions.length === 0) {
            elements.transactionTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" style="margin-bottom: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                            <p class="text-muted">Belum ada transaksi</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.transactionTableBody.innerHTML = paginatedTransactions.map(tx => `
            <tr>
                <td>${App.formatDate(tx.transaction_date)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${tx.type === 'income' ? '#D1FAE5' : '#FEE2E2'}; display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${tx.type === 'income' ? '#10B981' : '#EF4444'}">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tx.type === 'income' ? 'M12 4v16m8-8H4' : 'M12 4v16m0 0l-8-8m8 8l8-8'}"/>
                            </svg>
                        </div>
                        <span class="badge badge-${tx.type === 'income' ? 'success' : 'danger'}">${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
                    </div>
                </td>
                <td>${tx.category || '-'}</td>
                <td>${tx.description || '-'}</td>
                <td style="font-weight: 600; color: ${tx.type === 'income' ? '#10B981' : '#EF4444'};">
                    ${tx.type === 'income' ? '+' : '-'}${App.formatCurrency(tx.amount)}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="Finance.editTransaction('${tx.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Finance.deleteTransaction('${tx.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        renderPagination(filteredTransactions.length);
    }
    
    /**
     * Update totals display
     */
    function updateTotals() {
        const income = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
        
        const expense = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
        
        const balance = income - expense;
        
        if (elements.totalIncome) {
            elements.totalIncome.textContent = App.formatCurrency(income);
        }
        if (elements.totalExpense) {
            elements.totalExpense.textContent = App.formatCurrency(expense);
        }
        if (elements.balance) {
            elements.balance.textContent = App.formatCurrency(balance);
            elements.balance.style.color = balance >= 0 ? '#10B981' : '#EF4444';
        }
    }
    
    /**
     * Filter transactions
     */
    function filterTransactions() {
        const searchTerm = elements.searchInput?.value?.toLowerCase() || '';
        const typeFilter = elements.typeFilter?.value || 'all';
        
        return transactions.filter(tx => {
            const matchesSearch = tx.description?.toLowerCase().includes(searchTerm) ||
                tx.category?.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || tx.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }
    
    /**
     * Paginate transactions
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
        html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="Finance.goToPage(${currentPage - 1})">Prev</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="Finance.goToPage(${i})">${i}</button>`;
        }
        
        html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="Finance.goToPage(${currentPage + 1})">Next</button>`;
        
        elements.pagination.innerHTML = html;
    }
    
    /**
     * Open transaction modal
     */
    function openTransactionModal(transaction = null) {
        document.getElementById('transaction-modal-title').textContent = transaction ? 'Edit Transaksi' : 'Tambah Transaksi';
        elements.transactionForm.reset();
        
        document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        
        if (transaction) {
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('transaction-type').value = transaction.type;
            document.getElementById('transaction-amount').value = transaction.amount;
            document.getElementById('transaction-category').value = transaction.category || '';
            document.getElementById('transaction-description').value = transaction.description || '';
            document.getElementById('transaction-date').value = transaction.transaction_date?.split('T')[0];
        } else {
            document.getElementById('transaction-id').value = '';
        }
        
        elements.transactionModal.classList.add('active');
    }
    
    /**
     * Close transaction modal
     */
    function closeTransactionModal() {
        elements.transactionModal.classList.remove('active');
    }
    
    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        
        const user = App.getUser();
        if (!user) return;
        
        const id = document.getElementById('transaction-id').value;
        
        const transactionData = {
            user_id: user.id,
            type: document.getElementById('transaction-type').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            category: document.getElementById('transaction-category').value,
            description: document.getElementById('transaction-description').value,
            transaction_date: document.getElementById('transaction-date').value
        };
        
        App.showLoading('Menyimpan transaksi...');
        
        try {
            // Ensure user record exists in users table
            const userCheck = await window.supabaseConfig.userHelpers.ensureUserExists();
            if (userCheck && userCheck.error) {
                console.warn('User check warning:', userCheck.error);
            }
            
            let result;
            
            if (id) {
                result = await window.supabaseConfig.db
                    .from('transactions')
                    .update(transactionData)
                    .eq('id', id);
            } else {
                result = await window.supabaseConfig.db
                    .from('transactions')
                    .insert(transactionData);
            }
            
            if (result.error) throw result.error;
            
            App.showToast('success', 'Berhasil', 'Transaksi berhasil disimpan');
            closeTransactionModal();
            loadTransactions();
            
        } catch (error) {
            console.error('Error saving transaction:', error);
            App.showToast('error', 'Error', 'Gagal menyimpan transaksi: ' + error.message);
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * Edit transaction
     */
    function editTransaction(id) {
        const transaction = transactions.find(tx => tx.id === id);
        if (!transaction) return;
        openTransactionModal(transaction);
    }
    
    /**
     * Delete transaction
     */
    async function deleteTransaction(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
        
        try {
            const { error } = await window.supabaseConfig.db
                .from('transactions')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            App.showToast('success', 'Berhasil', 'Transaksi berhasil dihapus');
            loadTransactions();
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            App.showToast('error', 'Error', 'Gagal menghapus transaksi');
        }
    }
    
    /**
     * Handle search
     */
    function handleSearch() {
        currentPage = 1;
        renderTransactions();
    }
    
    /**
     * Handle filter change
     */
    function handleFilterChange() {
        currentPage = 1;
        renderTransactions();
    }
    
    /**
     * Download report as Excel
     */
    function downloadReport() {
        if (transactions.length === 0) {
            App.showToast('error', 'Peringatan', 'Tidak ada data transaksi untuk diunduh');
            return;
        }
        
        try {
            // Prepare data for Excel
            const wb = XLSX.utils.book_new();
            
            // Summary sheet
            const income = transactions
                .filter(tx => tx.type === 'income')
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            
            const expense = transactions
                .filter(tx => tx.type === 'expense')
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            
            const balance = income - expense;
            
            const summaryData = [
                ['LAPORAN KEUANGAN'],
                ['Tanggal Unduh: ' + new Date().toLocaleDateString('id-ID')],
                [''],
                ['RINGKASAN'],
                ['Total Pemasukan', App.formatCurrency(income)],
                ['Total Pengeluaran', App.formatCurrency(expense)],
                ['Saldo', App.formatCurrency(balance)],
                [''],
                ['DETAIL TRANSAKSI'],
                ['No', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah']
            ];
            
            // Add transaction data
            let no = 1;
            transactions.forEach(tx => {
                summaryData.push([
                    no++,
                    App.formatDate(tx.transaction_date),
                    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                    tx.category || '-',
                    tx.description || '-',
                    tx.type === 'income' ? tx.amount : -tx.amount
                ]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(summaryData);
            
            // Set column widths
            ws['!cols'] = [
                { wch: 5 },  // No
                { wch: 15 }, // Tanggal
                { wch: 12 }, // Jenis
                { wch: 20 }, // Kategori
                { wch: 30 }, // Keterangan
                { wch: 15 }  // Jumlah
            ];
            
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');
            
            // Generate and download file
            const fileName = 'Laporan_Keuangan_' + new Date().toISOString().split('T')[0] + '.xlsx';
            XLSX.writeFile(wb, fileName);
            
            App.showToast('success', 'Berhasil', 'Laporan berhasil diunduh');
            
        } catch (error) {
            console.error('Error downloading report:', error);
            App.showToast('error', 'Error', 'Gagal mengunduh laporan: ' + error.message);
        }
    }
    
    /**
     * Go to page
     */
    function goToPage(page) {
        const filteredTransactions = filterTransactions();
        const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderTransactions();
        }
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
        editTransaction,
        deleteTransaction,
        goToPage,
        downloadReport
    };
})();
