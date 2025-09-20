export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  organization?: string;
  lastLoginAt?: string;
  metadata?: Record<string, unknown>;
}

export type UserPermission =
  | string
  | {
      id: string;
      scope?: string;
      description?: string;
    };

export interface UserSavedFilter {
  id: string;
  label: string;
  scope: string;
  criteria: Record<string, unknown>;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPreferences {
  fixedWidgets: string[];
  savedFilters: UserSavedFilter[];
  locale?: string;
  theme?: 'light' | 'dark' | 'system';
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresAt?: string | number;
  refreshExpiresAt?: string | number;
}

export interface AuthSession {
  profile: UserProfile;
  permissions: string[];
  preferences?: UserPreferences;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  tokens: AuthTokens;
  profile: UserProfile;
  permissions: string[];
  preferences?: UserPreferences;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}

export interface LogoutResponse {
  success: boolean;
}
