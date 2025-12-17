/**
 * Ghidar Icon Library
 * Custom SVG icons for consistent visual language
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function HomeIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LotteryIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" />
      <path d="M3 10H21" stroke={color} strokeWidth="2" />
      <circle cx="7" cy="14" r="1.5" fill={color} />
      <circle cx="12" cy="14" r="1.5" fill={color} />
      <circle cx="17" cy="14" r="1.5" fill={color} />
      <path d="M8 3L8 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3L16 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AirdropIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L15 8L21 9L16.5 14L18 21L12 17.5L6 21L7.5 14L3 9L9 8L12 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TraderIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 17L9 11L13 15L21 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7H21V12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReferralIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="7" r="3" stroke={color} strokeWidth="2" />
      <path d="M3 21V19C3 16.7909 4.79086 15 7 15H11C13.2091 15 15 16.7909 15 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="10" r="2.5" stroke={color} strokeWidth="2" />
      <path d="M17 14C19.2091 14 21 15.7909 21 18V20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 18L15 12L9 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CoinIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 6V18M15 9C15 7.89543 13.6569 7 12 7C10.3431 7 9 7.89543 9 9C9 10.1046 10.3431 11 12 11C13.6569 11 15 11.8954 15 13C15 14.1046 13.6569 15 12 15C10.3431 15 9 14.1046 9 13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WalletIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="6" width="18" height="14" rx="2" stroke={color} strokeWidth="2" />
      <path d="M3 10H21" stroke={color} strokeWidth="2" />
      <circle cx="16" cy="14" r="1.5" fill={color} />
    </svg>
  );
}

export function CheckIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12L10 17L20 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WarningIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 9V13M12 17H12.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.26 20.56 2.56 20.74C2.87 20.92 3.21 21.01 3.56 21.01H20.43C20.78 21.01 21.12 20.92 21.42 20.74C21.73 20.56 21.99 20.3 22.17 20C22.35 19.7 22.44 19.36 22.44 19C22.44 18.64 22.35 18.3 22.17 18L13.7 3.86C13.52 3.56 13.27 3.31 12.96 3.13C12.66 2.95 12.32 2.86 11.97 2.86C11.62 2.86 11.28 2.95 10.98 3.13C10.67 3.31 10.42 3.56 10.24 3.86H10.29Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 16V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill={color} />
    </svg>
  );
}

export function CopyIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke={color} strokeWidth="2" />
      <path d="M5 15H4C3.44772 15 3 14.5523 3 14V5C3 4.44772 3.44772 4 4 4H13C13.5523 4 14 4.44772 14 5V6" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function TrophyIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9H4C3.44772 9 3 8.55228 3 8V5C3 4.44772 3.44772 4 4 4H6" stroke={color} strokeWidth="2" />
      <path d="M18 9H20C20.5523 9 21 8.55228 21 8V5C21 4.44772 20.5523 4 20 4H18" stroke={color} strokeWidth="2" />
      <path d="M6 4H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V4Z" stroke={color} strokeWidth="2" />
      <path d="M12 18V21" stroke={color} strokeWidth="2" />
      <path d="M8 21H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HistoryIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7V12L15 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 19V5M5 12L12 5L19 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5V19M5 12L12 19L19 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GiftIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="10" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
      <path d="M12 10V21" stroke={color} strokeWidth="2" />
      <path d="M3 14H21" stroke={color} strokeWidth="2" />
      <path d="M12 10C12 10 12 6 9 4C6 2 4 5 6 7C8 9 12 10 12 10Z" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10C12 10 12 6 15 4C18 2 20 5 18 7C16 9 12 10 12 10Z" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8L12 2Z" fill={color} />
    </svg>
  );
}

export function RobotIcon({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="8" width="16" height="12" rx="2" stroke={color} strokeWidth="2" />
      <circle cx="9" cy="13" r="1.5" fill={color} />
      <circle cx="15" cy="13" r="1.5" fill={color} />
      <path d="M10 17H14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4V8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="3" r="1" fill={color} />
      <path d="M2 12V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 12V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

