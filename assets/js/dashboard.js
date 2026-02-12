/**
 * Dashboard Module
 * Handles dashboard page functionality and data display
 */

const Dashboard = (function() {
    // State
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedYear = ''; // Empty means all years
    
    /**
     * Initialize dashboard
     */
    async function init() {
        console.log('Initializing Dashboard...');
        
        // Ensure user record exists before loading data
        const userCheck = await window.supabaseConfig.userHelpers.ensureUserExists();
        if (userCheck && userCheck.error) {
            console.warn('User check warning:', userCheck.error);
        }
        
        await initYearFilter();
        await loadDashboardData();
    }
    
    /**
     * Initialize year filter dropdown
     */
    async function initYearFilter() {
        const yearSelect = document.getElementById('year-filter');
        if (!yearSelect) return;
        
        // Get available years from data
        const years = await getAvailableYears();
        
        // Populate dropdown
        yearSelect.innerHTML = '<option value="">Semua Tahun</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        });
        
        // Set selected year to current year by default
        selectedYear = currentYear.toString();
        
        // Add event listener
        yearSelect.addEventListener('change', (e) => {
            selectedYear = e.target.value;
            loadDashboardData();
        });
    }
    
    /**
     * Get available years from transactions and invoices
     */
    async function getAvailableYears() {
        const user = App.getUser();
        if (!user) return [new Date().getFullYear()];
        
        try {
            // Get years from transactions
            const { data: transactions } = await window.supabaseConfig.db
                .from('transactions')
                .select('transaction_date')
                .eq('user_id', user.id);
            
            // Get years from invoices
            const { data: invoices } = await window.supabaseConfig.db
                .from('invoices')
                .select('created_at')
                .eq('user_id', user.id);
            
            const years = new Set();
            years.add(new Date().getFullYear()); // Always include current year
            
            transactions?.forEach(t => {
                if (t.transaction_date) {
                    years.add(new Date(t.transaction_date).getFullYear());
                }
            });
            
            invoices?.forEach(i => {
                if (i.created_at) {
                    years.add(new Date(i.created_at).getFullYear());
                }
            });
            
            return Array.from(years).sort((a, b) => b - a); // Sort descending
        } catch (error) {
            console.error('Error getting available years:', error);
            return [new Date().getFullYear()];
        }
    }
    
    /**
     * Get date range based on selected year
     */
    function getYearDateRange() {
        if (!selectedYear) {
            // All years - return very wide range
            return {
                start: '2020-01-01',
                end: '2030-12-31'
            };
        }
        const year = parseInt(selectedYear);
        return {
            start: `${year}-01-01`,
            end: `${year}-12-31`
        };
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
        
        const yearRange = getYearDateRange();
        
        // If no year selected, show all time stats without date filter
        const incomeQuery = window.supabaseConfig.db
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'income');
        
        const expenseQuery = window.supabaseConfig.db
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'expense');
        
        // Add year filter if selected
        if (selectedYear) {
            incomeQuery.gte('transaction_date', yearRange.start);
            incomeQuery.lte('transaction_date', yearRange.end);
            expenseQuery.gte('transaction_date', yearRange.start);
            expenseQuery.lte('transaction_date', yearRange.end);
        }
        
        try {
            // Get yearly income
            const { data: incomeData } = await incomeQuery;
            
            // Get yearly expenses
            const { data: expenseData } = await expenseQuery;
            
            // Get invoice counts with year filter
            const invoiceQuery = window.supabaseConfig.db
                .from('invoices')
                .select('status', { count: 'exact', head: true })
                .eq('user_id', user.id);
            
            const pendingQuery = window.supabaseConfig.db
                .from('invoices')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'pending');
            
            if (selectedYear) {
                invoiceQuery.gte('created_at', yearRange.start);
                invoiceQuery.lte('created_at', yearRange.end);
                pendingQuery.gte('created_at', yearRange.start);
                pendingQuery.lte('created_at', yearRange.end);
            }
            
            // Get invoice counts
            const { data: invoiceCounts } = await invoiceQuery;
            
            // Get pending invoice count
            const { data: pendingInvoices } = await pendingQuery;
            
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
        
        // If no year selected, skip comparison (show all time)
        if (!selectedYear) {
            const changeEl = document.getElementById('income-change');
            if (changeEl) {
                changeEl.textContent = 'Semua Waktu';
                changeEl.className = 'stat-change';
                changeEl.innerHTML = `Data dari semua tahun`;
            }
            return;
        }
        
        const year = parseInt(selectedYear);
        
        // Current month in selected year
        const currentStart = new Date(year, currentMonth, 1).toISOString();
        const currentEnd = new Date(year, currentMonth + 1, 0).toISOString();
        
        // Same month in previous year
        const prevStart = new Date(year - 1, currentMonth, 1).toISOString();
        const prevEnd = new Date(year - 1, currentMonth + 1, 0).toISOString();
        
        try {
            // Current month income
            const { data: currentIncome } = await window.supabaseConfig.db
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'income')
                .gte('transaction_date', currentStart)
                .lte('transaction_date', currentEnd);
            
            // Previous year same month income
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
                    ${percentChange >= 0 ? 'lebih tinggi' : 'lebih rendah'} dari ${year - 1}
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
            const query = window.supabaseConfig.db
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            // Add year filter if selected
            if (selectedYear) {
                const yearRange = getYearDateRange();
                query.gte('created_at', yearRange.start);
                query.lte('created_at', yearRange.end);
            }
            
            const { data: invoices } = await query;
            
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
            const query = window.supabaseConfig.db
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            // Add year filter if selected
            if (selectedYear) {
                const yearRange = getYearDateRange();
                query.gte('transaction_date', yearRange.start);
                query.lte('transaction_date', yearRange.end);
            }
            
            const { data: transactions } = await query;
            
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
            const query = window.supabaseConfig.db
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .lte('due_date', new Date().toISOString());
            
            // Add year filter if selected
            if (selectedYear) {
                const yearRange = getYearDateRange();
                query.gte('created_at', yearRange.start);
                query.lte('created_at', yearRange.end);
            }
            
            const { data: invoices } = await query;
            
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
        
        const months = [];
        const incomeData = [];
        const expenseData = [];
        
        if (selectedYear) {
            // Show all 12 months of selected year
            const year = parseInt(selectedYear);
            for (let i = 0; i < 12; i++) {
                const date = new Date(year, i, 1);
                const start = new Date(year, i, 1).toISOString();
                const end = new Date(year, i + 1, 0).toISOString();
                
                months.push(date.toLocaleDateString('id-ID', { month: 'long' }));
                
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
        } else {
            // Show last 6 months from current date
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentYear, currentMonth - i, 1);
                const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
                const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
                
                months.push(date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
                
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
