import { proxyInvoicePdf } from '../../_proxy';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  return proxyInvoicePdf(request, invoiceId, 'download');
}
