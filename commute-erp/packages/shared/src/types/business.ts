// =====================================================
// 사업장 타입
// =====================================================

export interface Business {
  id: string;
  name: string;
  business_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  settings: BusinessSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  timezone?: string;
  locale?: string;
  currency?: string;
  date_format?: string;
  time_format?: string;
}

export interface CreateBusinessInput {
  name: string;
  business_number?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateBusinessInput extends Partial<CreateBusinessInput> {
  settings?: Partial<BusinessSettings>;
  is_active?: boolean;
}
