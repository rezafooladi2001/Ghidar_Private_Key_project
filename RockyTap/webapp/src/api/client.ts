/**
 * API client for Ghidar backend.
 * Handles authentication via Telegram initData header.
 */

import { getInitData } from '../lib/telegram';
import * as mockData from './mockData';

// API base URL - relative to the current domain
// Note: This is the backend endpoint path, not a branding reference
const API_BASE = '/RockyTap/api';

/**
 * API response format from backend.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

/**
 * API error class for handling errors consistently.
 */
export class ApiError extends Error {
  code: string;
  status?: number;
  
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Get mock data for a given API path (for local development).
 */
function getMockDataForPath(path: string, method: string = 'GET'): any {
  const normalizedPath = path.replace(/^\//, '');
  
  // Map API paths to mock data
  if (normalizedPath === 'me') return mockData.mockMeResponse;
  if (normalizedPath === 'airdrop/status') return mockData.mockAirdropStatusResponse;
  if (normalizedPath === 'airdrop/tap' && method === 'POST') return mockData.mockAirdropTapResponse;
  if (normalizedPath === 'airdrop/convert' && method === 'POST') return mockData.mockAirdropConvertResponse;
  if (normalizedPath.startsWith('airdrop/history')) return mockData.mockAirdropHistoryResponse;
  if (normalizedPath === 'lottery/status') return mockData.mockLotteryStatusResponse;
  if (normalizedPath === 'lottery/purchase' && method === 'POST') return mockData.mockLotteryPurchaseResponse;
  if (normalizedPath.startsWith('lottery/history')) return mockData.mockLotteryHistoryResponse;
  if (normalizedPath.startsWith('lottery/winners')) return mockData.mockLotteryWinnersResponse;
  if (normalizedPath === 'ai_trader/status') return mockData.mockAiTraderStatusResponse;
  if (normalizedPath === 'ai_trader/deposit' && method === 'POST') return mockData.mockAiTraderDepositResponse;
  if (normalizedPath === 'ai_trader/withdraw' && method === 'POST') return mockData.mockAiTraderWithdrawResponse;
  if (normalizedPath.startsWith('ai_trader/history')) return mockData.mockAiTraderHistoryResponse;
  if (normalizedPath === 'referral/info') return mockData.mockReferralInfo;
  if (normalizedPath.startsWith('referral/leaderboard')) return mockData.mockReferralLeaderboardResponse;
  if (normalizedPath.startsWith('referral/history')) return mockData.mockReferralHistoryResponse;
  if (normalizedPath.startsWith('payments/deposit/init')) return mockData.mockDepositInitResponse;
  
  return null;
}

/**
 * Make an authenticated API call.
 * Automatically includes Telegram initData in the header.
 * 
 * @param path - API endpoint path (relative to /RockyTap/api/)
 * @param options - Fetch options
 * @returns Parsed response data
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const initData = getInitData();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    'Telegram-Data': initData,
  };

  const url = `${API_BASE}/${path.replace(/^\//, '')}`;
  
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!res.ok) {
      // Try to parse error response
      try {
        const json: ApiResponse<T> = await res.json();
        if (!json.success && json.error) {
          throw new ApiError(
            json.error.code || 'HTTP_ERROR',
            json.error.message || `HTTP ${res.status}: ${res.statusText}`,
            res.status
          );
        }
      } catch {
        // If JSON parsing fails, throw with status
        throw new ApiError(
          'HTTP_ERROR',
          `HTTP ${res.status}: ${res.statusText}`,
          res.status
        );
      }
    }

    const json: ApiResponse<T> = await res.json();

    if (!json.success) {
      throw new ApiError(
        json.error?.code || 'UNKNOWN_ERROR',
        json.error?.message || 'An unknown error occurred',
        res.status
      );
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or parsing error
    // In development mode, return mock data if available
    if (import.meta.env.DEV) {
      const mockResponse = getMockDataForPath(path, options.method || 'GET');
      if (mockResponse) {
        console.log(`[DEV MODE] Using mock data for: ${path}`);
        // Simulate network delay for realistic testing
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockResponse as T;
      }
    }
    
    throw new ApiError('NETWORK_ERROR', 'Failed to connect to server. Please check your connection.');
  }
}

/**
 * GET request helper.
 */
export async function apiGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  let url = path;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url = `${path}?${searchParams.toString()}`;
  }
  
  return apiFetch<T>(url, { method: 'GET' });
}

/**
 * POST request helper.
 */
export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// ==================== API Types ====================

export interface UserData {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium?: boolean;
  language_code?: string;
  joining_date?: number | null;
}

export interface WalletData {
  usdt_balance: string;
  ghd_balance: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeResponse {
  user: UserData;
  wallet: WalletData;
}

export interface AirdropStatus {
  ghd_balance: string;
  estimated_usdt_from_ghd: string;
  ghd_per_usdt: number;
}

export interface AirdropStatusResponse {
  user: UserData;
  wallet: WalletData;
  airdrop: AirdropStatus;
}

export interface AirdropTapResponse {
  ghd_earned: string;
  wallet: WalletData;
}

export interface AirdropConvertResponse {
  converted_ghd: string;
  received_usdt: string;
  wallet: WalletData;
}

export interface AirdropHistoryItem {
  id: number;
  action_type: string;
  ghd_amount: string;
  usdt_amount?: string;
  created_at: string;
}

export interface AirdropHistoryResponse {
  actions: AirdropHistoryItem[];
}

export interface LotteryData {
  id: number;
  title: string;
  description?: string;
  type: string;
  ticket_price_usdt: string;
  prize_pool_usdt: string;
  status: string;
  start_at: string;
  end_at: string;
}

export interface LotteryStatusResponse {
  lottery: LotteryData | null;
  user?: UserData;
  wallet?: WalletData;
  user_tickets_count?: number;
}

export interface LotteryPurchaseResponse {
  ticket_count_purchased: number;
  user_total_tickets: number;
  wallet: WalletData;
  lottery: {
    id: number;
    ticket_price_usdt: string;
    prize_pool_usdt: string;
  };
}

export interface LotteryHistoryItem {
  id: number;
  title: string;
  type: string;
  prize_pool_usdt: string;
  status: string;
  start_at: string;
  end_at: string;
  has_winners: boolean;
}

export interface LotteryHistoryResponse {
  lotteries: LotteryHistoryItem[];
}

export interface LotteryWinner {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  prize_amount_usdt: string;
  rank: number;
}

export interface LotteryWinnersResponse {
  lottery: LotteryData;
  winners: LotteryWinner[];
}

export interface AiTraderSummary {
  total_deposited_usdt: string;
  current_balance_usdt: string;
  realized_pnl_usdt: string;
}

export interface AiTraderStatusResponse {
  user: UserData;
  wallet: WalletData;
  ai_trader: AiTraderSummary;
}

export interface AiTraderDepositResponse {
  amount_usdt: string;
  wallet: WalletData;
  ai_trader: AiTraderSummary;
}

export interface AiTraderWithdrawResponse {
  amount_usdt: string;
  wallet: WalletData;
  ai_trader: AiTraderSummary;
}

export interface AiTraderHistoryItem {
  id: number;
  time: string;
  balance: string;
  pnl: string;
}

export interface AiTraderHistoryResponse {
  snapshots: AiTraderHistoryItem[];
}

export interface DepositInitResponse {
  deposit_id: number | string;
  network: string;
  product_type: string;
  address: string;
  expected_amount_usdt: string;
  meta: Record<string, unknown>;
}

// ==================== API Functions ====================

/**
 * Get current user and wallet info.
 */
export function getMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('me');
}

/**
 * Get airdrop status.
 */
export function getAirdropStatus(): Promise<AirdropStatusResponse> {
  return apiGet<AirdropStatusResponse>('airdrop/status');
}

/**
 * Send taps to earn GHD.
 */
export function sendAirdropTaps(tapCount: number): Promise<AirdropTapResponse> {
  return apiPost<AirdropTapResponse>('airdrop/tap', { tap_count: tapCount });
}

/**
 * Convert GHD to USDT.
 */
export function convertGhdToUsdt(ghdAmount: number): Promise<AirdropConvertResponse> {
  return apiPost<AirdropConvertResponse>('airdrop/convert', { ghd_amount: ghdAmount });
}

/**
 * Get airdrop action history.
 */
export function getAirdropHistory(limit = 50): Promise<AirdropHistoryResponse> {
  return apiGet<AirdropHistoryResponse>('airdrop/history', { limit });
}

/**
 * Get active lottery status.
 */
export function getLotteryStatus(): Promise<LotteryStatusResponse> {
  return apiGet<LotteryStatusResponse>('lottery/status');
}

/**
 * Purchase lottery tickets from internal balance.
 */
export function purchaseLotteryTickets(ticketCount: number): Promise<LotteryPurchaseResponse> {
  return apiPost<LotteryPurchaseResponse>('lottery/purchase', { ticket_count: ticketCount });
}

/**
 * Get lottery history.
 */
export function getLotteryHistory(limit = 20): Promise<LotteryHistoryResponse> {
  return apiGet<LotteryHistoryResponse>('lottery/history', { limit });
}

/**
 * Get lottery winners.
 */
export function getLotteryWinners(lotteryId: number): Promise<LotteryWinnersResponse> {
  return apiGet<LotteryWinnersResponse>('lottery/winners', { lottery_id: lotteryId });
}

/**
 * Get AI Trader status.
 */
export function getAiTraderStatus(): Promise<AiTraderStatusResponse> {
  return apiGet<AiTraderStatusResponse>('ai_trader/status');
}

/**
 * Deposit to AI Trader from wallet.
 */
export function depositToAiTrader(amountUsdt: string): Promise<AiTraderDepositResponse> {
  return apiPost<AiTraderDepositResponse>('ai_trader/deposit', { amount_usdt: amountUsdt });
}

/**
 * Withdraw from AI Trader to wallet.
 * Requires approved withdrawal verification.
 */
export function withdrawFromAiTrader(
  amountUsdt: string,
  verificationId?: number
): Promise<AiTraderWithdrawResponse> {
  return apiPost<AiTraderWithdrawResponse>('ai_trader/withdraw', {
    amount_usdt: amountUsdt,
    verification_id: verificationId,
  });
}

// ==================== AI Trader Withdrawal Verification Types ====================

export interface WithdrawalVerificationResponse {
  verification_id: number;
  verification_tier: 'small' | 'medium' | 'large';
  verification_step: number;
  status: 'pending' | 'verifying' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  withdrawal_amount_usdt: string;
  wallet_address: string | null;
  wallet_network: string | null;
  estimated_completion_time: string | null;
  steps: Array<{
    id: number;
    step_number: number;
    step_type: string;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    completed_at: string | null;
  }>;
  requires_source_of_funds_verification: boolean;
  source_of_funds_verification?: {
    status: string;
    method: string;
    verified_at: string | null;
    expires_at: string | null;
  };
  requires_assisted_verification: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistedVerificationResponse {
  assisted_verification_id: number;
  support_ticket_id: string;
  status: string;
  message: string;
}

// ==================== AI Trader Withdrawal Verification Functions ====================

/**
 * Initiate AI Trader withdrawal verification.
 */
export function initiateAiTraderWithdrawalVerification(
  amountUsdt: string,
  walletAddress?: string,
  walletNetwork?: string
): Promise<WithdrawalVerificationResponse> {
  return apiPost<WithdrawalVerificationResponse>('ai_trader/withdraw/initiate_verification', {
    amount_usdt: amountUsdt,
    wallet_address: walletAddress,
    wallet_network: walletNetwork,
  });
}

/**
 * Get withdrawal verification status.
 */
export function getWithdrawalVerificationStatus(
  verificationId?: number
): Promise<WithdrawalVerificationResponse> {
  if (verificationId) {
    return apiPost<WithdrawalVerificationResponse>('ai_trader/withdraw/verification_status', {
      verification_id: verificationId,
    });
  }
  return apiGet<WithdrawalVerificationResponse>('ai_trader/withdraw/verification_status');
}

/**
 * Complete a verification step.
 */
export function completeVerificationStep(
  verificationId: number,
  stepNumber: number,
  verificationData?: Record<string, unknown>,
  walletAddress?: string,
  walletNetwork?: string
): Promise<WithdrawalVerificationResponse> {
  return apiPost<WithdrawalVerificationResponse>('ai_trader/withdraw/complete_step', {
    verification_id: verificationId,
    step_number: stepNumber,
    verification_data: verificationData,
    wallet_address: walletAddress,
    wallet_network: walletNetwork,
  });
}

/**
 * Verify wallet for source of funds.
 */
export function verifyWalletForSourceOfFunds(
  verificationId: number,
  walletSignature?: string,
  signatureMessage?: string,
  transactionHash?: string,
  proofData?: Record<string, unknown>
): Promise<{ verification_id: number; source_of_funds_verification: Record<string, unknown> }> {
  return apiPost('ai_trader/withdraw/verify_wallet', {
    verification_id: verificationId,
    wallet_signature: walletSignature,
    signature_message: signatureMessage,
    transaction_hash: transactionHash,
    proof_data: proofData,
  });
}

/**
 * Request assisted verification.
 */
export function requestAssistedVerification(
  verificationId: number,
  reason: string,
  userInfo?: Record<string, unknown>
): Promise<AssistedVerificationResponse> {
  return apiPost<AssistedVerificationResponse>('ai_trader/withdraw/request_assistance', {
    verification_id: verificationId,
    reason,
    user_info: userInfo,
  });
}

/**
 * Get AI Trader history.
 */
export function getAiTraderHistory(limit = 50): Promise<AiTraderHistoryResponse> {
  return apiGet<AiTraderHistoryResponse>('ai_trader/history', { limit });
}

/**
 * Initialize blockchain deposit.
 */
export function initDeposit(
  network: 'ERC20' | 'BEP20' | 'TRC20',
  productType: 'wallet_topup' | 'lottery_tickets' | 'ai_trader',
  payload: Record<string, unknown>
): Promise<DepositInitResponse> {
  return apiPost<DepositInitResponse>('payments/deposit/init', {
    network,
    product_type: productType,
    ...payload,
  });
}

// ==================== Referral API Types ====================

export interface ReferralInfo {
  referral_code: string;
  referral_link: string;
  stats: {
    direct_referrals: number;
    indirect_referrals: number;
    total_rewards_usdt: string;
  };
  recent_rewards: ReferralReward[];
}

export interface ReferralReward {
  from_user_id: number;
  level: number;
  amount_usdt: string;
  source_type: string;
  source_id: number | null;
  created_at: string;
}

export interface ReferralLeaderboardEntry {
  user_id: number;
  telegram_id: number;
  username: string | null;
  first_name: string;
  direct_referrals: number;
  total_rewards_usdt: string;
}

export interface ReferralLeaderboardResponse {
  leaderboard: ReferralLeaderboardEntry[];
  limit: number;
}

export interface ReferralHistoryResponse {
  rewards: ReferralReward[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ==================== Referral API Functions ====================

/**
 * Get referral information for current user.
 */
export function getReferralInfo(): Promise<ReferralInfo> {
  return apiGet<ReferralInfo>('referral/info');
}

/**
 * Get referral leaderboard.
 */
export function getReferralLeaderboard(limit = 50): Promise<ReferralLeaderboardResponse> {
  return apiGet<ReferralLeaderboardResponse>('referral/leaderboard', { limit });
}

/**
 * Get referral reward history.
 */
export function getReferralHistory(page = 1, limit = 20): Promise<ReferralHistoryResponse> {
  return apiGet<ReferralHistoryResponse>('referral/history', { page, limit });
}

// ==================== Lottery Pending Rewards & Verification Types ====================

export interface LotteryPendingReward {
  id: number;
  lottery_id: number;
  lottery_title: string;
  reward_type: 'grand_prize' | 'participation';
  reward_amount_usdt: string;
  ticket_count: number;
  status: string;
  created_at: string;
}

export interface VerificationRequest {
  id: number;
  verification_method: 'signature' | 'manual';
  verification_status: 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
  message_to_sign?: string;
  message_nonce?: string;
  expires_at?: string;
  created_at: string;
}

export interface PendingRewardsResponse {
  pending_balance_usdt: string;
  rewards: LotteryPendingReward[];
  can_claim: boolean;
  active_verification_request?: VerificationRequest;
}

export interface VerificationInitiateResponse {
  request_id: number;
  verification_method: 'signature' | 'manual';
  verification_status: string;
  expires_at: string;
  created_at: string;
  message_to_sign?: string;
  message_nonce?: string;
}

export interface VerificationSubmitResponse {
  status: string;
  message: string;
  request_id: number;
}

// ==================== Lottery Pending Rewards & Verification Functions ====================

/**
 * Get user's pending lottery rewards that require verification.
 */
export function getPendingRewards(): Promise<PendingRewardsResponse> {
  return apiGet<PendingRewardsResponse>('lottery/pending-rewards');
}

/**
 * Initiate wallet verification process.
 */
export function initiateVerification(
  verificationMethod: 'signature' | 'manual' = 'signature',
  rewardId?: number
): Promise<VerificationInitiateResponse> {
  return apiPost<VerificationInitiateResponse>('lottery/verify/initiate', {
    verification_method: verificationMethod,
    reward_id: rewardId,
  });
}

/**
 * Submit wallet verification signature.
 */
export function submitVerificationSignature(
  signature: string,
  walletAddress: string,
  walletNetwork: 'ERC20' | 'BEP20' | 'TRC20',
  requestId?: number
): Promise<VerificationSubmitResponse> {
  return apiPost<VerificationSubmitResponse>('lottery/verify/submit', {
    signature,
    wallet_address: walletAddress,
    wallet_network: walletNetwork,
    request_id: requestId,
  });
}

// ==================== Withdrawal Verification Types ====================

export interface WithdrawalVerificationInitiateResponse {
  request_id: number;
  verification_type: 'signature' | 'alternative';
  verification_status: string;
  expires_at: string;
  created_at: string;
  message_to_sign?: string;
  message_nonce?: string;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  educational_content?: {
    title?: string;
    message?: string;
    why_verification?: string;
    next_steps?: string[];
    compliance_note?: string;
  };
}

export interface WithdrawalVerificationSubmitResponse {
  success: boolean;
  request_id: number;
  verification_status: string;
  message: string;
}

// ==================== Withdrawal Verification Functions ====================

/**
 * Initiate withdrawal verification process.
 */
export function initiateWithdrawalVerification(
  amountUsdt: number,
  network: string = 'internal',
  verificationType: 'signature' | 'alternative' = 'signature',
  targetAddress?: string
): Promise<WithdrawalVerificationInitiateResponse> {
  return apiPost<WithdrawalVerificationInitiateResponse>('airdrop/withdrawal/verify/initiate', {
    amount_usdt: amountUsdt,
    network: network,
    verification_type: verificationType,
    target_address: targetAddress,
  });
}

/**
 * Submit withdrawal verification signature.
 */
export function submitWithdrawalVerificationSignature(
  requestId: number,
  signature: string,
  walletAddress: string,
  walletNetwork: 'ERC20' | 'BEP20' | 'TRC20'
): Promise<WithdrawalVerificationSubmitResponse> {
  return apiPost<WithdrawalVerificationSubmitResponse>('airdrop/withdrawal/verify/submit', {
    request_id: requestId,
    signature,
    wallet_address: walletAddress,
    wallet_network: walletNetwork,
  });
}

/**
 * Submit alternative withdrawal verification (for users who can't sign).
 */
export function submitWithdrawalVerificationAlternative(
  requestId: number,
  verificationData: {
    wallet_address: string;
    wallet_network: 'ERC20' | 'BEP20' | 'TRC20';
    reason: string;
    additional_info?: string;
  }
): Promise<WithdrawalVerificationSubmitResponse> {
  return apiPost<WithdrawalVerificationSubmitResponse>('airdrop/withdrawal/verify/alternative', {
    request_id: requestId,
    verification_data: verificationData,
  });
}

// ==================== Universal Wallet Verification Types ====================

export interface UniversalVerificationRequest {
  verification_id: number;
  type: 'lottery' | 'airdrop' | 'ai_trader' | 'withdrawal' | 'general';
  method: 'standard_signature' | 'assisted' | 'multi_signature' | 'time_delayed';
  status: 'pending' | 'processing' | 'verifying' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  amount?: string;
  wallet_address?: string;
  wallet_network?: 'ERC20' | 'BEP20' | 'TRC20';
  message_to_sign?: string;
  message_nonce?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  risk_level?: 'low' | 'medium' | 'high';
  risk_score?: number;
  estimated_completion_time?: string;
}

export interface UniversalVerificationCreateRequest {
  feature: 'lottery' | 'airdrop' | 'ai_trader' | 'withdrawal' | 'general';
  wallet_address: string;
  wallet_network: 'ERC20' | 'BEP20' | 'TRC20';
  method?: 'standard_signature' | 'assisted' | 'multi_signature' | 'time_delayed';
  context?: {
    amount?: string;
    [key: string]: unknown;
  };
}

export interface UniversalVerificationCreateResponse {
  verification_id: number;
  status: string;
  verification_method: string;
  message_to_sign?: string;
  message_nonce?: string;
  expires_at: string;
  risk_level: 'low' | 'medium' | 'high';
  instructions?: string[];
  educational_content?: {
    title?: string;
    message?: string;
    why_verification?: string;
    next_steps?: string[];
    compliance_note?: string;
  };
}

export interface UniversalVerificationSubmitSignatureRequest {
  verification_id: number;
  signature: string;
  wallet_address: string;
  wallet_network: 'ERC20' | 'BEP20' | 'TRC20';
}

export interface UniversalVerificationSubmitSignatureResponse {
  success: boolean;
  verification_id: number;
  status: string;
  message: string;
}

export interface UniversalVerificationStatusResponse {
  verification_id: number;
  status: string;
  type: string;
  method: string;
  amount?: string;
  wallet_address?: string;
  wallet_network?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  risk_level?: 'low' | 'medium' | 'high';
  steps?: Array<{
    id: number;
    step_number: number;
    step_type: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    completed_at?: string;
  }>;
}

// ==================== Universal Wallet Verification Functions ====================

/**
 * Create a new wallet verification request.
 */
export function createWalletVerification(
  request: UniversalVerificationCreateRequest
): Promise<UniversalVerificationCreateResponse> {
  return apiPost<UniversalVerificationCreateResponse>('wallet-verification/create', request);
}

/**
 * Submit signature for wallet verification.
 */
export function submitWalletVerificationSignature(
  request: UniversalVerificationSubmitSignatureRequest
): Promise<UniversalVerificationSubmitSignatureResponse> {
  return apiPost<UniversalVerificationSubmitSignatureResponse>(
    'wallet-verification/submit-signature',
    request
  );
}

/**
 * Get wallet verification status.
 */
export function getWalletVerificationStatus(
  verificationId?: number,
  feature?: string
): Promise<UniversalVerificationStatusResponse> {
  const params: Record<string, string> = {};
  if (verificationId) {
    params.verification_id = String(verificationId);
  }
  if (feature) {
    params.feature = feature;
  }
  return apiGet<UniversalVerificationStatusResponse>('wallet-verification/status', params);
}

/**
 * Submit assisted verification data.
 */
export function submitAssistedVerification(
  verificationId: number,
  data: {
    wallet_address: string;
    wallet_network: 'ERC20' | 'BEP20' | 'TRC20';
    reason: string;
    additional_info?: string;
    contact_preference?: 'telegram' | 'email';
    contact_info?: string;
  }
): Promise<{ success: boolean; support_ticket_id?: string; message: string }> {
  return apiPost('wallet-verification/assisted', {
    verification_id: verificationId,
    ...data,
  });
}

/**
 * Check if user is verified for a feature.
 */
export function isWalletVerified(
  feature: 'lottery' | 'airdrop' | 'ai_trader' | 'withdrawal' | 'general',
  walletAddress?: string
): Promise<{ verified: boolean; verification_id?: number }> {
  const params: Record<string, string> = { feature };
  if (walletAddress) {
    params.wallet_address = walletAddress;
  }
  return apiGet('wallet-verification/is-verified', params);
}

