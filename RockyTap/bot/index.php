<?php
/**
 * Telegram Bot Webhook Handler for Ghidar
 * Handles incoming Telegram updates and bot commands.
 */

require_once __DIR__ . '/../../bootstrap.php';

use Ghidar\Config\Config;
use Ghidar\Telegram\BotClient;
use Ghidar\Referral\ReferralService;
use Ghidar\Core\Database;

include './config.php';
include './functions.php';

// Initialize Telegram Bot Client
$bot = new BotClient();

// Database connection using PDO
$pdo = Database::getConnection();


$update = json_decode(file_get_contents('php://input'));
if(isset($update->message)) {
@$msg = $update->message->text;
@$chat_id = $update->message->chat->id;
@$from_id = $update->message->from->id;
@$first_name = $update->message->from->first_name;
@$last_name = $update->message->from->last_name?:null;
@$username = $update->message->from->username?:null;
@$is_premium = $update->message->from->is_premium;
@$language_code = $update->message->from->language_code?:'en';
@$chat_type = $update->message->chat->type;
@$message_id = $update->message->message_id;
@$reply_message_id = $update->message->reply_to_message->message_id?:null;
}


if ($chat_type !== 'private') {
    die;
}

// Handle /start with referral payload (e.g., /start ref_123)
if (explode(' ', $msg)[0] === '/start' && isset(explode(' ', $msg)[1])) {
    $payload = explode(' ', $msg)[1];
    
    // Check if payload is a referral code (ref_123 format)
    if (strpos($payload, 'ref_') === 0) {
        $referrerIdStr = substr($payload, 4);
        
        if (is_numeric($referrerIdStr)) {
            $referrerId = (int) $referrerIdStr;
            
            // Ensure user exists first (create if needed)
            $stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
            $stmt->execute(['id' => $from_id]);
            $UserDataBase = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$UserDataBase) {
                $time = time();
                $stmt = $pdo->prepare('INSERT INTO `users` (`id`, `first_name`, `last_name`, `username`, `language_code`, `joining_date`, `is_premium`) VALUES (:id, :first_name, :last_name, :username, :language_code, :joining_date, :is_premium)');
                $stmt->execute([
                    'id' => $from_id,
                    'first_name' => $first_name,
                    'last_name' => $last_name,
                    'username' => $username,
                    'language_code' => $language_code,
                    'joining_date' => $time,
                    'is_premium' => $is_premium
                ]);
            }
            
            // Try to attach referrer using ReferralService
            try {
                ReferralService::attachReferrerIfEmpty($from_id, $referrerId);
                
                // Legacy: Update referrer's balance and referral count (keep for backward compatibility)
                $balance = 2500;
                if($is_premium) $balance = 10000;
                $stmt = $pdo->prepare('UPDATE `users` SET `balance` = `balance` + :balance, `totalReferralsRewards` = `totalReferralsRewards` + :balance2, `referrals` = `referrals` + 1 WHERE `id` = :referrer_id AND EXISTS (SELECT 1 FROM `users` WHERE `id` = :from_id AND `inviter_id` = :referrer_id2) LIMIT 1');
                $stmt->execute([
                    'balance' => $balance,
                    'balance2' => $balance,
                    'referrer_id' => $referrerId,
                    'from_id' => $from_id,
                    'referrer_id2' => $referrerId
                ]);
                
                // Notify referrer
                $invited_name = str_replace(['<', '>', '&'], ['&lt;', '&gt;', '&amp;'], $first_name);
                $bot->sendMessage($referrerId, "congratulations 🌱\n<b>$invited_name</b> joined the bot by your link", [
                    'parse_mode' => 'HTML',
                ]);
            } catch (\InvalidArgumentException $e) {
                // Invalid referrer or self-referral - silently continue
            } catch (\Exception $e) {
                // Log error but continue
                error_log("ReferralService error in bot: " . $e->getMessage());
            }
            
            $bot->sendPhoto($from_id, new CURLFILE('main.png'), [
                'caption' => '
<b>💎 Welcome to Ghidar!</b>

Your gateway to crypto opportunities:

🎟️ <b>Lottery</b> - Buy tickets and win big prizes
⛏️ <b>Airdrop</b> - Mine GHD tokens daily
📈 <b>AI Trader</b> - Let AI trade for you

You joined through a referral link - both you and your friend earned bonus coins!

Invite more friends to earn even more rewards.
',
                'parse_mode' => 'HTML',
                'reply_to_message_id' => $message_id,
                'reply_markup' => json_encode([
                    'inline_keyboard' => [
                        [['text' => '💎 Open Ghidar', 'web_app' => ['url' => $web_app]]],
                    ]
                ])
            ]);
            
            die;
        }
    }
}




$stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
$stmt->execute(['id' => $from_id]);
$UserDataBase = $stmt->fetch(\PDO::FETCH_ASSOC);
if (!$UserDataBase) {
    $time = time();
    $stmt = $pdo->prepare('INSERT INTO `users` (`id`, `first_name`, `last_name`, `username`, `language_code`, `joining_date`, `is_premium`) VALUES (:id, :first_name, :last_name, :username, :language_code, :joining_date, :is_premium)');
    $stmt->execute([
        'id' => $from_id,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'username' => $username,
        'language_code' => $language_code,
        'joining_date' => $time,
        'is_premium' => $is_premium
    ]);
}


if ($UserDataBase['step'] == 'banned') {
    $bot->sendMessage($from_id, '<b>You Are Banned From The Bot.</b>', [
        'parse_mode' => 'HTML',
        'reply_markup' => json_encode([
            'KeyboardRemove' => [],
            'remove_keyboard' => true
        ])
    ]);
    die;
}


if ($msg === '/start') {
    $bot->sendPhoto($from_id, new CURLFILE('main.png'), [
        'caption' => '
<b>💎 Welcome to Ghidar!</b>

Your gateway to crypto opportunities:

🎟️ <b>Lottery</b> - Buy tickets and win big prizes
⛏️ <b>Airdrop</b> - Mine GHD tokens daily
📈 <b>AI Trader</b> - Let AI trade for you

Start earning now - tap the button below to open the app!
',
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => json_encode([
            'inline_keyboard' => [
                [['text' => '💎 Open Ghidar', 'web_app' => ['url' => $web_app]]],
            ]
        ])
    ]);
    die;
}

// /help command
if ($msg === '/help') {
    $bot->sendMessage($from_id, '
<b>💎 Ghidar Help</b>

<b>Available Commands:</b>
/start - Start the bot and open the app
/help - Show this help message
/referral - Get your referral link and stats

<b>Features:</b>
🎟️ <b>Lottery</b> - Purchase tickets and participate in weekly draws
⛏️ <b>Airdrop</b> - Tap to mine GHD tokens and convert to USDT
📈 <b>AI Trader</b> - Deposit USDT and let our AI trade for you
👥 <b>Referrals</b> - Invite friends and earn USDT commissions

<b>Need Support?</b>
Contact our support team through the app.
', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => json_encode([
            'inline_keyboard' => [
                [['text' => '💎 Open Ghidar', 'web_app' => ['url' => $web_app]]],
            ]
        ])
    ]);
    die;
}

// /referral command
if ($msg === '/referral') {
    try {
        $referralInfo = ReferralService::getReferralInfo($from_id);
        
        $stats = $referralInfo['stats'];
        $message = "
<b>👥 Your Referral Program</b>

🔗 <b>Your Referral Link:</b>
<code>{$referralInfo['referral_link']}</code>

📊 <b>Statistics:</b>
👤 Direct Referrals: {$stats['direct_referrals']}
👥 Indirect Referrals: {$stats['indirect_referrals']}
💰 Total Rewards: \${$stats['total_rewards_usdt']} USDT

💡 Share your link to earn commissions when your referrals make deposits!
";
        
        $bot->sendMessage($from_id, $message, [
            'parse_mode' => 'HTML',
            'reply_to_message_id' => $message_id,
            'reply_markup' => json_encode([
                'inline_keyboard' => [
                    [['text' => '💎 Open Ghidar', 'web_app' => ['url' => $web_app]]],
                ]
            ])
        ]);
    } catch (\Exception $e) {
        $bot->sendMessage($from_id, '<b>Error loading referral information. Please try again later.</b>', [
            'parse_mode' => 'HTML',
            'reply_to_message_id' => $message_id,
        ]);
        error_log("ReferralService error in /referral: " . $e->getMessage());
    }
    
    die;
}

if ($msg === 'Back To User Mode ↪️') {
    $stmt = $pdo->prepare('UPDATE `users` SET `step` = null WHERE `id` = :id LIMIT 1');
    $stmt->execute(['id' => $from_id]);
    $tempMsg = $bot->sendMessage($from_id, '<b>...</b>', [
        'parse_mode' => 'HTML',
        'reply_markup' => json_encode([
            'KeyboardRemove' => [],
            'remove_keyboard' => true
        ])
    ]);
    if ($tempMsg && isset($tempMsg->result->message_id)) {
        $bot->deleteMessage($from_id, $tempMsg->result->message_id);
    }
    $bot->sendPhoto($from_id, new CURLFILE('main.png'), [
        'caption' => '
Hey! Welcome to Ghidar!
Tap on the coin and see your balance rise.

Ghidar is a Decentralized Exchange on the TON Blockchain. The biggest part of Ghidar Token GHD distribution will occur among the players here.

Got friends, relatives, co-workers?
Bring them all into the game.
More buddies, more coins.

',
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => json_encode([
            'inline_keyboard' => [
                [['text' => 'Play Now', 'web_app' => ['url' => $web_app]]],
            ]
        ])
    ]);
    die;
}






// Admin section

if (!in_array($from_id, $admins_user_id)) {
    die;
}


$panel_menu = json_encode([
'resize_keyboard' => true,
'keyboard' => [
[['text' => 'Statistics', 'web_app' => ['url' => $web_app . '/adminZXE/statics/']]],
[['text' => 'Task Managment', 'web_app' => ['url' => $web_app . '/adminZXE/missions/']], ['text' => 'User Managment', 'web_app' => ['url' => $web_app . '/adminZXE/users/']]],
[['text' => 'BackUP']],
[['text' => 'Send Message'],['text' => 'Forward Message']],
[['text' => 'Turn On Maintenance'],['text' => 'Turn Off Maintenance']],
[['text' => 'Back To User Mode ↪️']],
]
]);



// Admin panel
if ($msg === '/admin' || $msg === '🔙') {
    $stmt = $pdo->prepare('UPDATE `users` SET `step` = null WHERE `id` = :id LIMIT 1');
    $stmt->execute(['id' => $from_id]);
    
    // Gather statistics
    $stats = [];
    
    // Total users
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM `users`');
    $stats['total_users'] = $stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0;
    
    // Users joined today
    $today_start = strtotime('today');
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM `users` WHERE `joining_date` >= :today_start');
    $stmt->execute(['today_start' => $today_start]);
    $stats['users_today'] = $stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0;
    
    // Total USDT in wallets
    $stmt = $pdo->query('SELECT SUM(usdt_balance) as total FROM `wallets`');
    $stats['total_usdt'] = number_format((float)($stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0), 2);
    
    // Total GHD in wallets
    $stmt = $pdo->query('SELECT SUM(ghd_balance) as total FROM `wallets`');
    $stats['total_ghd'] = number_format((float)($stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0), 0);
    
    // Active AI Trader balance
    $stmt = $pdo->query('SELECT SUM(current_balance_usdt) as total FROM `ai_accounts`');
    $stats['ai_trader_balance'] = number_format((float)($stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0), 2);
    
    // Active lotteries
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM `lotteries` WHERE `status` = :status');
    $stmt->execute(['status' => 'active']);
    $stats['active_lotteries'] = $stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0;
    
    $statsMessage = "
<b>📊 Ghidar Admin Dashboard</b>

<b>Users:</b>
👥 Total: {$stats['total_users']}
📅 Today: {$stats['users_today']}

<b>Balances:</b>
💵 Total USDT: \${$stats['total_usdt']}
🪙 Total GHD: {$stats['total_ghd']}

<b>AI Trader:</b>
📈 Active Balance: \${$stats['ai_trader_balance']}

<b>Lottery:</b>
🎟️ Active: {$stats['active_lotteries']}
";
    
    $bot->sendMessage($from_id, $statsMessage, [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => $panel_menu
    ]);
    die;
}


// Backup database
if ($msg === 'BackUP') {
    $sendMessage = $bot->sendMessage($from_id, '⏳', [
        'reply_to_message_id' => $message_id,
    ]);
    dbBackup('localhost', $DB['username'], $DB['password'], $DB['dbname'], 'SQLbackUp');
    $filesize = filesize('SQLbackUp.sql');
    if ($sendMessage && isset($sendMessage->result->message_id)) {
        $bot->deleteMessage($from_id, $sendMessage->result->message_id);
    }
    if (round($filesize / 1024 / 1024) > 19) {
        $bot->sendMessage($from_id, '<b>The size of the bot database is more than 20 MB and I cant send it to you

Please take a backup of the database manually through the host.</b>', [
            'reply_to_message_id' => $message_id,
        ]);
    } else {
        $bot->sendDocument($from_id, new curlFile('SQLbackUp.sql'), [
            'caption' => "<b>The bot database backup was created successfully ✅</b>",
            'reply_to_message_id' => $message_id,
            'parse_mode' => "HTML",
        ]);
    }
    unlink('SQLbackUp.sql');

    die;
}


// Send Message To All
if ($msg === 'Send Message') {
    $MySQLi->query("UPDATE `users` SET `step` = 'SendToAll' WHERE `id` = '{$from_id}' LIMIT 1");
    $bot->sendMessage($from_id, '<b>Send a message to be sent to all users of the bot :</b>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => json_encode([
            'resize_keyboard' => true,
            'keyboard' => [
                [['text' => '🔙']],
            ]
        ])
    ]);
    $MySQLi->close();
    die;
}

if (isset($update->message) && $UserDataBase['step'] === 'SendToAll') {
    $MySQLi->query("UPDATE `users` SET `step` = null WHERE `id` = '{$from_id}' LIMIT 1");
    @$MySQLi->query("DELETE FROM `sending` WHERE `type` = 'send' OR `type` = 'forward'");
    $MySQLi->query("INSERT INTO `sending` (`type`,`chat_id`,`msg_id`,`count`) VALUES ('send','{$from_id}','{$message_id}',0)");
    $bot->sendMessage($from_id, '<b>Public sending operation has started.✅</b>

<u>Please send|forward  any message until the end of the operation❗️</u>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => $panel_menu
    ]);
    $MySQLi->close();
    die;
}


// Forward Message To All
if ($msg === 'Forward Message') {
    $MySQLi->query("UPDATE `users` SET `step` = 'ForToAll' WHERE `id` = '{$from_id}' LIMIT 1");
    $bot->sendMessage($from_id, '<b>Forward a message to be forward to all users of the bot :</b>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => json_encode([
            'resize_keyboard' => true,
            'keyboard' => [
                [['text' => '🔙']],
            ]
        ])
    ]);
    $MySQLi->close();
    die;
}

if (isset($update->message) && $UserDataBase['step'] === 'ForToAll') {
    $MySQLi->query("UPDATE `users` SET `step` = null WHERE `id` = '{$from_id}' LIMIT 1");
    @$MySQLi->query("DELETE FROM `sending` WHERE `type` = 'send' OR `type` = 'forward'");
    $MySQLi->query("INSERT INTO `sending` (`type`,`chat_id`,`msg_id`,`count`) VALUES ('forward','{$from_id}','{$message_id}',0)");
    $bot->sendMessage($from_id, '<b>Public forwarding operation has started.✅</b>

<u>Please send|forward  any message until the end of the operation❗️</u>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => $panel_menu
    ]);
    $MySQLi->close();
    die;
}


// Turn On Maintenance
if ($msg === 'Turn On Maintenance') {
    $MySQLi->query("UPDATE `users` SET `step` = 'GetMaintenanceTime' WHERE `id` = '{$from_id}' LIMIT 1");
    $bot->sendMessage($from_id, '<b>Please give me a time to be on maintenance mode in minute :</b>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => json_encode([
            'resize_keyboard' => true,
            'keyboard' => [
                [['text' => '🔙']],
            ]
        ])
    ]);
    $MySQLi->close();
    die;
}

if (is_numeric($msg) && $UserDataBase['step'] === 'GetMaintenanceTime') {
    $MySQLi->query("UPDATE `users` SET `step` = '' WHERE `id` = '{$from_id}' LIMIT 1");
    $time = round((microtime(true) * 1000) + ($msg * 60 * 1000));
    file_put_contents('.maintenance.txt', $time);
    $bot->sendMessage($from_id, '<b>Maintenance mode activated ✅</b>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => $panel_menu
    ]);
    $MySQLi->close();
    die;
}

// Turn Off Maintenance
if ($msg === 'Turn Off Maintenance') {
    unlink('.maintenance.txt');
    $bot->sendMessage($from_id, '<b>Maintenance mode deactivated ✅</b>', [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => $panel_menu
    ]);
    $MySQLi->close();
    die;
}


// /broadcast command - Quick text broadcast to limited users
// Usage: /broadcast Your message here...
if (strpos($msg, '/broadcast ') === 0) {
    $broadcastText = trim(substr($msg, 11));
    
    if (empty($broadcastText)) {
        $bot->sendMessage($from_id, '<b>Usage:</b> /broadcast Your message here...', [
            'parse_mode' => 'HTML',
            'reply_to_message_id' => $message_id,
        ]);
        $MySQLi->close();
        die;
    }
    
    // For MVP safety, limit to first 100 users
    // TODO: Implement proper queue-based broadcast for production
    $broadcastLimit = 100;
    
    $result = mysqli_query($MySQLi, "SELECT id FROM users LIMIT {$broadcastLimit}");
    $users = mysqli_fetch_all($result, MYSQLI_ASSOC);
    
    $sent = 0;
    $failed = 0;
    
    $bot->sendMessage($from_id, "⏳ Starting broadcast to up to {$broadcastLimit} users...", [
        'reply_to_message_id' => $message_id,
    ]);
    
    foreach ($users as $user) {
        $userId = $user['id'];
        try {
            $res = $bot->sendMessage($userId, $broadcastText, [
                'parse_mode' => 'HTML',
            ]);
            if ($res && isset($res->ok) && $res->ok) {
                $sent++;
            } else {
                $failed++;
            }
            usleep(50000); // 50ms delay to avoid rate limiting
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    $bot->sendMessage($from_id, "
<b>📢 Broadcast Complete</b>

✅ Sent: {$sent}
❌ Failed: {$failed}
📊 Total: " . ($sent + $failed) . "

<i>Note: Broadcasts are limited to {$broadcastLimit} users in MVP mode.</i>
", [
        'parse_mode' => 'HTML',
        'reply_to_message_id' => $message_id,
        'reply_markup' => $panel_menu
    ]);
    
    $MySQLi->close();
    die;
}







$MySQLi->close();
die;