export interface PartInfo {
  name: string;
  spec: string;
  price: number;
  shopLink: string;
  notes: string;
}

export interface PCConfig {
  cpu: PartInfo;
  motherboard: PartInfo;
  gpu: PartInfo;
  ram: PartInfo;
  storage: PartInfo;
  psu: PartInfo;
  case: PartInfo;
  cooler: PartInfo;
}

export interface GenerateRequest {
  budget: number;
  purpose: string[];
  cpuPreference: "any" | "intel" | "amd";
}

export interface GenerateResponse {
  config: PCConfig;
  totalPrice: number;
  compatibilityNotes: string[];
}

export interface Device {
  id: string;
  anon_user_id: string;
  subscription_expires_at: string | null;
  free_uses_remaining: number;
  created_at: string;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  expiresAt: string | null;
  freeUsesRemaining: number;
  canAccessFull: boolean;
}

export interface SavedConfig {
  id: string;
  anon_user_id: string;
  budget: number;
  purpose: string;
  config_json: PCConfig;
  total_price: number;
  share_token: string;
  created_at: string;
}
