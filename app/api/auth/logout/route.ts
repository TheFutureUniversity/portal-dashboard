import { expiredSessionCookie } from '../_session';

export async function POST(request: Request) {
  return Response.json(
    { authenticated: false },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': expiredSessionCookie(request),
      },
    },
  );
}
