import { proxyInvoiceList } from './_proxy';

export async function GET(request: Request) {
  return proxyInvoiceList(request);
}
