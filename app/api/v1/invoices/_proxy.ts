import { requestHasValidSession } from '../../auth/_session';

const DEFAULT_API_BASE_URL = 'https://api.thefuture.university';

function runtimeValue(key: string) {
  if (typeof process === 'undefined') return undefined;
  return process.env[key];
}

function apiBaseUrl() {
  return (runtimeValue('INVOICE_API_BASE_URL')
    ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

function bearerToken() {
  return runtimeValue('INVOICE_API_BEARER_TOKEN')
    ?? '';
}

function backendHeaders(accept: string) {
  const headers = new Headers({ Accept: accept });
  const token = bearerToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function safeError(status: number) {
  const message = status === 401
    ? 'Your session has expired. Please sign in again.'
    : status === 404
      ? 'The requested invoice was not found.'
      : status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : 'The invoice service is temporarily unavailable.';

  return Response.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

async function requirePortalSession(request: Request) {
  if (await requestHasValidSession(request)) return null;
  return safeError(401);
}

async function requestBackend(path: string, accept: string) {
  return fetch(`${apiBaseUrl()}${path}`, {
    method: 'GET',
    headers: backendHeaders(accept),
    redirect: 'follow',
  });
}

export async function proxyInvoiceList(request: Request) {
  const unauthorized = await requirePortalSession(request);
  if (unauthorized) return unauthorized;

  const requestUrl = new URL(request.url);
  const page = requestUrl.searchParams.get('page') ?? '1';
  const pageSize = requestUrl.searchParams.get('pageSize') ?? '10';

  let response: Response;
  try {
    response = await requestBackend(
      `/api/v1/invoices?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
      'application/json',
    );
  } catch {
    return safeError(502);
  }

  if (!response.ok) return safeError(response.status === 401 ? 502 : response.status);

  try {
    const payload = await response.json() as {
      data?: Array<Record<string, unknown>>;
      pagination?: Record<string, unknown>;
    };
    if (!Array.isArray(payload.data) || !payload.pagination) return safeError(502);

    const data = payload.data.map((invoice) => ({
      id: invoice.id,
      serialNumber: invoice.serialNumber,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      productName: invoice.productName,
      productType: invoice.productType,
      purchaseDate: invoice.purchaseDate,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      previewAvailable: invoice.previewAvailable === true,
    }));
    const pagination = {
      page: payload.pagination.page,
      pageSize: payload.pagination.pageSize,
      totalRecords: payload.pagination.totalRecords,
      totalPages: payload.pagination.totalPages,
      hasPreviousPage: payload.pagination.hasPreviousPage,
      hasNextPage: payload.pagination.hasNextPage,
    };

    return Response.json(
      { data, pagination },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return safeError(502);
  }
}

export async function proxyInvoicePdf(request: Request, invoiceId: string, action: 'preview' | 'download') {
  const unauthorized = await requirePortalSession(request);
  if (unauthorized) return unauthorized;

  let response: Response;
  try {
    response = await requestBackend(
      `/api/v1/invoices/${encodeURIComponent(invoiceId)}/${action}`,
      'application/pdf',
    );
  } catch {
    return safeError(502);
  }

  if (!response.ok) return safeError(response.status === 401 ? 502 : response.status);

  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': response.headers.get('Content-Type') ?? 'application/pdf',
    'X-Content-Type-Options': 'nosniff',
  });
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) headers.set('Content-Disposition', disposition);

  return new Response(response.body, { status: response.status, headers });
}
