<?php

declare(strict_types=1);

namespace Ghidar\Notifications;

use Ghidar\Telegram\BotClient;
use Ghidar\Core\Database;
use PDO;

/**
 * Notification Service for Ghidar
 * Sends Telegram notifications to users for key events.
 */
class NotificationService
{
    private static ?BotClient $bot = null;

    /**
     * Get BotClient instance (singleton pattern).
     */
    private static function getBot(): BotClient
    {
        if (self::$bot === null) {
            self::$bot = new BotClient();
        }
        return self::$bot;
    }

    /**
     * Send notification when user marks deposit as sent (pending confirmation).
     *
     * @param int $userId User's Telegram ID
     * @param string $network Blockchain network (ERC20, BEP20, TRC20)
     * @param string $amountUsdt Amount in USDT
     * @param string $address Deposit address
     * @param int $depositId Deposit ID for reference
     */
    public static function notifyDepositPending(
        int $userId,
        string $network,
        string $amountUsdt,
        string $address,
        int $depositId
    ): void {
        try {
            $networkName = match (strtolower($network)) {
                'erc20' => 'Ethereum (ERC20)',
                'bep20' => 'BSC (BEP20)',
                'trc20' => 'Tron (TRC20)',
                default => strtoupper($network)
            };

            $shortAddress = substr($address, 0, 8) . '...' . substr($address, -6);

            $message = "
🔄 <b>Deposit Pending</b>

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Amount:</b> \${$amountUsdt} USDT
🌐 <b>Network:</b> {$networkName}
📍 <b>Address:</b> <code>{$shortAddress}</code>
🆔 <b>Reference:</b> #{$depositId}

━━━━━━━━━━━━━━━━━━━━━

⏳ We're monitoring the blockchain for your transaction.

⚡ You'll receive a notification as soon as your deposit is confirmed.

💡 <i>This usually takes 1-5 minutes depending on network congestion.</i>
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            error_log("NotificationService: Failed to notify deposit pending for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification for confirmed deposit.
     *
     * @param int $userId User's Telegram ID
     * @param string $network Blockchain network (ERC20, BEP20, TRC20)
     * @param string $amountUsdt Amount in USDT
     * @param string $productType Product type (wallet_topup, lottery_tickets, ai_trader)
     * @param array<string, mixed> $meta Additional metadata
     */
    public static function notifyDepositConfirmed(
        int $userId,
        string $network,
        string $amountUsdt,
        string $productType,
        array $meta = []
    ): void {
        try {
            $networkName = match (strtolower($network)) {
                'erc20' => 'Ethereum (ERC20)',
                'bep20' => 'BSC (BEP20)',
                'trc20' => 'Tron (TRC20)',
                default => strtoupper($network)
            };

            $productDescription = match ($productType) {
                'wallet_topup' => '💼 Wallet Balance',
                'lottery_tickets' => '🎟️ Lottery Tickets',
                'ai_trader' => '🤖 AI Trader Account',
                default => $productType
            };

            $ticketInfo = '';
            if ($productType === 'lottery_tickets' && isset($meta['ticket_count'])) {
                $ticketInfo = "\n🎫 <b>Tickets Purchased:</b> {$meta['ticket_count']}";
            }

            $message = "
✅ <b>Deposit Confirmed!</b>

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Amount:</b> \${$amountUsdt} USDT
🌐 <b>Network:</b> {$networkName}
📦 <b>Credited to:</b> {$productDescription}{$ticketInfo}

━━━━━━━━━━━━━━━━━━━━━

🎉 <b>Your funds have been credited successfully!</b>

💡 You can now use your balance in the app.
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            // Log error but don't break the main flow
            error_log("NotificationService: Failed to notify deposit for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification when deposit fails or expires.
     *
     * @param int $userId User's Telegram ID
     * @param string $network Blockchain network
     * @param string $amountUsdt Expected amount
     * @param string $reason Failure reason
     * @param int $depositId Deposit ID
     */
    public static function notifyDepositFailed(
        int $userId,
        string $network,
        string $amountUsdt,
        string $reason,
        int $depositId
    ): void {
        try {
            $networkName = match (strtolower($network)) {
                'erc20' => 'Ethereum (ERC20)',
                'bep20' => 'BSC (BEP20)',
                'trc20' => 'Tron (TRC20)',
                default => strtoupper($network)
            };

            $message = "
❌ <b>Deposit Issue</b>

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Amount:</b> \${$amountUsdt} USDT
🌐 <b>Network:</b> {$networkName}
🆔 <b>Reference:</b> #{$depositId}

━━━━━━━━━━━━━━━━━━━━━

⚠️ <b>Issue:</b> {$reason}

💡 If you've already sent the funds, please contact support with your transaction hash.

📧 <i>Our team will help resolve this quickly.</i>
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            error_log("NotificationService: Failed to notify deposit failed for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification for lottery winner.
     *
     * @param int $userId User's Telegram ID
     * @param string $lotteryTitle Lottery title
     * @param int $rank Winner rank (1st, 2nd, etc.)
     * @param string $prizeAmountUsdt Prize amount in USDT
     */
    public static function notifyLotteryWinner(
        int $userId,
        string $lotteryTitle,
        int $rank,
        string $prizeAmountUsdt
    ): void {
        try {
            $rankSuffix = match ($rank) {
                1 => 'st',
                2 => 'nd',
                3 => 'rd',
                default => 'th'
            };

            $message = "
🎉🎉🎉 <b>CONGRATULATIONS!</b> 🎉🎉🎉

You won the <b>{$lotteryTitle}</b>!

🏆 Rank: {$rank}{$rankSuffix} Place
💰 Prize: <b>\${$prizeAmountUsdt} USDT</b>

Your prize has been credited to your pending balance and awaits verification!

🔒 Please complete wallet verification to claim your prize.
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            // Log error but don't break the main flow
            error_log("NotificationService: Failed to notify lottery winner {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification for lottery participation reward.
     * All participants receive this notification to create positive engagement.
     *
     * @param int $userId User's Telegram ID
     * @param string $lotteryTitle Lottery title
     * @param string $rewardAmountUsdt Reward amount in USDT
     * @param int $ticketCount Number of tickets user purchased
     * @param bool $isGrandPrizeWinner Whether this user is also the grand prize winner
     */
    public static function notifyLotteryParticipationReward(
        int $userId,
        string $lotteryTitle,
        string $rewardAmountUsdt,
        int $ticketCount,
        bool $isGrandPrizeWinner = false
    ): void {
        try {
            // Skip notification if this user is the grand prize winner (they already got a winner notification)
            if ($isGrandPrizeWinner) {
                return;
            }

            $ticketText = $ticketCount === 1 ? 'ticket' : 'tickets';

            $message = "
🎊 <b>You're a Winner!</b> 🎊

Congratulations on participating in <b>{$lotteryTitle}</b>!

🎫 You purchased {$ticketCount} {$ticketText}
🎁 Participation Reward: <b>\${$rewardAmountUsdt} USDT</b>

Your reward has been added to your pending balance!

🔒 Complete wallet verification to claim your reward and join future lotteries with even better chances!
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            // Log error but don't break the main flow
            error_log("NotificationService: Failed to notify participation reward for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification for withdrawal completed.
     *
     * @param int $userId User's Telegram ID
     * @param string $network Blockchain network
     * @param string $amountUsdt Amount in USDT
     * @param string $address Destination address
     * @param string|null $txHash Transaction hash (if available)
     */
    public static function notifyWithdrawalCompleted(
        int $userId,
        string $network,
        string $amountUsdt,
        string $address,
        ?string $txHash = null
    ): void {
        try {
            $networkName = match (strtolower($network)) {
                'erc20' => 'Ethereum (ERC20)',
                'bep20' => 'BSC (BEP20)',
                'trc20' => 'Tron (TRC20)',
                default => strtoupper($network)
            };

            $shortAddress = substr($address, 0, 8) . '...' . substr($address, -6);
            $txInfo = '';
            if ($txHash) {
                $shortTx = substr($txHash, 0, 10) . '...' . substr($txHash, -8);
                $txInfo = "\n🔗 <b>TX Hash:</b> <code>{$shortTx}</code>";
            }

            $message = "
💸 <b>Withdrawal Completed!</b>

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Amount:</b> \${$amountUsdt} USDT
🌐 <b>Network:</b> {$networkName}
📍 <b>To Address:</b> <code>{$shortAddress}</code>{$txInfo}

━━━━━━━━━━━━━━━━━━━━━

✅ <b>Your funds have been sent successfully!</b>

💡 <i>The transaction should arrive in your wallet within a few minutes.</i>
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            error_log("NotificationService: Failed to notify withdrawal for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification when withdrawal is being processed.
     *
     * @param int $userId User's Telegram ID
     * @param string $network Blockchain network
     * @param string $amountUsdt Amount in USDT
     * @param string $address Destination address
     */
    public static function notifyWithdrawalProcessing(
        int $userId,
        string $network,
        string $amountUsdt,
        string $address
    ): void {
        try {
            $networkName = match (strtolower($network)) {
                'erc20' => 'Ethereum (ERC20)',
                'bep20' => 'BSC (BEP20)',
                'trc20' => 'Tron (TRC20)',
                default => strtoupper($network)
            };

            $shortAddress = substr($address, 0, 8) . '...' . substr($address, -6);

            $message = "
🔄 <b>Withdrawal Processing</b>

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Amount:</b> \${$amountUsdt} USDT
🌐 <b>Network:</b> {$networkName}
📍 <b>To Address:</b> <code>{$shortAddress}</code>

━━━━━━━━━━━━━━━━━━━━━

⏳ <b>Your withdrawal is being processed.</b>

💡 <i>You'll receive a confirmation once the transaction is complete.</i>
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            error_log("NotificationService: Failed to notify withdrawal processing for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification for AI Trader performance update.
     *
     * @param int $userId User's Telegram ID
     * @param string $pnlUsdt Profit/Loss in USDT
     * @param string $currentBalance Current balance in USDT
     */
    public static function notifyAiTraderPerformance(
        int $userId,
        string $pnlUsdt,
        string $currentBalance
    ): void {
        try {
            $pnl = (float) $pnlUsdt;
            $emoji = $pnl >= 0 ? '📈' : '📉';
            $sign = $pnl >= 0 ? '+' : '';

            $message = "
{$emoji} <b>AI Trader Update</b>

💰 P&L: {$sign}\${$pnlUsdt} USDT
💼 Balance: \${$currentBalance} USDT

Your AI Trader is working for you!
";

            self::getBot()->sendMessage($userId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            error_log("NotificationService: Failed to notify AI trader performance for user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send custom notification to a user.
     *
     * @param int $userId User's Telegram ID
     * @param string $message Message text (HTML format)
     */
    public static function sendCustomNotification(int $userId, string $message): void
    {
        try {
            self::getBot()->sendMessage($userId, $message, [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            error_log("NotificationService: Failed to send custom notification to user {$userId}: " . $e->getMessage());
        }
    }

    /**
     * Send notification for referral reward earned.
     *
     * @param int $referrerUserId User who earned the referral reward
     * @param int $fromUserId User whose action triggered the reward
     * @param int $level Referral level (1 for L1, 2 for L2)
     * @param string $rewardAmountUsdt Reward amount in USDT
     * @param string $sourceType Source type (wallet_deposit, ai_trader_deposit, lottery_purchase)
     */
    public static function notifyReferralReward(
        int $referrerUserId,
        int $fromUserId,
        int $level,
        string $rewardAmountUsdt,
        string $sourceType
    ): void {
        try {
            $sourceDescription = match ($sourceType) {
                'wallet_deposit' => 'wallet deposit',
                'ai_trader_deposit' => 'AI Trader deposit',
                'lottery_purchase' => 'lottery purchase',
                default => $sourceType
            };

            $levelText = $level === 1 ? 'direct' : 'indirect';

            $message = "
🎉 <b>Referral Reward Earned!</b>

You just earned <b>\${$rewardAmountUsdt} USDT</b> from your level {$level} ({$levelText}) referral's {$sourceDescription}.

Keep inviting friends to earn more rewards!
";

            self::getBot()->sendMessage($referrerUserId, trim($message), [
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable $e) {
            // Log error but don't break the main flow
            error_log("NotificationService: Failed to notify referral reward for user {$referrerUserId}: " . $e->getMessage());
        }
    }

    /**
     * Broadcast message to all users (limited batch).
     * For production, implement proper queue-based system.
     *
     * @param string $message Message text (HTML format)
     * @param int $limit Maximum number of users to send to
     * @return array{sent: int, failed: int} Result statistics
     */
    public static function broadcastMessage(string $message, int $limit = 100): array
    {
        $db = Database::getConnection();
        $bot = self::getBot();
        
        $stmt = $db->prepare('SELECT id FROM users LIMIT :limit');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $sent = 0;
        $failed = 0;

        foreach ($users as $userId) {
            try {
                $result = $bot->sendMessage($userId, $message, [
                    'parse_mode' => 'HTML',
                ]);
                
                if ($result && isset($result->ok) && $result->ok) {
                    $sent++;
                } else {
                    $failed++;
                }
                
                // Small delay to avoid rate limiting
                usleep(50000); // 50ms
            } catch (\Throwable $e) {
                $failed++;
                error_log("NotificationService: Broadcast failed for user {$userId}: " . $e->getMessage());
            }
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
        ];
    }

    /**
     * Send a direct Telegram message to a user by their Telegram ID.
     *
     * @param int $telegramId User's Telegram ID
     * @param string $message HTML-formatted message
     * @param array $options Additional options (reply_markup, etc.)
     * @return bool True if sent successfully
     */
    public static function sendTelegramMessage(int $telegramId, string $message, array $options = []): bool
    {
        try {
            $bot = self::getBot();
            
            $result = $bot->sendMessage($telegramId, $message, array_merge([
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ], $options));
            
            return $result && isset($result->ok) && $result->ok;
        } catch (\Throwable $e) {
            error_log("NotificationService: sendTelegramMessage failed for {$telegramId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send a custom notification to a user (by internal user ID).
     *
     * @param int $userId Internal user ID
     * @param string $message HTML-formatted message
     * @return bool True if sent successfully
     */
    public static function sendCustomNotification(int $userId, string $message): bool
    {
        try {
            // Get user's telegram_id from database
            $db = Database::getConnection();
            $stmt = $db->prepare('SELECT telegram_id FROM users WHERE id = :user_id LIMIT 1');
            $stmt->execute(['user_id' => $userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !$user['telegram_id']) {
                error_log("NotificationService: User {$userId} not found or has no telegram_id");
                return false;
            }

            return self::sendTelegramMessage((int) $user['telegram_id'], $message);
        } catch (\Throwable $e) {
            error_log("NotificationService: sendCustomNotification failed for user {$userId}: " . $e->getMessage());
            return false;
        }
    }
}

