import { BASE_URL } from './api';
const BASE = BASE_URL;

function getContext(): any {
  // Keep it minimal; no tokens.
  try {
    const authUserRaw = localStorage.getItem('authUser');
    const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
    return {
      path: window.location.pathname,
      userRole: authUser?.role ?? null,
    };
  } catch {
    return { path: window.location.pathname, userRole: null };
  }
}

export async function chatAnswer(message: string, history: { role: 'user'|'assistant'; content: string }[] = []): Promise<string> {
  const res = await fetch(`${BASE}/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context: getContext() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Chat failed');
  }
  return data?.reply ?? '';
}

