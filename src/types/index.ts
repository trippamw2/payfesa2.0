// Common types used across the application

export interface User {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  phone_number: string;
  name: string;
  pin_hash?: string;
  pin_salt?: string;
  language?: string;
  wallet_balance: number;
  frozen?: boolean;
  total_messages_sent?: number;
  trust_score?: number;
  points?: number;
  premium_tier?: string;
  premium_expires_at?: string;
  escrow_balance: number;
  created_at?: string;
  updated_at?: string;
  is_kyc_verified?: boolean;
  overall_trust_score?: number;
}

export interface Group {
  id: string;
  name?: string;
  description?: string;
  amount: number;
  contribution_amount?: number;
  frequency: string;
  max_members: number;
  current_members?: number;
  status?: string;
  admin_id?: string;
  creator_id?: string;
  created_by?: string;
  code?: string;
  group_code?: string;
  rules?: string;
  created_at?: string;
  updated_at?: string;
  next_contribution_date?: string;
  cycle_ends_at?: string;
  escrow_balance?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  payout_position?: number;
  position_in_cycle?: number;
  has_contributed?: boolean;
  has_received_payout?: boolean;
  contribution_amount?: number;
  last_payout_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  read_at?: string;
  created_at: string;
  metadata?: any; // Allow any type for Json compatibility
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string | null;
  message: string;
  message_type?: string;
  created_at: string;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  metadata?: any; // Allow any type for Json compatibility
}

export interface Contribution {
  id: string;
  user_id: string;
  group_id: string;
  amount: number;
  status: string;
  transaction_id?: string;
  payment_method?: string;
  payment_provider?: string;
  payment_reference?: string;
  fee_amount?: number;
  net_amount?: number;
  receipt_url?: string;
  metadata?: any;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
}

export interface Achievement {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  type: string;
  icon?: string;
  tier?: string;
  category?: string;
  points_awarded?: number;
  earned_at?: string;
  user_id?: string;
  requirement_type?: string;
  requirement_value?: number;
  bonus_percentage?: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievements?: Achievement;
}

export interface TrustScore {
  id: string;
  user_id: string;
  group_id?: string;
  score: number;
  on_time_contributions?: number;
  late_contributions?: number;
  missed_contributions?: number;
  created_at: string;
  updated_at: string;
}

export interface MobileMoneyAccount {
  id: string;
  user_id: string;
  provider: string;
  phone_number: string;
  account_name?: string;
  account_status: string;
  is_active: boolean;
  linked_at: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  group_id?: string;
  type: string;
  amount: number;
  status: string;
  provider: string;
  phone_number: string;
  transaction_id: string;
  reference?: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutSchedule {
  id: string;
  user_id: string;
  group_id: string;
  scheduled_date: string;
  payout_time: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
}

export interface Payout {
  id: string;
  recipient_id: string;
  group_id: string;
  amount: number;
  gross_amount: number;
  fee_amount: number;
  commission_amount: number;
  status: string;
  payment_method?: string;
  payment_provider?: string;
  payment_reference?: string;
  account_id?: string;
  receipt_url?: string;
  mobile_money_reference?: string;
  failure_reason?: string;
  metadata?: any;
  payout_date: string;
  cycle_number: number;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface GroupBalance {
  id: string;
  group_id: string;
  total_contributions: number;
  total_payouts: number;
  current_balance: number;
  escrow_balance: number;
  reserve_balance: number;
  total_fees_paid: number;
  last_contribution_at?: string;
  last_payout_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserBalanceHistory {
  id: string;
  user_id: string;
  balance_type: 'wallet' | 'escrow';
  previous_balance: number;
  new_balance: number;
  change_amount: number;
  transaction_id?: string;
  transaction_type?: string;
  reason?: string;
  created_at: string;
}
