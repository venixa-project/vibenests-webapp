import i18n from '../i18n';

export const BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://api.vibenests.in';
const BASE = BASE_URL;

function getToken() {
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

let apiRefreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!apiRefreshPromise) {
    apiRefreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          return data.accessToken;
        }
        return null;
      } catch {
        return null;
      } finally {
        apiRefreshPromise = null;
      }
    })();
  }

  return apiRefreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const lang = i18n.language || localStorage.getItem('i18nextLng') || 'en';
  const shortLang = lang.split('-')[0].toLowerCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': shortLang,
    'X-Locale': shortLang,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && retry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // retry with new token
        return request<T>(path, options, false);
      }
      throw new Error('Session expired. Please log in again.');
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: { id: number; email: string; role: string; fullName: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  sendOtp: async (phone: string) => {
    return request<{ message: string; channel?: string; otp?: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
  sendEmailOtp: async (email: string) => {
    return request<{ message: string; channel?: string; otp?: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  verifyOtp: async (phone: string, otp: string) => {
    return request<{ accessToken: string; refreshToken: string; user: { id: number; email: string; role: string; phone?: string } }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ phone, otp }) }
    );
  },
  verifyEmailOtp: async (email: string, otp: string) => {
    return request<{ accessToken: string; refreshToken: string; user: { id: number; email: string; role: string; phone?: string } }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ email, otp }) }
    );
  },
  register: (body: any) =>
    request<{ accessToken: string; refreshToken: string; user: { id: number; email: string; role: string; fullName?: string } }>('/auth/register', {
      method: 'POST', body: JSON.stringify(body),
    }),
  logout: (refreshToken: string) =>
    request<{ message: string }>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  verifyResetToken: (token: string) =>
    request<{ valid: boolean; email?: string }>(`/auth/verify-reset-token/${token}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};

// ── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  getAll: () => request<any[]>('/bookings'),
  getById: (id: string | number) => request<any>(`/bookings/${id}`),
  create: (body: any) => request<any>('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  adminCreate: (body: any) => request<any>('/bookings/admin', { method: 'POST', body: JSON.stringify(body) }),
  manualCreate: (body: any) => request<any>('/bookings/manual-entry', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id: number, status: string) =>
    request<any>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancel: (id: number, body?: { reason: string }) =>
    request<any>(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify(body || {}) }),

  getMeetingLink: (id: number) => request<{ meeting_link: string }>(`/bookings/${id}/meeting-link`, { method: 'POST' }),
  payCash: (id: number) => request<any>(`/bookings/${id}/pay-cash`, { method: 'POST' }),
  reschedule: (id: number, body: { date: string; timeSlot: string }) =>
    request<any>(`/bookings/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreateRazorpayLink: (body: any) =>
    request<any>(`/bookings/admin/create-razorpay-link`, { method: 'POST', body: JSON.stringify(body) }),
};


// ── Suites ───────────────────────────────────────────────────────────────────
export const suitesApi = {
  getAll: () => request<any[]>('/suites'),
  getById: (id: number | string) => request<any>(`/suites/${id}`),
  create: (body: any) => request<any>('/suites', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: any) => request<any>(`/suites/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: number) => request<any>(`/suites/${id}`, { method: 'DELETE' }),
  getBlockedSlots: (id: number | string, date: string) =>
    request<string[]>(`/suites/${id}/blocked-slots?date=${date}`),
  getAvailabilityDetails: (id: number | string, date: string) =>
    request<{ bookings: any[]; blocks: any[] }>(`/suites/${id}/availability-details?date=${date}`),
  addBlock: (id: number | string, body: { date: string; timeSlot: string; note?: string }) =>
    request<any>(`/suites/${id}/availability`, { method: 'POST', body: JSON.stringify(body) }),
  removeBlock: (id: number | string, availabilityId: number) =>
    request<any>(`/suites/${id}/availability/${availabilityId}`, { method: 'DELETE' }),
};

// ── Add-ons ──────────────────────────────────────────────────────────────────
export const addonsApi = {
  getAll: () => request<any[]>('/addons'),
  create: (body: any) => request<any>('/addons', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: any) => request<any>(`/addons/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: number) => request<any>(`/addons/${id}`, { method: 'DELETE' }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => request<any[]>('/users'),
  me: () => request<any>('/users/me'),
  getMe: () => request<{ id: number; fullName: string; email: string; phone: string; role: string; dateOfBirth?: string; marriageDate?: string }>('/users/me'),
  updateMe: (body: { fullName?: string; email?: string; phone?: string; dateOfBirth?: string; marriageDate?: string }) => request<any>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  getById: (id: string) => request<any>(`/users/${id}`),
  create: (body: { fullName: string; email: string; phone?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(body) }),
  toggleStatus: (id: string) =>
    request<any>(`/users/${id}/status`, { method: 'PATCH' }),
  resendSetup: (id: string) =>
    request<any>(`/users/${id}/resend-setup`, { method: 'POST' }),

  updateByAdmin: (
    id: string,
    body: { fullName?: string; phone?: string; dateOfBirth?: string; marriageDate?: string; isActive?: boolean }
  ) => request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteByAdmin: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),
};


// ── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  getAll: () => request<any[]>('/payments/all'),
  getMine: () => request<any[]>('/payments/me'),
  createOrder: (bookingId: number, amount: number, method: string) =>
    request<{ paymentId: number; orderId: string; amount: number; keyId: string; devMode?: boolean }>(
      '/payments/create-order',
      { method: 'POST', body: JSON.stringify({ bookingId, amount, method }) }
    ),
  verify: (body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    request<any>('/payments/verify', { method: 'POST', body: JSON.stringify(body) }),
  verifyPayment: (paymentId: number, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) =>
    request<{ success: boolean; payment: any }>(
      '/payments/verify-payment',
      { method: 'POST', body: JSON.stringify({ paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) }
    ),
};

// ── Celebration Memberships ──────────────────────────────────────────────────
export const membershipsApi = {
  getPlans: () => request<any[]>('/memberships/plans'),
  getPlan: (id: number) => request<any>(`/memberships/plans/${id}`),
  createPlan: (body: any) => request<any>('/memberships/plans', { method: 'POST', body: JSON.stringify(body) }),
  updatePlan: (id: number, body: any) => request<any>(`/memberships/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  removePlan: (id: number) => request<any>(`/memberships/plans/${id}`, { method: 'DELETE' }),
  subscribe: (planId: number) => request<any>('/memberships/subscribe', { method: 'POST', body: JSON.stringify({ planId }) }),
  getMyActive: () => request<any>('/memberships/my-active'),
  getPurchases: () => request<any[]>('/memberships/purchases'),
};

// ── Reports ──────────────────────────────────────────────────────────────────
type ApiMonthlyGrowthRow = { month: string; customers: number; new: number };
type ApiBookingFrequencyRow = { range: string; count: number };
type ApiAcquisitionRow = { name: string; value: number };

export const reportsApi = {

  revenue: (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    return request<any[]>(`/reports/revenue?${q}`);
  },
  bookings: (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    return request<any[]>(`/reports/bookings?${q}`);
  },
  customers: (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    return request<any>(`/reports/customers?${q}`);
  },
};


// ── Offers & Coupons
export const offersApi = {
  getAll: () => request<{ data: any[]; total: number }>('/offers'),
  getActive: () => request<any[]>('/offers/active'),
  getMySpecialOffers: () => request<any[]>('/offers/my-special-offers'),
  getUserOffers: (userId: number) => request<any[]>(`/offers/user/${userId}`),
  create: (body: any) => request<any>('/offers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: any) => request<any>(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<any>(`/offers/${id}`, { method: 'DELETE' }),
};

export const couponsApi = {
  getAll: () => request<{ data: any[]; total: number }>('/coupons'),
  getActive: () => request<any[]>('/coupons/active'),
  validate: (body: { code: string; bookingAmount: number }) =>
    request<{ valid: boolean; discountAmount: number; coupon: any; message?: string }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  create: (body: any) => request<any>('/coupons', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: number) => request<any>(`/coupons/${id}`, { method: 'DELETE' }),
};

export const offerConfigsApi = {
  getMap: () => request<Record<string, string>>('/offer-configurations/map'),
  upsert: (body: { configKey: string; configValue: string; valueType?: string; label?: string; description?: string }) =>
    request<any>('/offer-configurations', { method: 'POST', body: JSON.stringify(body) }),
};

export const bookingRulesApi = {
  getMap: () => request<Record<string, string>>('/booking-rules/map'),
  upsert: (body: { ruleKey: string; ruleValue: string; valueType?: string; label?: string; description?: string }) =>
    request<any>('/booking-rules', { method: 'POST', body: JSON.stringify(body) }),
};

// Public: map for frontend
export const liveCelebrationSettingsApi = {
  getMap: () => request<Record<string, string>>('/live-celebration-settings/map'),
  upsert: (body: { settingKey: string; settingValue: string; valueType?: string; label?: string; description?: string }) =>
    request<any>('/live-celebration-settings', { method: 'POST', body: JSON.stringify(body) }),
};

export const appNotificationsApi = {
  getMine: () => request<any[]>('/app-notifications/my'),
  markRead: (id: number) => request<any>(`/app-notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<any>('/app-notifications/mark-all-read', { method: 'PATCH' }),
};

export const reviewsApi = {
  getAll: () => request<any[]>('/reviews'),
  create: (body: {
    overall: number;
    ambience?: number;
    cleanliness?: number;
    service?: number;
    decoration?: number;
    value?: number;
    comment?: string;
    bookingId?: number;
  }) => request<any>('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: number) => request<any>(`/reviews/${id}`, { method: 'DELETE' }),
};

export const refundsApi = {
  // Policy preview (no auth)
  getPolicy: () => request<any>('/refunds/policy'),

  // Calculate eligibility preview
  calculate: (bookingId: number) =>
    request<any>('/refunds/calculate', { method: 'POST', body: JSON.stringify({ bookingId }) }),

  // Initiate automated refund
  initiate: (bookingId: number, refundReason?: string, customerMessage?: string, attachments?: string[]) =>
    request<any>('/refunds/initiate', { method: 'POST', body: JSON.stringify({ bookingId, refundReason, customerMessage, attachments }) }),

  // List (supports search + filter)
  getAll: (params?: { status?: string; searchKeyword?: string; userId?: number; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.searchKeyword) q.set('searchKeyword', params.searchKeyword);
    if (params?.userId) q.set('userId', String(params.userId));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(`/refunds?${q}`);
  },

  getById: (id: number) => request<any>(`/refunds/${id}`),

  // Admin manual overrides
  underReview: (id: number) =>
    request<any>(`/refunds/${id}/under-review`, { method: 'PATCH' }),
  approve: (id: number, body: { selectedPercentage: number; adminNotes?: string }) =>
    request<any>(`/refunds/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
  reject: (id: number, body: { rejectionReason: string }) =>
    request<any>(`/refunds/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
  processing: (id: number) =>
    request<any>(`/refunds/${id}/processing`, { method: 'POST' }),
  complete: (id: number, body: { referenceId: string; paymentGatewayResponse?: any }) =>
    request<any>(`/refunds/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  process: (id: number, action: 'approve' | 'reject', reason?: string) => {
    if (action === 'approve') {
      return request<any>(`/refunds/${id}/approve`, { method: 'POST', body: JSON.stringify({ selectedPercentage: 100 }) });
    } else {
      return request<any>(`/refunds/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejectionReason: reason || 'Rejected by administrator' }) });
    }
  },
};

export const referralsApi = {
  getStats: () => request<{
    referralCode: string;
    totalReferrals: number;
    pendingReferrals: number;
    successfulReferrals: number;
    earnedRewards: number;
    redeemedRewards: number;
    rewards: any[];
  }>('/referrals/stats'),

  validateCode: (code: string) =>
    request<{ valid: boolean; message?: string }>(`/referrals/validate/${code}`),

  adminGetAll: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ data: any[]; total: number }>(`/referrals/admin/all?${q}`);
  },

  adminApproveReward: (rewardId: number) =>
    request<any>(`/referrals/admin/rewards/${rewardId}/approve`, { method: 'POST' }),

  adminRevokeReward: (rewardId: number) =>
    request<any>(`/referrals/admin/rewards/${rewardId}/revoke`, { method: 'POST' }),
};

export const globalSettingsApi = {
  getPublic: () => request<Record<string, any>>('/global-settings/public'),
  getAll: () => request<Record<string, any>>('/global-settings'),
  updateBulk: (settingsMap: Record<string, any>) =>
    request<{ message: string }>('/global-settings', { method: 'POST', body: JSON.stringify(settingsMap) }),
};
