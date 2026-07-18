const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('accessToken', data.accessToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
          if (retryRes.ok) return retryRes.json();
        }
      } catch {}
    }
    // Auth failed — redirect to login
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? err.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────

export const authApi = {
  register: (data: { tenantName: string; email: string; password: string; name: string }) =>
    request<{ accessToken: string; refreshToken: string; user: import('../types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  generateApiKey: () => request<{ apiKey: string }>('/auth/api-key', { method: 'POST' }),
};

// ─── Workflows ────────────────────────────────────────────

export const workflowApi = {
  list: () =>
    request<{ workflows: import('../types').Workflow[] }>('/workflows'),

  get: (id: string) =>
    request<{ workflow: import('../types').Workflow }>(`/workflows/${id}`),

  create: (data: { name: string; description?: string; triggerType?: string; definition: object }) =>
    request<{ workflow: import('../types').Workflow; version: import('../types').WorkflowVersion }>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string; definition?: object }) =>
    request<{ message: string }>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  publish: (id: string) =>
    request<{ message: string; versionId: string }>(`/workflows/${id}/publish`, {
      method: 'POST',
    }),

  trigger: (id: string, payload?: unknown) =>
    request<{ runId: string; status: string }>(`/workflows/${id}/trigger`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/workflows/${id}`, { method: 'DELETE' }),
};

// ─── Runs ─────────────────────────────────────────────────

export const runApi = {
  list: (filters?: { status?: string; workflowId?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    return request<{ runs: import('../types').WorkflowRun[] }>(`/runs${params ? `?${params}` : ''}`);
  },

  get: (id: string) =>
    request<{ run: import('../types').WorkflowRun }>(`/runs/${id}`),

  trace: (id: string) =>
    request<{ runId: string; events: import('../types').RunEvent[] }>(`/runs/${id}/trace`),

  cancel: (id: string) =>
    request<{ message: string }>(`/runs/${id}/cancel`, { method: 'POST' }),

  pendingHumanTasks: () =>
    request<{ tasks: import('../types').HumanTask[] }>('/runs/human-tasks/pending'),

  approveTask: (taskId: string, input?: unknown) =>
    request<{ message: string }>(`/runs/human-tasks/${taskId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    }),

  rejectTask: (taskId: string, reason?: string) =>
    request<{ message: string }>(`/runs/human-tasks/${taskId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ─── Analytics ────────────────────────────────────────────

export const analyticsApi = {
  cost: (days?: number) =>
    request<{ summary: import('../types').CostSummary[]; totalCost: number; totalTokens: number }>(`/analytics/cost${days ? `?days=${days}` : ''}`),

  runStats: () =>
    request<{ stats: Array<{ status: string; _count: { id: number } }> }>('/analytics/runs/stats'),

  tools: () =>
    request<{ tools: import('../types').Tool[] }>('/analytics/tools'),

  trends: (days?: number) =>
    request<{ runs: unknown[]; costs: unknown[] }>(`/analytics/trends${days ? `?days=${days}` : ''}`),
};

// ─── WebSocket ────────────────────────────────────────────

export function createRunWebSocket(onMessage: (data: unknown) => void): WebSocket {
  const token = getToken();
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws?token=${token}`;
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  return ws;
}
