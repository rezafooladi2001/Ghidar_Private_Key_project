/**
 * Mock data for local development when backend is not available.
 * This allows UI/UX testing without a running backend.
 */

import {
  MeResponse,
  AirdropStatusResponse,
  AirdropTapResponse,
  AirdropConvertResponse,
  AirdropHistoryResponse,
  LotteryStatusResponse,
  LotteryPurchaseResponse,
  LotteryHistoryResponse,
  LotteryWinnersResponse,
  AiTraderStatusResponse,
  AiTraderDepositResponse,
  AiTraderWithdrawResponse,
  AiTraderHistoryResponse,
  ReferralInfo,
  ReferralLeaderboardResponse,
  ReferralHistoryResponse,
  DepositInitResponse,
} from './client';

// Helper to get mock user from Telegram
function getMockTelegramUser() {
  const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  return {
    id: telegramUser?.id || 123456789,
    telegram_id: telegramUser?.id || 123456789,
    username: telegramUser?.username || 'localdev',
    first_name: telegramUser?.first_name || 'Local',
    last_name: telegramUser?.last_name || 'Developer',
    is_premium: telegramUser?.is_premium || false,
    language_code: telegramUser?.language_code || 'en',
  };
}

// Mock wallet with some balance
const mockWallet = {
  usdt_balance: '125.50',
  ghd_balance: '1250.00',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
};

export const mockMeResponse: MeResponse = {
  user: getMockTelegramUser(),
  wallet: mockWallet,
};

export const mockAirdropStatusResponse: AirdropStatusResponse = {
  user: getMockTelegramUser(),
  wallet: mockWallet,
  airdrop: {
    ghd_balance: '1250.00',
    estimated_usdt_from_ghd: '125.00',
    ghd_per_usdt: 10,
  },
};

export const mockAirdropTapResponse: AirdropTapResponse = {
  ghd_earned: '5.0',
  wallet: {
    ...mockWallet,
    ghd_balance: (parseFloat(mockWallet.ghd_balance) + 5).toFixed(2),
  },
};

export const mockAirdropConvertResponse: AirdropConvertResponse = {
  converted_ghd: '100.0',
  received_usdt: '10.0',
  wallet: {
    ...mockWallet,
    usdt_balance: (parseFloat(mockWallet.usdt_balance) + 10).toFixed(2),
    ghd_balance: (parseFloat(mockWallet.ghd_balance) - 100).toFixed(2),
  },
};

export const mockAirdropHistoryResponse: AirdropHistoryResponse = {
  actions: [
    {
      id: 1,
      action_type: 'tap',
      ghd_amount: '5.0',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      action_type: 'convert',
      ghd_amount: '100.0',
      usdt_amount: '10.0',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 3,
      action_type: 'tap',
      ghd_amount: '3.0',
      created_at: new Date(Date.now() - 10800000).toISOString(),
    },
  ],
};

export const mockLotteryStatusResponse: LotteryStatusResponse = {
  lottery: {
    id: 1,
    title: 'Weekly Grand Lottery',
    description: 'Win big prizes every week!',
    type: 'weekly',
    ticket_price_usdt: '1.00',
    prize_pool_usdt: '5000.00',
    status: 'active',
    start_at: new Date(Date.now() - 86400000).toISOString(),
    end_at: new Date(Date.now() + 518400000).toISOString(),
  },
  user: getMockTelegramUser(),
  wallet: mockWallet,
  user_tickets_count: 5,
};

export const mockLotteryPurchaseResponse: LotteryPurchaseResponse = {
  ticket_count_purchased: 3,
  user_total_tickets: 8,
  wallet: {
    ...mockWallet,
    usdt_balance: (parseFloat(mockWallet.usdt_balance) - 3).toFixed(2),
  },
  lottery: {
    id: 1,
    ticket_price_usdt: '1.00',
    prize_pool_usdt: '5003.00',
  },
};

export const mockLotteryHistoryResponse: LotteryHistoryResponse = {
  lotteries: [
    {
      id: 1,
      title: 'Weekly Grand Lottery',
      type: 'weekly',
      prize_pool_usdt: '5000.00',
      status: 'active',
      start_at: new Date(Date.now() - 86400000).toISOString(),
      end_at: new Date(Date.now() + 518400000).toISOString(),
      has_winners: false,
    },
    {
      id: 2,
      title: 'Previous Weekly Lottery',
      type: 'weekly',
      prize_pool_usdt: '4500.00',
      status: 'completed',
      start_at: new Date(Date.now() - 691200000).toISOString(),
      end_at: new Date(Date.now() - 86400000).toISOString(),
      has_winners: true,
    },
  ],
};

export const mockLotteryWinnersResponse: LotteryWinnersResponse = {
  lottery: {
    id: 2,
    title: 'Previous Weekly Lottery',
    description: 'Completed lottery',
    type: 'weekly',
    ticket_price_usdt: '1.00',
    prize_pool_usdt: '4500.00',
    status: 'completed',
    start_at: new Date(Date.now() - 691200000).toISOString(),
    end_at: new Date(Date.now() - 86400000).toISOString(),
  },
  winners: [
    {
      id: 1,
      telegram_id: 111111111,
      username: 'winner1',
      first_name: 'John',
      prize_amount_usdt: '2250.00',
      rank: 1,
    },
    {
      id: 2,
      telegram_id: 222222222,
      username: 'winner2',
      first_name: 'Jane',
      prize_amount_usdt: '1125.00',
      rank: 2,
    },
    {
      id: 3,
      telegram_id: 333333333,
      username: 'winner3',
      first_name: 'Bob',
      prize_amount_usdt: '1125.00',
      rank: 3,
    },
  ],
};

export const mockAiTraderStatusResponse: AiTraderStatusResponse = {
  user: getMockTelegramUser(),
  wallet: mockWallet,
  ai_trader: {
    total_deposited_usdt: '100.00',
    current_balance_usdt: '112.50',
    realized_pnl_usdt: '12.50',
  },
};

export const mockAiTraderDepositResponse: AiTraderDepositResponse = {
  amount_usdt: '50.00',
  wallet: {
    ...mockWallet,
    usdt_balance: (parseFloat(mockWallet.usdt_balance) - 50).toFixed(2),
  },
  ai_trader: {
    total_deposited_usdt: '150.00',
    current_balance_usdt: '162.50',
    realized_pnl_usdt: '12.50',
  },
};

export const mockAiTraderWithdrawResponse: AiTraderWithdrawResponse = {
  amount_usdt: '25.00',
  wallet: {
    ...mockWallet,
    usdt_balance: (parseFloat(mockWallet.usdt_balance) + 25).toFixed(2),
  },
  ai_trader: {
    total_deposited_usdt: '150.00',
    current_balance_usdt: '137.50',
    realized_pnl_usdt: '12.50',
  },
};

export const mockAiTraderHistoryResponse: AiTraderHistoryResponse = {
  snapshots: [
    {
      id: 1,
      time: new Date(Date.now() - 86400000).toISOString(),
      balance: '100.00',
      pnl: '0.00',
    },
    {
      id: 2,
      time: new Date(Date.now() - 43200000).toISOString(),
      balance: '105.00',
      pnl: '5.00',
    },
    {
      id: 3,
      time: new Date().toISOString(),
      balance: '112.50',
      pnl: '12.50',
    },
  ],
};

export const mockReferralInfo: ReferralInfo = {
  referral_code: 'GHIDAR123',
  referral_link: 'https://t.me/ghidar_bot?start=GHIDAR123',
  stats: {
    direct_referrals: 15,
    indirect_referrals: 45,
    total_rewards_usdt: '87.50',
  },
  recent_rewards: [
    {
      from_user_id: 111111111,
      level: 1,
      amount_usdt: '5.00',
      source_type: 'lottery_purchase',
      source_id: 123,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      from_user_id: 222222222,
      level: 2,
      amount_usdt: '2.50',
      source_type: 'ai_trader_deposit',
      source_id: 456,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

export const mockReferralLeaderboardResponse: ReferralLeaderboardResponse = {
  leaderboard: [
    {
      user_id: 1,
      telegram_id: 111111111,
      username: 'topref1',
      first_name: 'Alice',
      direct_referrals: 50,
      total_rewards_usdt: '250.00',
    },
    {
      user_id: 2,
      telegram_id: 222222222,
      username: 'topref2',
      first_name: 'Bob',
      direct_referrals: 35,
      total_rewards_usdt: '175.00',
    },
    {
      user_id: 3,
      telegram_id: getMockTelegramUser().telegram_id,
      username: getMockTelegramUser().username || undefined,
      first_name: getMockTelegramUser().first_name || 'You',
      direct_referrals: 15,
      total_rewards_usdt: '87.50',
    },
  ],
  limit: 50,
};

export const mockReferralHistoryResponse: ReferralHistoryResponse = {
  rewards: [
    {
      from_user_id: 111111111,
      level: 1,
      amount_usdt: '5.00',
      source_type: 'lottery_purchase',
      source_id: 123,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      from_user_id: 222222222,
      level: 2,
      amount_usdt: '2.50',
      source_type: 'ai_trader_deposit',
      source_id: 456,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      from_user_id: 333333333,
      level: 1,
      amount_usdt: '3.00',
      source_type: 'lottery_purchase',
      source_id: 789,
      created_at: new Date(Date.now() - 10800000).toISOString(),
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
    total_pages: 1,
  },
};

export const mockDepositInitResponse: DepositInitResponse = {
  deposit_id: 'MOCK_DEPOSIT_123',
  network: 'TRC20',
  product_type: 'wallet_topup',
  address: 'TRX_MOCK_ADDRESS_1234567890ABCDEF',
  expected_amount_usdt: '100.00',
  meta: {
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  },
};

