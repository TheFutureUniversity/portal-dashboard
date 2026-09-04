import { authIsConfigured, requestHasValidSession } from '../_session';

export async function GET(request: Request) {
  if (!authIsConfigured()) {
    return Response.json(
      { authenticated: false, configured: false },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const authenticated = await requestHasValidSession(request);
  return Response.json(
    authenticated
      ? { authenticated: true, configured: true, user: { id: process.env.PORTAL_ADMIN_USERNAME ?? 'admin' } }
      : { authenticated: false, configured: true },
    { status: authenticated ? 200 : 401, headers: { 'Cache-Control': 'no-store' } },
  );
}
