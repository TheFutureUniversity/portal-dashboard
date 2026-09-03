'use client';

import { useEffect, useMemo, useState } from 'react';

type Invoice = {
  serial: number;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  product: string;
  productType: string;
  date: string;
  amount: number;
};

const customers = [
  ['CUS-10482', 'Aarav Mehta'], ['CUS-10481', 'Riya Sharma'],
  ['CUS-10480', 'Kabir Khanna'], ['CUS-10479', 'Meera Iyer'],
  ['CUS-10478', 'Vihaan Shah'], ['CUS-10477', 'Ananya Rao'],
  ['CUS-10476', 'Arjun Nair'], ['CUS-10475', 'Diya Kapoor'],
  ['CUS-10474', 'Aditya Joshi'], ['CUS-10473', 'Sara Verma'],
];

const products = [
  ['Swing Trading Bootcamp', 'LIVE Learning Course'],
  ['Options Strategy eBook', 'eBooks'],
  ['Trading Desk Journal', 'Physical Products'],
  ['Emerald Focus Stone', 'Semi Precious Gemstones'],
  ['Momentum Trading Masterclass', 'LIVE Learning Course'],
  ['Price Action Playbook', 'eBooks'],
  ['Market Discipline Planner', 'Physical Products'],
  ['Amethyst Clarity Stone', 'Semi Precious Gemstones'],
  ['Technical Analysis Intensive', 'LIVE Learning Course'],
  ['Trading Psychology Guide', 'eBooks'],
];

const amounts = [14999, 1499, 2899, 4599, 9999, 899, 1899, 3299, 11999, 1199];

const invoices: Invoice[] = Array.from({ length: 200 }, (_, index) => {
  const customer = customers[index % customers.length];
  const product = products[index % products.length];
  const purchaseDate = new Date(Date.UTC(2026, 7, 28 - index));
  return {
    serial: index + 1,
    invoiceNumber: `GST-2026-${String(482 - index).padStart(5, '0')}`,
    customerId: customer[0],
    customerName: customer[1],
    product: product[0],
    productType: product[1],
    date: purchaseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    amount: amounts[index % amounts.length],
  };
});

const PAGE_SIZE = 10;
const TOTAL_PAGES = 20;
const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function visiblePages(current: number) {
  if (current <= 3) return [1, 2, 3, 4, 'dots', 20];
  if (current >= 18) return [1, 'dots', 17, 18, 19, 20];
  return [1, 'dots', current - 1, current, current + 1, 'dots-end', 20];
}

export default function Home() {
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [notice, setNotice] = useState('');
  const pageInvoices = useMemo(() => invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page]);

  useEffect(() => {
    if (!preview) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setPreview(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [preview]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const downloadInvoice = (invoice: Invoice) => {
    const taxable = Math.round(invoice.amount / 1.18);
    const gst = invoice.amount - taxable;
    const documentMarkup = `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title><style>body{font-family:Arial,sans-serif;color:#172033;max-width:760px;margin:50px auto;padding:0 30px}header{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:22px}h1{margin:0}.meta{margin:34px 0;line-height:1.8}.box{background:#f5f7fb;padding:22px;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:30px}th,td{text-align:left;padding:14px;border-bottom:1px solid #ddd}.totals{margin:28px 0 0 auto;width:290px}.totals p{display:flex;justify-content:space-between}.grand{font-weight:bold;font-size:18px;border-top:2px solid #172033;padding-top:14px}</style></head><body><header><div><h1>Tax Invoice</h1><p>GST Invoice Portal</p></div><strong>${invoice.invoiceNumber}</strong></header><div class="meta"><strong>Bill to</strong><br>${invoice.customerName}<br>Customer ID: ${invoice.customerId}<br>Date of purchase: ${invoice.date}</div><table><thead><tr><th>Product</th><th>Type</th><th>Amount</th></tr></thead><tbody><tr><td>${invoice.product}</td><td>${invoice.productType}</td><td>${formatCurrency(invoice.amount)}</td></tr></tbody></table><div class="totals"><p><span>Taxable value</span><span>${formatCurrency(taxable)}</span></p><p><span>GST (18%)</span><span>${formatCurrency(gst)}</span></p><p class="grand"><span>Total</span><span>${formatCurrency(invoice.amount)}</span></p></div></body></html>`;
    const blob = new Blob([documentMarkup], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${invoice.invoiceNumber} downloaded`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P</span><span>Portal</span></div>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#invoices"><span className="nav-icon" aria-hidden="true">▤</span>Invoices</a>
        </nav>
        <div className="sidebar-note"><span className="status-dot" />Records are up to date</div>
        <div className="sidebar-footer">
          <div className="avatar">AM</div>
          <div><strong>Arjun Mehta</strong><span>Administrator</span></div>
        </div>
      </aside>

      <section className="workspace" id="invoices">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">P</span>Portal</div>
          <div className="topbar-label">Invoice management</div>
          <button className="profile-button" type="button" aria-label="Account menu"><span>AM</span><b>Arjun Mehta</b><i>⌄</i></button>
        </header>

        <div className="content">
          <div className="page-heading">
            <div><p className="eyebrow">DOCUMENTS</p><h1>GST Invoices</h1><p>View and download customer purchase invoices.</p></div>
            <div className="invoice-count"><strong>200</strong><span>Total invoices</span></div>
          </div>

          <div className="table-card">
            <div className="table-title"><div><h2>All invoices</h2><p>Customer purchase and tax records</p></div><span><i />Updated today</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>SR No.</th><th>Customer</th><th>Product</th><th>Product type</th><th>Date of purchase</th><th>Amount</th><th>Actions</th></tr></thead>
                <tbody>
                  {pageInvoices.map((invoice) => (
                    <tr key={invoice.invoiceNumber}>
                      <td><span className="serial">{invoice.serial}</span></td>
                      <td><div className="customer"><strong>{invoice.customerId}</strong><span>{invoice.customerName}</span></div></td>
                      <td><div className="product"><strong>{invoice.product}</strong><span>{invoice.invoiceNumber}</span></div></td>
                      <td><span className={`type-pill type-${invoice.productType.split(' ')[0].toLowerCase()}`}>{invoice.productType}</span></td>
                      <td>{invoice.date}</td><td><strong className="amount">{formatCurrency(invoice.amount)}</strong></td>
                      <td><div className="actions"><button type="button" onClick={() => setPreview(invoice)}><span aria-hidden="true">◉</span>Preview</button><button type="button" onClick={() => downloadInvoice(invoice)} aria-label={`Download ${invoice.invoiceNumber}`} title="Download invoice"><span aria-hidden="true">↓</span></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <p>Showing <strong>{(page - 1) * 10 + 1}–{page * 10}</strong> of <strong>200</strong></p>
              <div className="page-controls" aria-label="Pagination">
                <button disabled={page === 1} onClick={() => changePage(page - 1)} aria-label="Previous page">‹</button>
                {visiblePages(page).map((item) => typeof item === 'string' ? <span key={item}>…</span> : <button key={item} className={page === item ? 'current' : ''} onClick={() => changePage(item)} aria-label={`Page ${item}`} aria-current={page === item ? 'page' : undefined}>{item}</button>)}
                <button disabled={page === TOTAL_PAGES} onClick={() => changePage(page + 1)} aria-label="Next page">›</button>
              </div>
            </div>
          </div>
          <p className="footnote">Amounts shown are inclusive of applicable GST.</p>
        </div>
      </section>

      {preview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPreview(null)}>
          <section className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
            <div className="modal-head"><div><span className="modal-kicker">TAX INVOICE</span><h2 id="invoice-title">{preview.invoiceNumber}</h2></div><button className="close-button" type="button" onClick={() => setPreview(null)} aria-label="Close invoice preview">×</button></div>
            <div className="invoice-paper">
              <div className="invoice-brand"><div className="brand-mark">P</div><div><strong>Portal Learning Pvt. Ltd.</strong><span>GSTIN: 27AABCP1234F1Z5</span></div><div className="paid-stamp">PAID</div></div>
              <div className="invoice-meta"><div><span>Bill to</span><strong>{preview.customerName}</strong><p>Customer ID: {preview.customerId}</p></div><div><span>Invoice date</span><strong>{preview.date}</strong><p>Place of supply: India</p></div></div>
              <div className="invoice-line"><div><span>Product</span><strong>{preview.product}</strong><small>{preview.productType}</small></div><strong>{formatCurrency(preview.amount)}</strong></div>
              <div className="invoice-totals"><p><span>Taxable value</span><strong>{formatCurrency(Math.round(preview.amount / 1.18))}</strong></p><p><span>GST (18%)</span><strong>{formatCurrency(preview.amount - Math.round(preview.amount / 1.18))}</strong></p><p className="grand-total"><span>Total paid</span><strong>{formatCurrency(preview.amount)}</strong></p></div>
              <p className="invoice-note">This is a computer-generated invoice and does not require a signature.</p>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setPreview(null)}>Close</button><button type="button" className="primary" onClick={() => downloadInvoice(preview)}><span aria-hidden="true">↓</span> Download invoice</button></div>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}
