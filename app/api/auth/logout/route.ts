import { expiredSessionCookie } from '../_session';

export async function POST() {
  return Response.json(
    { authenticated: false },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': expiredSessionCookie(),
      },
    },
  );
}
