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
        margin: 15, // mm
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

    // Colors
    const colors = {
        primary: '#2F80ED',
        text: '#333',
        border: '#4A90E2',
        secondary: '#777'
    };

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
     * Generate PDF HTML from invoice data
     * @param {Object} invoice - Invoice data object
     * @returns {string} - HTML string for PDF
     */
    function generatePDFHTML(invoice) {
        const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
        const taxRate = invoice.tax || 11;
        const tax = Math.round(subtotal * (taxRate / 100));
        const total = subtotal + tax;

        // Generate items rows
        const itemsRows = items.map((item, index) => {
            const isSubItem = item.is_subitem === true || item.is_subitem === 'true';
            return `
                <tr class="item-row ${isSubItem ? 'sub-item' : ''}">
                    <td class="col-desc">${isSubItem ? '&nbsp;&nbsp;&nbsp;' : ''}${item.description || ''}</td>
                    <td class="col-qty">${item.quantity || 0}</td>
                    <td class="col-price">${formatCurrency(item.unit_price || 0)}</td>
                    <td class="col-total">${formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
                </tr>
            `;
        }).join('');

        // Generate "Say" box (Terbilang)
        const sayText = numberToWords(Math.round(total)) + ' Rupiah';

        // Current date for invoice
        const invoiceDate = invoice.created_at ? formatDate(invoice.created_at) : formatDate(new Date().toISOString());

        return `
        <div id="invoicePDF" class="invoice-pdf">
            <!-- Decorative background shapes -->
            <div class="bg-shape bg-shape-left"></div>
            <div class="bg-shape bg-shape-right"></div>

            <!-- Header Section -->
            <div class="pdf-header">
                <div class="header-top">
                    <div class="company-info-left">
                        <h1 class="company-name">Finance System</h1>
                        <p class="company-address">Jl. Keuangan No. 123, Jakarta Selatan<br>DKI Jakarta 12345, Indonesia</p>
                    </div>
                    <div class="company-logo-right">
                        <img src="assets/img/logo.png" alt="Logo">
                    </div>
                </div>
                <hr class="header-divider">
            </div>

            <!-- Invoice Title Section -->
            <div class="invoice-title-section">
                <h2 class="invoice-main-title">INVOICE</h2>
                <p class="invoice-date">${invoiceDate}</p>
            </div>

            <!-- Client Info Section -->
            <div class="client-info-section">
                <div class="client-info-left">
                    <p class="client-label">Invoice To</p>
                    <p class="client-name">${invoice.client_name || '-'}</p>
                    <p class="client-address">${invoice.client_address || '-'}</p>
                </div>
                <div class="client-info-right">
                    <div class="meta-row">
                        <p class="client-label">Invoice Date</p>
                        <p class="meta-value">${invoiceDate}</p>
                    </div>
                    <div class="meta-row">
                        <p class="client-label">Invoice Number</p>
                        <p class="meta-value">${invoice.invoice_number || '-'}</p>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="col-desc">Description</th>
                        <th class="col-qty">Qty</th>
                        <th class="col-price">Unit Price</th>
                        <th class="col-total">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <!-- Totals Section -->
            <div class="totals-section">
                <div class="totals-right">
                    <div class="total-row subtotal">
                        <span class="total-label">Subtotal</span>
                        <span class="total-value">${formatCurrency(subtotal)}</span>
                    </div>
                    <div class="total-row ppn">
                        <span class="total-label">PPN ${taxRate}%</span>
                        <span class="total-value">${formatCurrency(tax)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span class="total-label bold">Grand Total</span>
                        <span class="total-value grand">${formatCurrency(total)}</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Section -->
            <div class="bottom-section">
                <div class="say-box-section">
                    <div class="say-box">
                        <p class="say-label">Terbilang</p>
                        <p class="say-text">${sayText}</p>
                    </div>
                    <div class="bank-box">
                        <p class="bank-info">
                            <span class="bank-name">${invoice.bank_name || 'Bank BCA'}</span><br>
                            Account Holder: ${invoice.account_holder || 'Finance System'}<br>
                            Account Number: ${invoice.account_number || '1234567890'}
                        </p>
                    </div>
                </div>
                <div class="signature-box">
                    <p class="signature-company">Finance System</p>
                    <div class="signature-image"></div>
                    <div class="signature-line"></div>
                    <p class="signature-name">Arief Chan</p>
                    <p class="signature-title">Director</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="pdf-footer">
                <p class="footer-text">finance@system.com | www.financesystem.com</p>
            </div>
        </div>
        `;
    }

    /**
     * Preview PDF in modal
     */
    async function preview(invoice) {
        if (!invoice) {
            console.error('Invoice data is null or undefined');
            return;
        }
        
        // Store current invoice for download/print buttons
        window.currentPreviewInvoice = invoice;
        
        const html = generatePDFHTML(invoice);
        
        // Show in modal
        const modal = document.getElementById('pdf-preview-modal');
        const content = document.getElementById('pdf-preview-content');
        content.innerHTML = html;
        modal.classList.add('active');
    }

    /**
     * Download PDF file using html2pdf.js
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
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);

        try {
            const element = container.querySelector('#invoicePDF');
            
            // Use html2pdf.js for high-quality PDF generation
            const opt = {
                margin: [15, 15, 15, 15], // mm
                filename: `invoice-${invoice.invoice_number || 'export'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
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
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        } finally {
            document.body.removeChild(container);
        }
    }

    /**
     * Print PDF using browser print
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
                <link rel="stylesheet" href="assets/css/pdf-print.css">
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 300);
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
