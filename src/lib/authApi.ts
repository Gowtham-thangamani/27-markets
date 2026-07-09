import { api } from './api'

export interface TwoFactorSetup {
  otpauthUrl: string
  qrDataUrl: string
}

/** Auth account-management endpoints (2FA enrolment + password change). */
export const authApi = {
  me: () => api.get<{ id: string; email: string; twoFactorEnabled: boolean }>('/auth/me'),
  setup2fa: () => api.post<TwoFactorSetup>('/auth/2fa/setup'),
  enable2fa: (code: string) => api.post('/auth/2fa/enable', { code }),
  disable2fa: (currentPassword: string, code: string) =>
    api.post('/auth/2fa/disable', { currentPassword, code }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/password', { currentPassword, newPassword }),
}
