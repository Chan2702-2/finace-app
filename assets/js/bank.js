/**
 * Bank Module
 * Handles bank account management
 */

const Bank = (function() {
    let banks = [];
    let editingBankId = null;
    
    // State
    let elements = {};
    
    /**
     * Initialize bank module
     */
    async function init() {
        console.log('Initializing Bank module...');
        cacheElements();
        setupEventListeners();
        await loadBanks();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            bankTableBody: document.getElementById('bank-table-body'),
            bankModal: document.getElementById('bank-modal'),
            bankForm: document.getElementById('bank-form'),
            addBankBtn: document.getElementById('add-bank-btn')
        };
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (elements.addBankBtn) {
            elements.addBankBtn.addEventListener('click', () => openBankModal());
        }
        
        if (elements.bankForm) {
            elements.bankForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveBank();
            });
        }
        
        document.getElementById('close-bank-modal')?.addEventListener('click', () => {
            elements.bankModal.classList.remove('active');
        });
    }
    
    /**
     * Load banks from database
     */
    async function loadBanks() {
        const user = App.getUser();
        if (!user) return;
        
        try {
            const { data, error } = await window.supabaseConfig.db
                .from('banks')
                .select('*')
                .eq('user_id', user.id)
                .order('bank_name', { ascending: true });
            
            if (error) throw error;
            
            banks = data || [];
            renderTable();
            
        } catch (error) {
            console.error('Error loading banks:', error);
            elements.bankTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #EF4444;">
                        Error memuat data bank
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Render bank table
     */
    function renderTable() {
        if (banks.length === 0) {
            elements.bankTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #777;">
                        Belum ada data bank
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.bankTableBody.innerHTML = banks.map(bank => `
            <tr>
                <td>${bank.bank_name || '-'}</td>
                <td>${bank.account_number || '-'}</td>
                <td>${bank.account_holder || '-'}</td>
                <td>
                    <span class="badge badge-${bank.status === 'active' ? 'success' : 'secondary'}">
                        ${bank.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="Bank.editBank('${bank.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Bank.deleteBank('${bank.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    /**
     * Open bank modal
     */
    function openBankModal(bank = null) {
        editingBankId = bank?.id || null;
        
        document.getElementById('bank-modal-title').textContent = bank ? 'Edit Bank' : 'Tambah Bank';
        document.getElementById('bank-id').value = bank?.id || '';
        document.getElementById('bank-name').value = bank?.bank_name || '';
        document.getElementById('bank-account-number').value = bank?.account_number || '';
        document.getElementById('bank-account-holder').value = bank?.account_holder || '';
        document.getElementById('bank-status').value = bank?.status || 'active';
        
        elements.bankModal.classList.add('active');
    }
    
    /**
     * Edit bank
     */
    function editBank(id) {
        const bank = banks.find(b => b.id === id);
        if (bank) {
            openBankModal(bank);
        }
    }
    
    /**
     * Save bank
     */
    async function saveBank() {
        const user = App.getUser();
        if (!user) return;
        
        const bankData = {
            user_id: user.id,
            bank_name: document.getElementById('bank-name').value,
            account_number: document.getElementById('bank-account-number').value,
            account_holder: document.getElementById('bank-account-holder').value,
            status: document.getElementById('bank-status').value,
            updated_at: new Date().toISOString()
        };
        
        try {
            if (editingBankId) {
                const { error } = await window.supabaseConfig.db
                    .from('banks')
                    .update(bankData)
                    .eq('id', editingBankId);
                
                if (error) throw error;
                App.showToast('Bank berhasil diperbarui', 'success');
            } else {
                bankData.created_at = new Date().toISOString();
                const { error } = await window.supabaseConfig.db
                    .from('banks')
                    .insert([bankData]);
                
                if (error) throw error;
                App.showToast('Bank berhasil ditambahkan', 'success');
            }
            
            elements.bankModal.classList.remove('active');
            await loadBanks();
            
        } catch (error) {
            console.error('Error saving bank:', error);
            App.showToast('Gagal menyimpan bank', 'error');
        }
    }
    
    /**
     * Delete bank
     */
    async function deleteBank(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus bank ini?')) return;
        
        try {
            const { error } = await window.supabaseConfig.db
                .from('banks')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            App.showToast('Bank berhasil dihapus', 'success');
            await loadBanks();
            
        } catch (error) {
            console.error('Error deleting bank:', error);
            App.showToast('Gagal menghapus bank', 'error');
        }
    }
    
    /**
     * Get bank by ID
     */
    function getBankById(id) {
        return banks.find(b => b.id === id);
    }
    
    /**
     * Get all active banks
     */
    function getActiveBanks() {
        return banks.filter(b => b.status === 'active');
    }
    
    // Public API
    return {
        init,
        editBank,
        deleteBank,
        getBankById,
        getActiveBanks
    };
})();

// Make it globally available
window.Bank = Bank;
