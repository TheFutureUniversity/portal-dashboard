import { authIsConfigured, credentialsAreValid, sessionCookie } from '../_session';

export async function POST(request: Request) {
  if (!authIsConfigured()) {
    return Response.json({ message: 'Portal login is not configured.' }, { status: 503 });
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Invalid login request.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!await credentialsAreValid(username, password)) {
    return Response.json(
      { message: 'Incorrect user ID or password.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(
    { authenticated: true, user: { id: username } },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': await sessionCookie(),
      },
    },
  );
}
