import { env } from 'cloudflare:workers';

const SESSION_COOKIE = 'portal_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 12;

const encoder = new TextEncoder();

type PortalEnvironment = Cloudflare.Env & {
  PORTAL_ADMIN_USERNAME?: string;
  PORTAL_ADMIN_PASSWORD?: string;
  PORTAL_SESSION_SECRET?: string;
};

const runtimeEnvironment = env as PortalEnvironment;

function configuredUsername() {
  return runtimeEnvironment.PORTAL_ADMIN_USERNAME ?? process.env.PORTAL_ADMIN_USERNAME ?? 'admin';
}

function configuredPassword() {
  return runtimeEnvironment.PORTAL_ADMIN_PASSWORD ?? process.env.PORTAL_ADMIN_PASSWORD ?? '';
}

function sessionSecret() {
  return runtimeEnvironment.PORTAL_SESSION_SECRET ?? process.env.PORTAL_SESSION_SECRET ?? '';
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function constantTimeEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let mismatch = leftDigest.length ^ rightDigest.length;
  for (let index = 0; index < Math.max(leftDigest.length, rightDigest.length); index += 1) {
    mismatch |= (leftDigest.charCodeAt(index) || 0) ^ (rightDigest.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function createSessionToken() {
  const secret = sessionSecret();
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`portal-admin:${configuredUsername()}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

export function authIsConfigured() {
  return Boolean(configuredPassword() && sessionSecret());
}

export async function credentialsAreValid(username: string, password: string) {
  if (!authIsConfigured()) return false;
  const [usernameMatches, passwordMatches] = await Promise.all([
    constantTimeEqual(username, configuredUsername()),
    constantTimeEqual(password, configuredPassword()),
  ]);
  return usernameMatches && passwordMatches;
}

export async function requestHasValidSession(request: Request) {
  if (!authIsConfigured()) return false;
  const suppliedToken = cookieValue(request, SESSION_COOKIE);
  if (!suppliedToken) return false;
  return constantTimeEqual(suppliedToken, await createSessionToken());
}

export async function sessionCookie() {
  const token = await createSessionToken();
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
