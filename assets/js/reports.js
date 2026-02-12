/**
 * Reports Module
 * Handles report generation and export functionality
 */

const Reports = (function() {
    // State
    let reportData = [];
    let currentReportType = 'finance';
    
    /**
     * Initialize reports module
     */
    function init() {
        console.log('Initializing Reports module...');
        cacheElements();
        setupEventListeners();
        loadDefaultReport();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            reportType: document.getElementById('report-type'),
            dateFrom: document.getElementById('date-from'),
            dateTo: document.getElementById('date-to'),
            monthFilter: document.getElementById('month-filter'),
            yearFilter: document.getElementById('year-filter'),
            generateBtn: document.getElementById('generate-btn'),
            exportPdfBtn: document.getElementById('export-pdf-btn'),
            exportExcelBtn: document.getElementById('export-excel-btn'),
            reportContent: document.getElementById('report-content'),
            reportSummary: document.getElementById('report-summary')
        };
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Report type change
        if (elements.reportType) {
            elements.reportType.addEventListener('change', handleReportTypeChange);
        }
        
        // Generate report
        if (elements.generateBtn) {
            elements.generateBtn.addEventListener('click', generateReport);
        }
        
        // Export buttons
        if (elements.exportPdfBtn) {
            elements.exportPdfBtn.addEventListener('click', () => exportReport('pdf'));
        }
        
        if (elements.exportExcelBtn) {
            elements.exportExcelBtn.addEventListener('click', () => exportReport('excel'));
        }
        
        // Set default date range
        setDefaultDateRange();
    }
    
    /**
     * Set default date range (current month)
     */
    function setDefaultDateRange() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        if (elements.dateFrom) {
            elements.dateFrom.value = firstDay.toISOString().split('T')[0];
        }
        if (elements.dateTo) {
            elements.dateTo.value = lastDay.toISOString().split('T')[0];
        }
    }
    
    /**
     * Handle report type change
     */
    function handleReportTypeChange() {
        currentReportType = elements.reportType.value;
        generateReport();
    }
    
    /**
     * Load default report
     */
    function loadDefaultReport() {
        generateReport();
    }
    
    /**
     * Generate report based on filters
     */
    async function generateReport() {
        const user = App.getUser();
        if (!user) return;
        
        const type = elements.reportType?.value || 'finance';
        const dateFrom = elements.dateFrom?.value;
        const dateTo = elements.dateTo?.value;
        
        App.showLoading('Membuat laporan...');
        
        try {
            let data = [];
            
            switch (type) {
                case 'finance':
                    data = await generateFinanceReport(user, dateFrom, dateTo);
                    break;
                case 'invoice':
                    data = await generateInvoiceReport(user, dateFrom, dateTo);
                    break;
                case 'recon':
                    data = await generateReconReport(user, dateFrom, dateTo);
                    break;
                default:
                    data = await generateFinanceReport(user, dateFrom, dateTo);
            }
            
            reportData = data;
            renderReport(data, type);
            
        } catch (error) {
            console.error('Error generating report:', error);
            App.showToast('error', 'Error', 'Gagal membuat laporan');
        } finally {
            App.hideLoading();
        }
    }
    
    /**
     * Generate finance report
     */
    async function generateFinanceReport(user, dateFrom, dateTo) {
        const { data: transactions } = await window.supabaseConfig.db
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo)
            .order('transaction_date', { ascending: false });
        
        return transactions || [];
    }
    
    /**
     * Generate invoice report
     */
    async function generateInvoiceReport(user, dateFrom, dateTo) {
        const { data: invoices } = await window.supabaseConfig.db
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', new Date(dateFrom).toISOString())
            .lte('created_at', new Date(dateTo).toISOString())
            .order('created_at', { ascending: false });
        
        return invoices || [];
    }
    
    /**
     * Generate reconciliation report
     */
    async function generateReconReport(user, dateFrom, dateTo) {
        const { data: recon } = await window.supabaseConfig.db
            .from('reconciliations')
            .select('*')
            .eq('user_id', user.id)
            .gte('recon_date', dateFrom)
            .lte('recon_date', dateTo)
            .order('recon_date', { ascending: false });
        
        return recon || [];
    }
    
    /**
     * Render report
     */
    function renderReport(data, type) {
        if (!elements.reportContent) return;
        
        if (data.length === 0) {
            elements.reportContent.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" style="margin-bottom: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-muted">Tidak ada data untuk periode ini</p>
                </div>
            `;
            if (elements.reportSummary) elements.reportSummary.innerHTML = '';
            return;
        }
        
        // Calculate summary
        const summary = calculateSummary(data, type);
        renderSummary(summary, type);
        
        // Render table
        let tableHtml = '';
        
        switch (type) {
            case 'finance':
                tableHtml = renderFinanceTable(data);
                break;
            case 'invoice':
                tableHtml = renderInvoiceTable(data);
                break;
            case 'recon':
                tableHtml = renderReconTable(data);
                break;
        }
        
        elements.reportContent.innerHTML = `
            <div class="table-container">
                <table class="table" id="report-table">
                    ${tableHtml}
                </table>
            </div>
        `;
    }
    
    /**
     * Calculate summary
     */
    function calculateSummary(data, type) {
        let summary = {};
        
        switch (type) {
            case 'finance':
                const income = data.filter(d => d.type === 'income').reduce((sum, d) => sum + (d.amount || 0), 0);
                const expense = data.filter(d => d.type === 'expense').reduce((sum, d) => sum + (d.amount || 0), 0);
                summary = { income, expense, balance: income - expense };
                break;
            case 'invoice':
                const totalInvoiced = data.reduce((sum, d) => sum + (d.total || 0), 0);
                const paidInvoices = data.filter(d => d.status === 'paid').reduce((sum, d) => sum + (d.total || 0), 0);
                const pendingInvoices = data.filter(d => d.status !== 'paid').reduce((sum, d) => sum + (d.total || 0), 0);
                summary = { totalInvoiced, paidInvoices, pendingInvoices, count: data.length };
                break;
            case 'recon':
                const matched = data.filter(d => d.status === 'matched').length;
                const unmatched = data.filter(d => d.status !== 'matched').length;
                const totalDifference = data.filter(d => d.status !== 'matched').reduce((sum, d) => sum + Math.abs(d.difference || 0), 0);
                summary = { matched, unmatched, totalDifference, count: data.length };
                break;
        }
        
        return summary;
    }
    
    /**
     * Render summary
     */
    function renderSummary(summary, type) {
        if (!elements.reportSummary) return;
        
        let html = '';
        
        switch (type) {
            case 'finance':
                html = `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Total Pemasukan</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10B981;">${App.formatCurrency(summary.income)}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Total Pengeluaran</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #EF4444;">${App.formatCurrency(summary.expense)}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Saldo</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${summary.balance >= 0 ? '#10B981' : '#EF4444'};">${App.formatCurrency(summary.balance)}</div>
                        </div>
                    </div>
                `;
                break;
            case 'invoice':
                html = `
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Total Invoice</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">${summary.count}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Total Ditagihkan</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #4F46E5;">${App.formatCurrency(summary.totalInvoiced)}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Sudah Dibayar</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10B981;">${App.formatCurrency(summary.paidInvoices)}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Belum Dibayar</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #F59E0B;">${App.formatCurrency(summary.pendingInvoices)}</div>
                        </div>
                    </div>
                `;
                break;
            case 'recon':
                html = `
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Total Data</div>
                            <div style="font-size: 1.5rem; font-weight: 700;">${summary.count}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Cocok</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10B981;">${summary.matched}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Tidak Cocok</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #EF4444;">${summary.unmatched}</div>
                        </div>
                        <div class="card" style="padding: 16px;">
                            <div style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Total Selisih</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #EF4444;">${App.formatCurrency(summary.totalDifference)}</div>
                        </div>
                    </div>
                `;
                break;
        }
        
        elements.reportSummary.innerHTML = html;
    }
    
    /**
     * Render finance table
     */
    function renderFinanceTable(data) {
        return `
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th style="text-align: right;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(tx => `
                    <tr>
                        <td>${App.formatDate(tx.transaction_date)}</td>
                        <td><span class="badge badge-${tx.type === 'income' ? 'success' : 'danger'}">${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
                        <td>${tx.category || '-'}</td>
                        <td>${tx.description || '-'}</td>
                        <td style="text-align: right; font-weight: 600; color: ${tx.type === 'income' ? '#10B981' : '#EF4444'};">
                            ${tx.type === 'income' ? '+' : '-'}${App.formatCurrency(tx.amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }
    
    /**
     * Render invoice table
     */
    function renderInvoiceTable(data) {
        return `
            <thead>
                <tr>
                    <th>No. Invoice</th>
                    <th>Mitra</th>
                    <th>Tanggal</th>
                    <th>Jatuh Tempo</th>
                    <th style="text-align: right;">Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(inv => `
                    <tr>
                        <td>${inv.invoice_number}</td>
                        <td>${inv.client_name}</td>
                        <td>${App.formatDate(inv.created_at)}</td>
                        <td>${inv.due_date ? App.formatDate(inv.due_date) : '-'}</td>
                        <td style="text-align: right; font-weight: 600;">${App.formatCurrency(inv.total)}</td>
                        <td><span class="badge badge-${getInvoiceStatusColor(inv.status)}">${getInvoiceStatusText(inv.status)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }
    
    /**
     * Render reconciliation table
     */
    function renderReconTable(data) {
        return `
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Kode Mitra</th>
                    <th>PDAM</th>
                    <th>Pelanggan</th>
                    <th style="text-align: right;">Tagihan</th>
                    <th>Status</th>
                    <th style="text-align: right;">Selisih</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(recon => `
                    <tr>
                        <td>${App.formatDate(recon.recon_date)}</td>
                        <td>${recon.partner_code || '-'}</td>
                        <td>${recon.pdam_code || '-'}</td>
                        <td>${recon.customer_name}</td>
                        <td style="text-align: right;">${App.formatCurrency(recon.total_bill)}</td>
                        <td><span class="badge badge-${getReconStatusColor(recon.status)}">${getReconStatusText(recon.status)}</span></td>
                        <td style="text-align: right; font-weight: 600; color: ${recon.difference !== 0 ? '#EF4444' : '#10B981'};">
                            ${recon.difference !== 0 ? App.formatCurrency(recon.difference) : '-'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }
    
    /**
     * Export report
     */
    function exportReport(format) {
        if (reportData.length === 0) {
            App.showToast('error', 'Error', 'Tidak ada data untuk diekspor');
            return;
        }
        
        const type = elements.reportType?.value || 'finance';
        const dateFrom = elements.dateFrom?.value || '';
        const dateTo = elements.dateTo?.value || '';
        
        if (format === 'excel') {
            exportToExcel(reportData, type, dateFrom, dateTo);
        } else if (format === 'pdf') {
            exportToPdf(reportData, type, dateFrom, dateTo);
        }
    }
    
    /**
     * Export to Excel
     */
    function exportToExcel(data, type, dateFrom, dateTo) {
        // Check if SheetJS is available
        if (typeof XLSX === 'undefined') {
            App.showToast('error', 'Error', 'Library SheetJS tidak tersedia');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        
        // Prepare data based on type
        let wsData = [];
        let sheetName = '';
        
        switch (type) {
            case 'finance':
                sheetName = 'Laporan Keuangan';
                wsData = [
                    ['LAPORAN KEUANGAN'],
                    [`Periode: ${dateFrom} s/d ${dateTo}`],
                    [''],
                    ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah'],
                    ...data.map(tx => [
                        tx.transaction_date,
                        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                        tx.category || '',
                        tx.description || '',
                        tx.amount
                    ])
                ];
                break;
            case 'invoice':
                sheetName = 'Laporan Invoice';
                wsData = [
                    ['LAPORAN INVOICE'],
                    [`Periode: ${dateFrom} s/d ${dateTo}`],
                    [''],
                    ['No. Invoice', 'Mitra', 'Tanggal', 'Jatuh Tempo', 'Total', 'Status'],
                    ...data.map(inv => [
                        inv.invoice_number,
                        inv.client_name,
                        inv.created_at,
                        inv.due_date || '',
                        inv.total,
                        inv.status
                    ])
                ];
                break;
            case 'recon':
                sheetName = 'Laporan Rekonsiliasi';
                wsData = [
                    ['LAPORAN REKONSILIASI'],
                    [`Periode: ${dateFrom} s/d ${dateTo}`],
                    [''],
                    ['Tanggal', 'Kode Mitra', 'PDAM', 'Pelanggan', 'Tagihan', 'Status', 'Selisih'],
                    ...data.map(recon => [
                        recon.recon_date,
                        recon.partner_code || '',
                        recon.pdam_code || '',
                        recon.customer_name,
                        recon.total_bill,
                        recon.status,
                        recon.difference
                    ])
                ];
                break;
        }
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // Download
        const filename = `laporan_${type}_${dateFrom}_${dateTo}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        App.showToast('success', 'Berhasil', 'Laporan berhasil diekspor ke Excel');
    }
    
    /**
     * Export to PDF
     */
    function exportToPdf(data, type, dateFrom, dateTo) {
        // Check if jsPDF is available
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            App.showToast('error', 'Error', 'Library jsPDF tidak tersedia');
            return;
        }
        
        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(18);
        doc.text(`LAPORAN ${type.toUpperCase()}`, 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 105, 30, { align: 'center' });
        
        // Table data
        let headers = [];
        let rows = [];
        
        switch (type) {
            case 'finance':
                headers = ['Tanggal', 'Jenis', 'Kategori', 'Jumlah'];
                rows = data.map(tx => [
                    tx.transaction_date,
                    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                    tx.category || '',
                    App.formatCurrency(tx.amount)
                ]);
                break;
            case 'invoice':
                headers = ['No. Invoice', 'Mitra', 'Total', 'Status'];
                rows = data.map(inv => [
                    inv.invoice_number,
                    inv.client_name,
                    App.formatCurrency(inv.total),
                    inv.status
                ]);
                break;
            case 'recon':
                headers = ['Tanggal', 'Pelanggan', 'Tagihan', 'Status', 'Selisih'];
                rows = data.map(recon => [
                    recon.recon_date,
                    recon.customer_name,
                    App.formatCurrency(recon.total_bill),
                    recon.status,
                    recon.difference !== 0 ? App.formatCurrency(recon.difference) : '-'
                ]);
                break;
        }
        
        // Draw table
        let y = 40;
        const cellWidth = 180 / headers.length;
        const cellHeight = 10;
        
        // Headers
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        headers.forEach((header, i) => {
            doc.text(header, 15 + (i * cellWidth), y);
        });
        
        // Draw line
        y += 5;
        doc.line(15, y, 195, y);
        y += 5;
        
        // Rows
        doc.setFont(undefined, 'normal');
        rows.forEach(row => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            row.forEach((cell, i) => {
                doc.text(String(cell), 15 + (i * cellWidth), y);
            });
            y += cellHeight;
        });
        
        // Save
        const filename = `laporan_${type}_${dateFrom}_${dateTo}.pdf`;
        doc.save(filename);
        
        App.showToast('success', 'Berhasil', 'Laporan berhasil diekspor ke PDF');
    }
    
    /**
     * Get invoice status color
     */
    function getInvoiceStatusColor(status) {
        const colors = { pending: 'warning', sent: 'info', paid: 'success' };
        return colors[status] || 'secondary';
    }
    
    /**
     * Get invoice status text
     */
    function getInvoiceStatusText(status) {
        const texts = { pending: 'Tertunda', sent: 'Terkirim', paid: 'Lunas' };
        return texts[status] || status;
    }
    
    /**
     * Get recon status color
     */
    function getReconStatusColor(status) {
        const colors = { pending: 'warning', matched: 'success', unmatched: 'danger' };
        return colors[status] || 'secondary';
    }
    
    /**
     * Get recon status text
     */
    function getReconStatusText(status) {
        const texts = { pending: 'Menunggu', matched: 'Cocok', unmatched: 'Tidak Cocok' };
        return texts[status] || status;
    }
    
    // Public API
    return {
        init
    };
})();
