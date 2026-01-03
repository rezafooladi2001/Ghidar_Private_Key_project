import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  generateActivityEvent,
  ActivityEvent,
  getActivityMultiplier,
} from '../lib/activityGenerator';
import styles from './SocialProofToast.module.css';

interface SocialProofToastProps {
  /** Minimum interval between toasts in ms */
  minInterval?: number;
  /** Maximum interval between toasts in ms */
  maxInterval?: number;
  /** How long each toast stays visible in ms */
  displayDuration?: number;
  /** Whether the component is enabled */
  enabled?: boolean;
}

interface ToastData {
  id: string;
  event: ActivityEvent;
  exiting: boolean;
}

/**
 * Get icon for toast type
 */
function getToastIcon(type: ActivityEvent['type']): string {
  switch (type) {
    case 'lottery_win':
      return '🏆';
    case 'deposit':
      return '💰';
    case 'ai_trader_profit':
      return '📈';
    case 'ai_trader_deposit':
      return '🤖';
    case 'referral_reward':
      return '🎁';
    case 'referral_join':
      return '👋';
    case 'lottery_purchase':
      return '🎟️';
    default:
      return '🔔';
  }
}

/**
 * Get icon wrapper class based on type
 */
function getIconClass(type: ActivityEvent['type']): string {
  switch (type) {
    case 'lottery_win':
      return styles.win;
    case 'deposit':
    case 'ai_trader_deposit':
      return styles.deposit;
    case 'ai_trader_profit':
      return styles.profit;
    case 'referral_reward':
    case 'referral_join':
      return styles.referral;
    default:
      return '';
  }
}

/**
 * Format toast content based on event type
 */
function formatToastContent(event: ActivityEvent): { title: string; message: React.ReactNode } {
  switch (event.type) {
    case 'lottery_win':
      return {
        title: '🎉 Lottery Winner!',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' just won '}
            <span className={styles.amountGold}>${event.amount.toLocaleString()}</span>
          </>
        ),
      };
      
    case 'deposit':
      return {
        title: 'New Deposit',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' deposited '}
            <span className={styles.amount}>${event.amount.toLocaleString()}</span>
          </>
        ),
      };
      
    case 'ai_trader_profit':
      return {
        title: 'AI Trading Profit',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' earned '}
            <span className={styles.amount}>+${event.amount.toFixed(2)}</span>
            {event.extra?.tradingPair && ` on ${event.extra.tradingPair.symbol}`}
          </>
        ),
      };
      
    case 'ai_trader_deposit':
      return {
        title: 'AI Trader Investment',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' invested '}
            <span className={styles.amount}>${event.amount.toLocaleString()}</span>
          </>
        ),
      };
      
    case 'referral_reward':
      return {
        title: 'Referral Reward',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' received '}
            <span className={styles.amount}>+${event.amount.toFixed(2)}</span>
            {' referral bonus'}
          </>
        ),
      };
      
    case 'referral_join':
      return {
        title: 'New Member',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' joined the platform'}
          </>
        ),
      };
      
    case 'lottery_purchase':
      return {
        title: 'Lottery Tickets',
        message: (
          <>
            <span className={styles.userName}>{event.userName}</span>
            {' bought '}
            <span className={styles.amount}>{event.amount} tickets</span>
          </>
        ),
      };
      
    default:
      return {
        title: 'Activity',
        message: <span className={styles.userName}>{event.userName}</span>,
      };
  }
}

// Event types to show (weighted toward exciting events)
const TOAST_EVENT_TYPES: ActivityEvent['type'][] = [
  'lottery_win',
  'lottery_win', // Double weight for lottery wins
  'ai_trader_profit',
  'ai_trader_profit',
  'deposit',
  'ai_trader_deposit',
  'referral_reward',
];

export function SocialProofToast({
  minInterval = 12000,  // 12 seconds minimum
  maxInterval = 25000,  // 25 seconds maximum
  displayDuration = 5000, // 5 seconds display
  enabled = true,
}: SocialProofToastProps) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule next toast
  const scheduleNextToast = useCallback(() => {
    if (!enabled) return;
    
    // Calculate interval with activity multiplier
    const multiplier = getActivityMultiplier();
    const baseInterval = minInterval + Math.random() * (maxInterval - minInterval);
    const adjustedInterval = baseInterval / Math.max(0.5, multiplier);
    
    timeoutRef.current = setTimeout(() => {
      if (!isVisible) {
        scheduleNextToast();
        return;
      }
      
      // Generate event (weighted toward exciting ones)
      const eventType = TOAST_EVENT_TYPES[Math.floor(Math.random() * TOAST_EVENT_TYPES.length)];
      const event = generateActivityEvent(eventType);
      
      const newToast: ToastData = {
        id: `toast-${Date.now()}`,
        event,
        exiting: false,
      };
      
      setToast(newToast);
      
      // Schedule hide
      hideTimeoutRef.current = setTimeout(() => {
        setToast(prev => prev ? { ...prev, exiting: true } : null);
        
        setTimeout(() => {
          setToast(null);
          scheduleNextToast();
        }, 300);
      }, displayDuration);
      
    }, adjustedInterval);
  }, [enabled, isVisible, minInterval, maxInterval, displayDuration]);

  // Start the cycle
  useEffect(() => {
    if (enabled) {
      // Initial delay before first toast (3-8 seconds)
      const initialDelay = 3000 + Math.random() * 5000;
      timeoutRef.current = setTimeout(() => {
        scheduleNextToast();
      }, initialDelay);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [enabled, scheduleNextToast]);

  // Visibility detection
  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Manual close
  const handleClose = useCallback(() => {
    setToast(prev => prev ? { ...prev, exiting: true } : null);
    setTimeout(() => {
      setToast(null);
      scheduleNextToast();
    }, 300);
  }, [scheduleNextToast]);

  if (!toast) return null;

  const { title, message } = formatToastContent(toast.event);
  const iconClass = getIconClass(toast.event.type);

  return createPortal(
    <div className={styles.container}>
      <div className={`${styles.toast} ${toast.exiting ? styles.exiting : ''}`}>
        <div className={`${styles.iconWrapper} ${iconClass}`}>
          {getToastIcon(toast.event.type)}
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{title}</div>
          <div className={styles.message}>{message}</div>
        </div>
        <span className={styles.time}>{toast.event.timeAgo}</span>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
          ×
        </button>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ animationDuration: `${displayDuration}ms` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SocialProofToast;

