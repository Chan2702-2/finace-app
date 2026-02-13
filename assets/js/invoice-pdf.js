/**
 * Invoice PDF Export Module
 * Export invoice to PDF with high-quality layout
 * Uses html2pdf.js, html2canvas, and jsPDF
 */

const InvoicePDF = (function() {
    // Configuration
    const config = {
        filename: 'invoice',
        format: 'a4',
        orientation: 'portrait',
        margin: [10, 10, 10, 15], // mm: [top, right, bottom, left]
        html2canvas: {
            scale: 3,
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    /**
     * Generate PDF from invoice data
     * @param {Object} invoice - Invoice data object
     * @returns {string} - HTML string for PDF
     */
    function generatePDFHTML(invoice) {
        const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
        const statusColors = {
            pending: '#F59E0B',
            sent: '#3B82F6',
            paid: '#10B981'
        };
        const statusTexts = {
            pending: 'Tertunda',
            sent: 'Terkirim',
            paid: 'Lunas'
        };

        // Generate items rows
        const itemsRows = items.map((item, index) => `
            <tr class="item-row">
                <td class="text-center">${index + 1}</td>
                <td>${item.description || ''}</td>
                <td class="text-center">${item.quantity || 0}</td>
                <td class="text-right">${formatCurrency(item.unit_price || 0)}</td>
                <td class="text-right">${formatCurrency(item.total || 0)}</td>
            </tr>
        `).join('');

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax = invoice.tax || 0;
        const discount = invoice.discount || 0;
        const total = subtotal + tax - discount;

        // Generate "Say" box (Terbilang)
        const sayText = numberToWords(Math.round(total)) + ' Rupiah';

        return `
        <div id="invoicePDF" class="invoice-pdf">
            <div class="pdf-header">
                <div class="company-info">
                    <img src="assets/img/logo.png" alt="Logo" class="company-logo">
                    <div class="company-details">
                        <h2 class="company-name">Finance System</h2>
                        <p class="company-tagline">Sistem Manajemen Keuangan</p>
                    </div>
                </div>
                <div class="invoice-title-block">
                    <h1 class="invoice-title">INVOICE</h1>
                    <div class="invoice-number">${invoice.invoice_number || ''}</div>
                </div>
            </div>

            <div class="invoice-meta">
                <div class="meta-left">
                    <div class="meta-section">
                        <h4 class="meta-label">Kepada:</h4>
                        <p class="meta-value strong">${invoice.client_name || ''}</p>
                        ${invoice.client_tax ? `<p class="meta-value">NPWP: ${invoice.client_tax}</p>` : ''}
                        <p class="meta-value">${invoice.client_address?.replace(/\n/g, '<br>') || ''}</p>
                        ${invoice.client_email ? `<p class="meta-value">${invoice.client_email}</p>` : ''}
                    </div>
                </div>
                <div class="meta-right">
                    <div class="meta-section text-right">
                        <div class="meta-row">
                            <span class="meta-label">Tanggal:</span>
                            <span class="meta-value">${formatDate(invoice.created_at)}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Jatuh Tempo:</span>
                            <span class="meta-value">${invoice.due_date ? formatDate(invoice.due_date) : '-'}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value">
                                <span class="status-badge" style="background: ${statusColors[invoice.status] || '#6B7280'}">${statusTexts[invoice.status] || 'Tertunda'}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="text-center" style="width: 40px;">No</th>
                        <th>Deskripsi</th>
                        <th class="text-center" style="width: 60px;">Qty</th>
                        <th class="text-right" style="width: 80px;">Harga</th>
                        <th class="text-right" style="width: 90px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div class="totals-section">
                <div class="totals-left">
                    <div class="say-box">
                        <h4 class="say-label">Terbilang:</h4>
                        <p class="say-text">${sayText}</p>
                    </div>
                    <div class="bank-box">
                        <h4 class="bank-label">Informasi Bank:</h4>
                        <p class="bank-text">Bank: BCA<br>No. Rek: 1234567890<br>a.n: Finance System</p>
                    </div>
                </div>
                <div class="totals-right">
                    <div class="total-row">
                        <span class="total-label">Subtotal:</span>
                        <span class="total-value">${formatCurrency(subtotal)}</span>
                    </div>
                    ${tax > 0 ? `
                    <div class="total-row">
                        <span class="total-label">Pajak:</span>
                        <span class="total-value">${formatCurrency(tax)}</span>
                    </div>
                    ` : ''}
                    ${discount > 0 ? `
                    <div class="total-row">
                        <span class="total-label">Diskon:</span>
                        <span class="total-value">-${formatCurrency(discount)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span class="total-label">TOTAL:</span>
                        <span class="total-value">${formatCurrency(total)}</span>
                    </div>
                </div>
            </div>

            <div class="signature-section">
                <div class="signature-box">
                    <p class="signature-label">Hormat kami,</p>
                    <div class="signature-space"></div>
                    <p class="signature-name">Finance System</p>
                </div>
                <div class="signature-box text-right">
                    <p class="signature-label">Penerima,</p>
                    <div class="signature-space"></div>
                    <p class="signature-name">${invoice.client_name || ''}</p>
                </div>
            </div>

            <div class="pdf-footer">
                <p class="footer-text">finance@system.com | www.financesystem.com</p>
            </div>

            <!-- Decorative background shapes -->
            <div class="bg-shape bg-shape-1"></div>
            <div class="bg-shape bg-shape-2"></div>
        </div>
        `;
    }

    /**
     * Format currency
     */
    function formatCurrency(amount) {
        return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
    }

    /**
     * Format date
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    /**
     * Convert number to Indonesian words
     */
    function numberToWords(num) {
        const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
        const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
        const scales = ['', 'ribu', 'juta', 'miliar', 'triliun'];

        if (num === 0) return 'nol';

        let words = '';
        let scaleIndex = 0;

        while (num > 0) {
            const chunk = num % 1000;
            if (chunk !== 0) {
                let chunkWords = '';
                const hundreds = Math.floor(chunk / 100);
                const remainder = chunk % 100;

                if (hundreds > 0) {
                    chunkWords += ones[hundreds] + ' ratus ';
                }

                if (remainder < 10) {
                    chunkWords += ones[remainder];
                } else if (remainder < 20) {
                    chunkWords += ones[remainder - 10] + ' belas';
                } else {
                    const tensDigit = Math.floor(remainder / 10);
                    const onesDigit = remainder % 10;
                    chunkWords += tens[tensDigit] + ' ' + ones[onesDigit];
                }

                if (scales[scaleIndex]) {
                    chunkWords += ' ' + scales[scaleIndex];
                }

                words = chunkWords + ' ' + words;
            }

            num = Math.floor(num / 1000);
            scaleIndex++;
        }

        return words.trim();
    }

    /**
     * Preview PDF in new window
     */
    async function preview(invoice) {
        if (!invoice) {
            console.error('Invoice data is null or undefined');
            return;
        }
        
        const html = generatePDFHTML(invoice);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice Preview</title>
                <link rel="stylesheet" href="assets/css/style.css">
                <link rel="stylesheet" href="assets/css/pdf-print.css">
            </head>
            <body onload="window.print()">
                ${html}
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Download PDF file
     */
    async function download(invoice) {
        if (!invoice) {
            console.error('Invoice data is null or undefined');
            return;
        }
        
        const html = generatePDFHTML(invoice);
        
        // Create temporary container
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm';
        document.body.appendChild(container);

        try {
            const element = container.querySelector('#invoicePDF');
            
            // Generate PDF using html2pdf
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            await pdf.html(element, {
                callback: function(doc) {
                    const filename = `${config.filename}-${invoice.invoice_number || 'export'}.pdf`;
                    doc.save(filename);
                },
                x: 0,
                y: 0,
                width: 210,
                windowWidth: 794, // A4 width in pixels at 96 DPI
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false
                }
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        } finally {
            document.body.removeChild(container);
        }
    }

    /**
     * Print PDF
     */
    async function print(invoice) {
        if (!invoice) {
            console.error('Invoice data is null or undefined');
            return;
        }
        
        const html = generatePDFHTML(invoice);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice Print</title>
                <link rel="stylesheet" href="assets/css/style.css">
                <link rel="stylesheet" href="assets/css/pdf-print.css">
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Export invoice data to PDF (convenience function)
     */
    async function exportInvoice(invoice, action = 'preview') {
        switch (action) {
            case 'preview':
                await preview(invoice);
                break;
            case 'download':
                await download(invoice);
                break;
            case 'print':
                await print(invoice);
                break;
            default:
                await preview(invoice);
        }
    }

    // Public API
    return {
        generatePDFHTML,
        preview,
        download,
        print,
        exportInvoice
    };
})();

// Make it globally available
window.InvoicePDF = InvoicePDF;
