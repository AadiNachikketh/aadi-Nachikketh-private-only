import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleAuthProvider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user: User | null) => {
    if (!user && !isSigningIn) {
      cachedAccessToken = null;
    }
  });
}

export const getGmailAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'consent' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve Gmail access token from Google sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } finally {
    isSigningIn = false;
  }
};

export const clearGmailAccessToken = () => {
  cachedAccessToken = null;
};

function encodeRfc2822Base64Url(to: string, subject: string, body: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to.trim()}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body,
  ];
  const rawMessage = messageParts.join('\r\n');
  const base64 = btoa(unescape(encodeURIComponent(rawMessage)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendEmailViaGmailApi(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  let token = await getGmailAccessToken();

  const sendWithToken = async (accessToken: string) => {
    const raw = encodeRfc2822Base64Url(params.to, params.subject, params.body);
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
  };

  let res = await sendWithToken(token);

  if (res.status === 401 || res.status === 403) {
    clearGmailAccessToken();
    token = await getGmailAccessToken();
    res = await sendWithToken(token);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg =
      errData?.error?.message ||
      `Gmail API error (${res.status}). You can also use "Open in Gmail Web" to send immediately.`;
    throw new Error(msg);
  }

  return res.json();
}
