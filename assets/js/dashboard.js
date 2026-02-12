/**
 * Dashboard Module
 * Handles dashboard page functionality and data display
 */

const Dashboard = (function() {
    // State
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    /**
     * Initialize dashboard
     */
    function init() {
        console.log('Initializing Dashboard...');
        loadDashboardData();
    }
    
    /**
     * Load all dashboard data
     */
    async function loadDashboardData() {
        const user = App.getUser();
        if (!user) return;
        
        try {
            // Load statistics
            await Promise.all([
                loadStats(),
                loadMonthlyComparison(),
                loadRecentInvoices(),
                loadRecentTransactions(),
                loadPendingInvoices()
            ]);
            
            // Initialize chart if Chart.js is available
            initCharts();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            App.showToast('error', 'Error', 'Gagal memuat data dashboard');
        }
    }
    
    /**
     * Load statistics
     */
    async function loadStats() {
        const user = App.getUser();
        if (!user) return;
        
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();
        
        try {
            // Get monthly income
            const { data: incomeData } = await window.supabaseConfig.db
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'income')
                .gte('transaction_date', startOfMonth)
                .lte('transaction_date', endOfMonth);
            
            // Get monthly expenses
            const { data: expenseData } = await window.supabaseConfig.db
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .gte('transaction_date', startOfMonth)
                .lte('transaction_date', endOfMonth);
            
            // Get invoice counts
            const { data: invoiceCounts } = await window.supabaseConfig.db
                .from('invoices')
                .select('status', { count: 'exact', head: true })
                .eq('user_id', user.id);
            
            // Get pending invoice count
            const { data: pendingInvoices } = await window.supabaseConfig.db
                .from('invoices')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'pending');
            
            // Calculate totals
            const totalIncome = incomeData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
            const totalExpense = expenseData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
            const pendingCount = pendingInvoices?.length || 0;
            
            // Update UI
            document.getElementById('total-income').textContent = App.formatCurrency(totalIncome);
            document.getElementById('total-expense').textContent = App.formatCurrency(totalExpense);
            document.getElementById('total-invoices').textContent = invoiceCounts?.length || 0;
            document.getElementById('pending-invoices').textContent = pendingCount;
            
            // Calculate balance
            const balance = totalIncome - totalExpense;
            document.getElementById('balance').textContent = App.formatCurrency(balance);
            
            // Update balance color
            const balanceEl = document.getElementById('balance');
            if (balanceEl) {
                balanceEl.style.color = balance >= 0 ? '#10B981' : '#EF4444';
            }
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    /**
     * Load monthly comparison data
     */
    async function loadMonthlyComparison() {
        const user = App.getUser();
        if (!user) return;
        
        // Current month
        const currentStart = new Date(currentYear, currentMonth, 1).toISOString();
        const currentEnd = new Date(currentYear, currentMonth + 1, 0).toISOString();
        
        // Previous month
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevStart = new Date(prevYear, prevMonth, 1).toISOString();
        const prevEnd = new Date(prevYear, prevMonth + 1, 0).toISOString();
        
        try {
            // Current month income
            const { data: currentIncome } = await window.supabaseConfig.db
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'income')
                .gte('transaction_date', currentStart)
                .lte('transaction_date', currentEnd);
            
            // Previous month income
            const { data: prevIncome } = await window.supabaseConfig.db
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'income')
                .gte('transaction_date', prevStart)
                .lte('transaction_date', prevEnd);
            
            const currentTotal = currentIncome?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
            const prevTotal = prevIncome?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
            
            // Calculate percentage change
            let percentChange = 0;
            if (prevTotal > 0) {
                percentChange = ((currentTotal - prevTotal) / prevTotal) * 100;
            } else if (currentTotal > 0) {
                percentChange = 100;
            }
            
            const changeEl = document.getElementById('income-change');
            if (changeEl) {
                changeEl.textContent = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
                changeEl.className = `stat-change ${percentChange >= 0 ? 'positive' : 'negative'}`;
                changeEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${percentChange >= 0 ? 'M7 17l9.2-9.2M17 17V7H7' : 'M17 7l-9.2 9.2M7 7v10h10'}"/>
                    </svg>
                    ${percentChange >= 0 ? 'lebih tinggi' : 'lebih rendah'} dari bulan lalu
                `;
            }
            
        } catch (error) {
            console.error('Error loading comparison:', error);
        }
    }
    
    /**
     * Load recent invoices
     */
    async function loadRecentInvoices() {
        const user = App.getUser();
        if (!user) return;
        
        const container = document.getElementById('recent-invoices-list');
        if (!container) return;
        
        try {
            const { data: invoices } = await window.supabaseConfig.db
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (invoices && invoices.length > 0) {
                container.innerHTML = invoices.map(invoice => `
                    <div class="table-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
                        <div>
                            <div style="font-weight: 500; color: #111827;">${invoice.invoice_number}</div>
                            <div style="font-size: 0.875rem; color: #6B7280;">${invoice.client_name}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; color: #111827;">${App.formatCurrency(invoice.total)}</div>
                            <span class="badge badge-${getStatusColor(invoice.status)}">${getStatusText(invoice.status)}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 40px 20px;">
                        <p class="text-muted">Belum ada invoice</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error loading recent invoices:', error);
        }
    }
    
    /**
     * Load recent transactions
     */
    async function loadRecentTransactions() {
        const user = App.getUser();
        if (!user) return;
        
        const container = document.getElementById('recent-transactions-list');
        if (!container) return;
        
        try {
            const { data: transactions } = await window.supabaseConfig.db
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (transactions && transactions.length > 0) {
                container.innerHTML = transactions.map(tx => `
                    <div class="table-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${tx.type === 'income' ? '#D1FAE5' : '#FEE2E2'}; display: flex; align-items: center; justify-content: center;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="${tx.type === 'income' ? '#10B981' : '#EF4444'}">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tx.type === 'income' ? 'M12 4v16m8-8H4' : 'M12 4v16m0 0l-8-8m8 8l8-8'}"/>
                                </svg>
                            </div>
                            <div>
                                <div style="font-weight: 500; color: #111827;">${tx.description || tx.category}</div>
                                <div style="font-size: 0.875rem; color: #6B7280;">${App.formatDate(tx.transaction_date)}</div>
                            </div>
                        </div>
                        <div style="font-weight: 600; color: ${tx.type === 'income' ? '#10B981' : '#EF4444'};">
                            ${tx.type === 'income' ? '+' : '-'}${App.formatCurrency(tx.amount)}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 40px 20px;">
                        <p class="text-muted">Belum ada transaksi</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error loading recent transactions:', error);
        }
    }
    
    /**
     * Load pending invoices for alerts
     */
    async function loadPendingInvoices() {
        const user = App.getUser();
        if (!user) return;
        
        try {
            const { data: invoices } = await window.supabaseConfig.db
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .lte('due_date', new Date().toISOString());
            
            if (invoices && invoices.length > 0) {
                // Create notification for overdue invoices
                const message = `${invoices.length} invoice sudah melewati tanggal jatuh tempo`;
                App.showToast('warning', 'Invoice Overdue', message);
            }
            
        } catch (error) {
            console.error('Error loading pending invoices:', error);
        }
    }
    
    /**
     * Initialize charts
     */
    function initCharts() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }
        
        // Monthly comparison chart
        const comparisonCtx = document.getElementById('comparison-chart');
        if (comparisonCtx) {
            loadChartData(comparisonCtx);
        }
    }
    
    /**
     * Load chart data
     */
    async function loadChartData(ctx) {
        const user = App.getUser();
        if (!user) return;
        
        // Get last 6 months data
        const months = [];
        const incomeData = [];
        const expenseData = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
            
            months.push(date.toLocaleDateString('id-ID', { month: 'short' }));
            
            try {
                const { data: income } = await window.supabaseConfig.db
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', user.id)
                    .eq('type', 'income')
                    .gte('transaction_date', start)
                    .lte('transaction_date', end);
                
                const { data: expense } = await window.supabaseConfig.db
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', user.id)
                    .eq('type', 'expense')
                    .gte('transaction_date', start)
                    .lte('transaction_date', end);
                
                incomeData.push(income?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0);
                expenseData.push(expense?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0);
                
            } catch (error) {
                console.error('Error loading chart data:', error);
                incomeData.push(0);
                expenseData.push(0);
            }
        }
        
        // Create chart
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: incomeData,
                        backgroundColor: '#10B981',
                        borderRadius: 4
                    },
                    {
                        label: 'Pengeluaran',
                        data: expenseData,
                        backgroundColor: '#EF4444',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Get status color class
     */
    function getStatusColor(status) {
        const colors = {
            pending: 'warning',
            sent: 'info',
            paid: 'success'
        };
        return colors[status] || 'secondary';
    }
    
    /**
     * Get status text
     */
    function getStatusText(status) {
        const texts = {
            pending: 'Tertunda',
            sent: 'Terkirim',
            paid: 'Lunas'
        };
        return texts[status] || status;
    }
    
    // Public API
    return {
        init
    };
})();
