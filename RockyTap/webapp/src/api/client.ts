/**
 * API client for Ghidar backend.
 * Handles authentication via Telegram initData header.
 * Includes automatic retry logic with exponential backoff.
 */

import { getInitData } from '../lib/telegram';
import * as mockData from './mockData';

// Simple debug logging (no-op in production, logs in development)
const addDebugLog = (type: string, message: string, details?: string): void => {
  if (import.meta.env.DEV) {
    const prefix = type === 'error' || type === 'api_error' ? '❌' : 
                   type === 'warning' ? '⚠️' : 
                   type === 'api_success' ? '✅' : 'ℹ️';
    console.log(`[API ${prefix}] ${message}`, details || '');
  }
};

// API base URL - simple relative path that works
const API_BASE = '/RockyTap/api';

/**
 * Check if mock data should be used.
 * Returns true if:
 * - VITE_ENABLE_MOCK_DATA is explicitly set to 'true'
 * - OR we're in development mode (DEV)
 */
function shouldUseMockData(): boolean {
  // Check for explicit mock data flag (works in both dev and production)
  const enableMock = import.meta.env.VITE_ENABLE_MOCK_DATA;
  if (enableMock === 'true' || enableMock === true) {
    return true;
  }
  // Fall back to dev mode check
  return import.meta.env.DEV === true;
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'FETCH_FAILED'],
};

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Check if an error should trigger a retry.
 */
function shouldRetry(error: ApiError, attempt: number): boolean {
  if (attempt >= RETRY_CONFIG.maxRetries) {
    return false;
  }
  
  // Don't retry authentication or validation errors
  if (['AUTH_ERROR', 'UNAUTHORIZED', 'VALIDATION_ERROR', 'FORBIDDEN'].includes(error.code)) {
    return false;
  }
  
  // Retry network errors
  if (RETRY_CONFIG.retryableErrors.includes(error.code)) {
    return true;
  }
  
  // Retry specific HTTP status codes
  if (error.status && RETRY_CONFIG.retryableStatusCodes.includes(error.status)) {
    return true;
  }
  
  return false;
}

/**
 * Create an AbortController with timeout.
 */
function createTimeoutController(timeoutMs: number = REQUEST_TIMEOUT): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

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
 * XMLHttpRequest-based fetch for WebView compatibility.
 * Some WebViews have issues with the native fetch API.
 */
function xhrFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = options.method || 'GET';
    
    xhr.open(method, url, true);
    
    // Set headers
    const headers = options.headers as Record<string, string> || {};
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    
    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders().trim().split('\r\n').forEach(line => {
        const [key, ...values] = line.split(': ');
        if (key) responseHeaders.append(key, values.join(': '));
      });
      
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
      });
      resolve(response);
    };
    
    xhr.onerror = () => {
      reject(new Error(`XHR network error for ${url}`));
    };
    
    xhr.ontimeout = () => {
      reject(new Error(`XHR timeout for ${url}`));
    };
    
    xhr.timeout = 30000; // 30 second timeout
    
    if (options.body) {
      xhr.send(options.body as string);
    } else {
      xhr.send();
    }
  });
}

/**
 * Fetch with automatic fallback to XMLHttpRequest.
 */
async function fetchWithFallback(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Try native fetch first
    return await fetch(url, options);
  } catch (fetchError) {
    addDebugLog('warning', 'Native fetch failed, trying XHR', fetchError instanceof Error ? fetchError.message : String(fetchError));
    // Fallback to XMLHttpRequest
    return await xhrFetch(url, options);
  }
}

/**
 * Get mock data for a given API path (for local development).
 */
function getMockDataForPath(path: string, method: string = 'GET'): any {
  const normalizedPath = path.replace(/^\//, '').replace(/\/$/, '');
  
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
  
  // Additional endpoints
  if (normalizedPath === 'statistics') return mockData.mockStatisticsResponse;
  if (normalizedPath === 'stat') return mockData.mockPlatformStatResponse;
  if (normalizedPath === 'settings/profile') return mockData.mockUserProfileResponse;
  if (normalizedPath === 'settings/preferences') return mockData.mockUserPreferencesResponse;
  if (normalizedPath === 'notifications') return mockData.mockNotificationsResponse;
  if (normalizedPath.startsWith('transactions/history')) return mockData.mockTransactionHistoryResponse;
  if (normalizedPath.startsWith('help/articles')) return mockData.mockHelpArticlesResponse;
  if (normalizedPath === 'health') return { status: 'ok', timestamp: new Date().toISOString() };
  if (normalizedPath === 'lottery/pending-rewards') return mockData.mockPendingRewardsResponse;
  
  return null;
}

/**
 * Make an authenticated API call with automatic retry logic.
 * Automatically includes Telegram initData in the header.
 * 
 * @param path - API endpoint path (relative to /RockyTap/api/)
 * @param options - Fetch options
 * @param retryOptions - Optional retry configuration
 * @returns Parsed response data
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retryOptions: { skipRetry?: boolean; timeout?: number } = {}
): Promise<T> {
  const initData = getInitData();
  
  // Simple URL construction with trailing slash
  const cleanPath = path.replace(/^\//, '').replace(/\/?$/, '/');
  const url = `${API_BASE}/${cleanPath}`;
  
  // Visible debug logging
  addDebugLog('api_start', `${options.method || 'GET'} ${url}`, `initData: ${initData ? `${initData.length} chars` : 'EMPTY'}`);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Telegram-Data': initData || '',
    ...(options.headers || {}),
  };

  let lastError: ApiError | null = null;
  const maxAttempts = retryOptions.skipRetry ? 1 : RETRY_CONFIG.maxRetries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Wait before retry (not on first attempt)
      if (attempt > 0) {
        const backoff = calculateBackoff(attempt - 1);
        addDebugLog('info', `Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${backoff}ms`);
        await sleep(backoff);
      }

      const startTime = Date.now();
      const controller = createTimeoutController(retryOptions.timeout || REQUEST_TIMEOUT);
      
      // Use native fetch with abort controller for timeout
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;
      addDebugLog('info', `Response: ${res.status} in ${elapsed}ms`);

      // Try to parse the response as JSON
      let json: ApiResponse<T>;
      try {
        const responseText = await res.text();
        
        if (!responseText) {
          addDebugLog('api_error', 'Empty response body');
          throw new ApiError(
            'EMPTY_RESPONSE',
            'Server returned an empty response',
            res.status
          );
        }
        
        json = JSON.parse(responseText);
        addDebugLog('info', `Parsed JSON: success=${json.success}`);
      } catch (parseError) {
        const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
        addDebugLog('api_error', 'JSON parse failed', errMsg);
        
        // Return mock data if enabled (dev mode or VITE_ENABLE_MOCK_DATA=true)
        if (shouldUseMockData()) {
          const mockResponse = getMockDataForPath(path, options.method || 'GET');
          if (mockResponse) {
            console.log(`[MOCK MODE] Using mock data for: ${path}`);
            return mockResponse as T;
          }
        }
        
        throw new ApiError(
          'PARSE_ERROR',
          'Server returned an invalid response. Please try again.',
          res.status
        );
      }

      // Handle non-success responses
      if (!res.ok || !json.success) {
        const errorCode = json.error?.code || 'HTTP_ERROR';
        const errorMessage = json.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        
        addDebugLog('api_error', `${errorCode}: ${errorMessage}`);
        
        // Special handling for authentication errors
        if (errorCode === 'UNAUTHORIZED' || res.status === 401) {
          throw new ApiError(
            'AUTH_ERROR',
            'Authentication failed. Please reopen the app from Telegram.',
            res.status
          );
        }
        
        throw new ApiError(errorCode, errorMessage, res.status);
      }

      addDebugLog('api_success', `${path} succeeded`);
      return json.data as T;
    } catch (error) {
      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new ApiError('TIMEOUT_ERROR', 'Request timed out. Please try again.');
        if (shouldRetry(lastError, attempt)) continue;
        throw lastError;
      }

      // Handle ApiErrors
      if (error instanceof ApiError) {
        lastError = error;
        addDebugLog('api_error', `ApiError: ${error.code}`, error.message);
        
        // Check if we should retry
        if (shouldRetry(error, attempt)) continue;
        throw error;
      }
      
      // Log detailed error info
      const errorName = error instanceof Error ? error.name : 'Unknown';
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog('error', `Network error: ${errorName}`, errorMessage);
      
      const errorInfo = {
        name: errorName,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        url: url,
        path: path,
        attempt: attempt + 1,
      };
      console.error('[API] Network or unexpected error:', errorInfo);
      
      // Create appropriate error
      let apiError: ApiError;
      if (error instanceof TypeError) {
        // TypeError usually indicates network failure
        apiError = new ApiError('NETWORK_ERROR', 'Network connection failed. Please check your internet.');
      } else {
        apiError = new ApiError('NETWORK_ERROR', 'Failed to connect to server. Please check your connection.');
      }
      
      lastError = apiError;
      
      // Check if we should retry
      if (shouldRetry(apiError, attempt)) continue;
      
      // Return mock data if enabled (dev mode or VITE_ENABLE_MOCK_DATA=true)
      if (shouldUseMockData()) {
        const mockResponse = getMockDataForPath(path, options.method || 'GET');
        if (mockResponse) {
          console.log(`[MOCK MODE] Using mock data for: ${path}`);
          await sleep(300);
          return mockResponse as T;
        }
      }
      
      throw apiError;
    }
  }

  // If we've exhausted all retries
  throw lastError || new ApiError('NETWORK_ERROR', 'Request failed after multiple attempts.');
}

/**
 * Check API connectivity without authentication.
 * Returns a diagnostic object with connection status.
 */
export async function checkApiHealth(): Promise<{
  ok: boolean;
  endpoint: string;
  error?: string;
  details?: Record<string, unknown>;
}> {
  const healthUrl = `${API_BASE}/health/`;
  console.log('[API] Health check:', healthUrl);
  
  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('[API] Health check response status:', res.status);
    
    if (!res.ok) {
      return {
        ok: false,
        endpoint: healthUrl,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
    
    const data = await res.json();
    console.log('[API] Health check data:', data);
    
    return {
      ok: true,
      endpoint: healthUrl,
      details: data,
    };
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return {
      ok: false,
      endpoint: healthUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET request helper.
 */
export async function apiGet<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
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

// ==================== Settings API Types ====================

export interface UserProfile {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium?: boolean;
  language_code?: string;
  joining_date?: number | null;
  display_name?: string;
  wallet_verified?: boolean;
  wallet?: WalletData;
}

export interface UserPreferences {
  notifications_enabled: boolean;
  language?: string;
  theme?: string;
}

// ==================== Settings API Functions ====================

/**
 * Get user profile information.
 */
export function getUserProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>('settings/profile');
}

/**
 * Update user profile.
 */
export function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  return apiPost<UserProfile>('settings/profile', updates);
}

/**
 * Get user preferences.
 */
export function getUserPreferences(): Promise<UserPreferences> {
  return apiGet<UserPreferences>('settings/preferences');
}

/**
 * Update user preferences.
 */
export function updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  return apiPost<UserPreferences>('settings/preferences', updates);
}

// ==================== Transaction History API Types ====================

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  };
}

export interface TransactionHistoryParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ==================== Transaction History API Functions ====================

/**
 * Get unified transaction history.
 */
export function getTransactionHistory(params: TransactionHistoryParams = {}): Promise<TransactionHistoryResponse> {
  return apiGet<TransactionHistoryResponse>('transactions/history', params as Record<string, string | number>);
}

// ==================== Help & Support API Types ====================

export interface HelpArticle {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  related_articles?: number[];
  created_at: string;
  updated_at?: string;
}

export interface HelpArticlesResponse {
  articles: HelpArticle[];
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: string;
  created_at: string;
}

export interface SupportTicketCreateRequest {
  subject: string;
  message: string;
}

export interface SupportTicketCreateResponse {
  ticket_id: number;
  status: string;
  message: string;
}

// ==================== Help & Support API Functions ====================

/**
 * Get help articles.
 */
export function getHelpArticles(category?: string): Promise<HelpArticlesResponse> {
  const params: Record<string, string> = {};
  if (category) {
    params.category = category;
  }
  return apiGet<HelpArticlesResponse>('help/articles', params);
}

/**
 * Search help articles.
 */
export function searchHelpArticles(query: string): Promise<HelpArticlesResponse> {
  return apiGet<HelpArticlesResponse>('help/search', { q: query });
}

/**
 * Create a support ticket.
 */
export function createSupportTicket(data: SupportTicketCreateRequest): Promise<SupportTicketCreateResponse> {
  return apiPost<SupportTicketCreateResponse>('support/ticket/create', data);
}

/**
 * Get support ticket status.
 */
export function getSupportTicketStatus(ticketId: number): Promise<SupportTicket> {
  return apiGet<SupportTicket>('support/ticket/status', { ticket_id: ticketId });
}

// ==================== Notifications API Types ====================

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface NotificationsParams {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

// ==================== Notifications API Functions ====================

/**
 * Get user notifications.
 */
export function getNotifications(params: NotificationsParams = {}): Promise<NotificationsResponse> {
  const cleanParams: Record<string, string | number | boolean> = {};
  if (params.unread_only !== undefined) cleanParams.unread_only = params.unread_only;
  if (params.limit !== undefined) cleanParams.limit = params.limit;
  if (params.offset !== undefined) cleanParams.offset = params.offset;
  return apiGet<NotificationsResponse>('notifications', cleanParams);
}

/**
 * Mark a notification as read.
 */
export function markNotificationRead(notificationId: number): Promise<void> {
  return apiPost('notifications/read', { notification_id: notificationId });
}

/**
 * Mark all notifications as read.
 */
export function markAllNotificationsRead(): Promise<void> {
  return apiPost('notifications/read-all', {});
}

// ==================== Statistics API Types ====================

export interface ActivityDataPoint {
  date: string;
  taps: number;
  earnings: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
  progress?: number;
  target?: number;
}

export interface UserStatistics {
  total_ghd_earned: number;
  total_usdt_earned: number;
  lottery_winnings: number;
  referral_rewards: number;
  ai_trader_pnl: number;
  total_taps: number;
  lottery_tickets_purchased: number;
  total_referrals: number;
  days_active: number;
  activity_data: ActivityDataPoint[];
  achievements: Achievement[];
}

// ==================== Statistics API Functions ====================

/**
 * Get user statistics.
 */
export function getUserStatistics(): Promise<UserStatistics> {
  return apiGet<UserStatistics>('statistics');
}

// ==================== Deposit Status API Types ====================

export interface DepositStatus {
  deposit_id: number;
  status: 'pending' | 'confirmed' | 'failed';
  tx_hash?: string;
  confirmations?: number;
  actual_amount_usdt?: string;
  network: string;
}

// ==================== Deposit Status API Functions ====================

/**
 * Get deposit status.
 */
export function getDepositStatus(depositId: number): Promise<DepositStatus> {
  return apiGet<DepositStatus>('payments/deposit/status', { deposit_id: depositId });
}

// ==================== Platform Statistics API Types ====================

export interface PlatformStatistics {
  total_players: number;
  daily: number;
  online: number;
  totalCoins: number;
  totalTaps: number;
}

// ==================== Platform Statistics API Functions ====================

/**
 * Get platform statistics (total users, online users, daily stats).
 */
export function getStatistics(): Promise<PlatformStatistics> {
  return apiGet<PlatformStatistics>('stat');
}

