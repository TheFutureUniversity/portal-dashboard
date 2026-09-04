'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type Invoice = {
  id: string;
  serialNumber: number;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  productName: string;
  productType: string;
  purchaseDate: string;
  amount: number;
  currency: string;
  status: string;
  previewAvailable?: boolean;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

const productTypeLabels: Record<string, string> = {
  LIVE_LEARNING_COURSE: 'LIVE Learning Course',
  EBOOK: 'eBooks',
  PHYSICAL_PRODUCT: 'Physical Products',
  SEMI_PRECIOUS_GEMSTONE: 'Semi Precious Gemstones',
};

const PAGE_SIZE = 10;

const emptyPagination: Pagination = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};

function apiUrl(path: string) {
  return `/api/v1${path}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function visiblePages(current: number, total: number) {
  if (total <= 6) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, 4, 'dots', total];
  if (current >= total - 2) return [1, 'dots', total - 3, total - 2, total - 1, total];
  return [1, 'dots', current - 1, current, current + 1, 'dots-end', total];
}

function filenameFromHeader(header: string | null, fallback: string) {
  const encodedMatch = header?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch) return decodeURIComponent(encodedMatch[1]);
  const plainMatch = header?.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? fallback;
}

function responseError(status: number) {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403 || status === 404) return 'This invoice is not available to your account.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  return 'The invoice service is temporarily unavailable.';
}

function listErrorFor(status: number) {
  if (status === 401) return { status, title: 'Session expired', message: 'Please sign in again to view your invoices.' };
  if (status === 404) return { status, title: 'Invoice service not found', message: 'The invoice endpoint could not be reached.' };
  if (status === 429) return { status, title: 'Too many requests', message: 'Please wait a moment before trying again.' };
  return { status, title: 'Unable to load invoices', message: 'The invoice service is temporarily unavailable.' };
}

export default function Home() {
  const [authState, setAuthState] = useState<'checking' | 'signedOut' | 'signedIn'>('checking');
  const [loginId, setLoginId] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [listState, setListState] = useState<'loading' | 'success' | 'error'>('loading');
  const [listError, setListError] = useState<{ status: number; title: string; message: string } | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => setAuthState(response.ok ? 'signedIn' : 'signedOut'))
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setAuthState('signedOut');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (authState !== 'signedIn') return;
    const controller = new AbortController();

    async function loadInvoices() {
      setListState('loading');
      setListError(null);
      try {
        const response = await fetch(apiUrl(`/invoices?page=${page}&pageSize=${PAGE_SIZE}`), {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          setInvoices([]);
          setPagination({ ...emptyPagination, page });
          setListError(listErrorFor(response.status));
          setListState('error');
          return;
        }
        const payload = await response.json() as { data: Invoice[]; pagination: Pagination };
        if (!Array.isArray(payload.data) || !payload.pagination) throw new Error('Invalid invoice response');
        setInvoices(payload.data);
        setPagination(payload.pagination);
        setListState('success');
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setInvoices([]);
        setPagination({ ...emptyPagination, page });
        setListError(listErrorFor(0));
        setListState('error');
      }
    }

    loadInvoices();
    return () => controller.abort();
  }, [authState, page, retryToken]);

  useEffect(() => {
    if (!preview) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPreview(null);
      setPreviewError('');
      setIsLoadingPreview(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [preview]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function closePreview() {
    setPreview(null);
    setPreviewError('');
    setIsLoadingPreview(false);
  }

  function openPreview(invoice: Invoice) {
    setPreview(invoice);
    setPreviewError('');
    setIsLoadingPreview(true);
  }

  async function downloadInvoice(invoice: Invoice) {
    setDownloadingId(invoice.id);
    try {
      const response = await fetch(apiUrl(`/invoices/${encodeURIComponent(invoice.id)}/download`), {
        credentials: 'include',
        headers: { Accept: 'application/pdf' },
      });
      if (!response.ok) throw new Error(responseError(response.status));
      const pdf = await response.blob();
      if (!pdf.type.toLowerCase().includes('pdf')) throw new Error('The server did not return a valid PDF invoice.');

      const objectUrl = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filenameFromHeader(
        response.headers.get('Content-Disposition'),
        `${invoice.invoiceNumber}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice(`${invoice.invoiceNumber} downloaded securely`);
    } catch (error) {
      setNotice((error as Error).message || 'The invoice could not be downloaded.');
    } finally {
      setDownloadingId('');
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    setLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: loginId, password: loginPassword }),
      });
      const payload = await response.json().catch(() => ({ message: '' })) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to sign in.');
      setLoginPassword('');
      setAuthState('signedIn');
    } catch (error) {
      setLoginError((error as Error).message || 'Unable to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    closePreview();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    setAuthState('signedOut');
    setLoginPassword('');
  }

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) return;
    setPage(nextPage);
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const firstRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

  if (authState === 'checking') {
    return (
      <main className="auth-shell">
        <div className="auth-loading" role="status"><span className="spinner" /><p>Preparing secure portal…</p></div>
      </main>
    );
  }

  if (authState === 'signedOut') {
    return (
      <main className="auth-shell">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-brand"><span className="brand-mark">P</span><span>Portal</span></div>
          <div className="login-copy"><span>ADMIN ACCESS</span><h1 id="login-title">Welcome back</h1><p>Sign in to view and manage GST invoices.</p></div>
          <form onSubmit={signIn}>
            <label htmlFor="user-id">User ID</label>
            <input id="user-id" name="username" autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Enter your password" required autoFocus />
            {loginError && <p className="login-error" role="alert">{loginError}</p>}
            <button type="submit" disabled={isSigningIn}>{isSigningIn ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="login-security"><i />Protected administrator portal</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P</span><span>Portal</span></div>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#invoices"><span className="nav-icon" aria-hidden="true">▤</span>Invoices</a>
        </nav>
        <div className="sidebar-note"><span className="status-dot" />Invoice files stay private</div>
        <div className="sidebar-footer">
          <div className="avatar">AM</div>
          <div><strong>Admin</strong><span>Administrator</span></div>
        </div>
      </aside>

      <section className="workspace" id="invoices">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">P</span>Portal</div>
          <div className="topbar-label">Invoice management</div>
          <button className="profile-button" type="button" onClick={signOut} aria-label="Sign out"><span>AM</span><b>Admin</b><i>Sign out</i></button>
        </header>

        <div className="content">
          <div className="page-heading">
            <div><p className="eyebrow">DOCUMENTS</p><h1>GST Invoices</h1><p>View and download customer purchase invoices.</p></div>
          </div>

          <div className={`table-card ${listState === 'loading' ? 'is-loading' : ''}`} aria-busy={listState === 'loading'}>
            <div className="table-title">
              <div><h2>All invoices</h2><p>Customer purchase and tax records</p></div>
              <span className={listState === 'error' ? 'error-indicator' : ''}><i />{listState === 'error' ? 'Service unavailable' : 'Securely connected'}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>SR No.</th><th>Invoice</th><th>Customer</th><th>Product</th><th>Product type</th><th>Date of purchase</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {listState === 'loading' && (
                    <tr className="state-row"><td colSpan={9}><div className="table-state"><span className="spinner" /><strong>Loading invoices…</strong><p>Retrieving the latest invoice records.</p></div></td></tr>
                  )}
                  {listState === 'error' && listError && (
                    <tr className="state-row"><td colSpan={9}><div className="table-state error-state"><span className="error-mark">!</span><strong>{listError.title}</strong><p>{listError.message}</p><button type="button" onClick={() => listError.status === 401 ? signOut() : setRetryToken((value) => value + 1)}>{listError.status === 401 ? 'Sign in again' : 'Try again'}</button></div></td></tr>
                  )}
                  {listState === 'success' && invoices.length === 0 && (
                    <tr className="state-row"><td colSpan={9}><div className="table-state empty-state"><span className="empty-mark">▤</span><strong>No invoices available</strong><p>There are no invoice records to display.</p></div></td></tr>
                  )}
                  {listState === 'success' && invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td><span className="serial">{invoice.serialNumber}</span></td>
                      <td><strong className="invoice-number">{invoice.invoiceNumber}</strong></td>
                      <td><div className="customer"><strong>{invoice.customerId}</strong><span>{invoice.customerName}</span></div></td>
                      <td><div className="product"><strong>{invoice.productName}</strong></div></td>
                      <td><span className={`type-pill type-${invoice.productType.split('_')[0].toLowerCase()}`}>{productTypeLabels[invoice.productType] ?? invoice.productType}</span></td>
                      <td>{formatDate(invoice.purchaseDate)}</td>
                      <td><strong className="amount">{formatCurrency(invoice.amount)}</strong></td>
                      <td><span className={`status-pill status-${invoice.status.toLowerCase()}`}>{invoice.status}</span></td>
                      <td>
                        {invoice.previewAvailable === true ? <div className="actions"><button type="button" onClick={() => openPreview(invoice)}><span aria-hidden="true">◉</span>Preview</button><button type="button" onClick={() => downloadInvoice(invoice)} disabled={downloadingId === invoice.id} aria-label={`Download ${invoice.invoiceNumber}`} title="Download invoice"><span aria-hidden="true">{downloadingId === invoice.id ? '…' : '↓'}</span></button></div> : <span className="no-actions">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {listState === 'success' && invoices.length > 0 && <div className="pagination">
              <p>Showing <strong>{firstRecord}–{lastRecord}</strong> of <strong>{pagination.totalRecords}</strong></p>
              <div className="page-controls" aria-label="Pagination">
                <button disabled={!pagination.hasPreviousPage} onClick={() => changePage(page - 1)} aria-label="Previous page">‹</button>
                {visiblePages(page, pagination.totalPages).map((item) => typeof item === 'string' ? <span key={item}>…</span> : <button key={item} className={page === item ? 'current' : ''} onClick={() => changePage(item)} aria-label={`Page ${item}`} aria-current={page === item ? 'page' : undefined}>{item}</button>)}
                <button disabled={!pagination.hasNextPage} onClick={() => changePage(page + 1)} aria-label="Next page">›</button>
              </div>
            </div>}
          </div>
          <p className="footnote">Invoice PDFs are retrieved through an authenticated service. Private storage locations are never sent to this page.</p>
        </div>
      </section>

      {preview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closePreview()}>
          <section className="invoice-modal pdf-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
            <div className="modal-head">
              <div><span className="modal-kicker">SECURE INVOICE PREVIEW</span><h2 id="invoice-title">{preview.invoiceNumber}</h2></div>
              <button className="close-button" type="button" onClick={closePreview} aria-label="Close invoice preview">×</button>
            </div>
            <div className="pdf-stage">
              {!previewError && <iframe className="pdf-frame" src={apiUrl(`/invoices/${encodeURIComponent(preview.id)}/preview`)} title={`Preview of ${preview.invoiceNumber}`} onLoad={() => setIsLoadingPreview(false)} onError={() => { setIsLoadingPreview(false); setPreviewError('The invoice preview could not be loaded.'); }} />}
              {isLoadingPreview && <div className="pdf-message" role="status"><span className="spinner" /><strong>Loading invoice securely…</strong><p>The PDF is being streamed through the authenticated invoice endpoint.</p></div>}
              {previewError && <div className="pdf-message error-state" role="alert"><span className="error-mark">!</span><strong>Preview unavailable</strong><p>{previewError}</p><button type="button" onClick={() => openPreview(preview)}>Try again</button></div>}
            </div>
            <div className="modal-actions">
              <span className="secure-label"><i />Authenticated invoice stream</span>
              <button type="button" className="secondary" onClick={closePreview}>Close</button>
              <button type="button" className="primary" disabled={downloadingId === preview.id} onClick={() => downloadInvoice(preview)}><span aria-hidden="true">{downloadingId === preview.id ? '…' : '↓'}</span> Download invoice</button>
            </div>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}
