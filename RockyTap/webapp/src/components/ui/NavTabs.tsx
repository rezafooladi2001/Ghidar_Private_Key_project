import { HomeIcon, LotteryIcon, AirdropIcon, TraderIcon, ReferralIcon } from '../Icons';
import styles from './NavTabs.module.css';

export type TabId = 'home' | 'lottery' | 'airdrop' | 'trader' | 'referral';

interface NavTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface TabConfig {
  id: TabId;
  label: string;
  Icon: typeof HomeIcon;
}

const tabs: TabConfig[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'lottery', label: 'Lottery', Icon: LotteryIcon },
  { id: 'airdrop', label: 'Airdrop', Icon: AirdropIcon },
  { id: 'trader', label: 'AI Trader', Icon: TraderIcon },
  { id: 'referral', label: 'Invite', Icon: ReferralIcon },
];

export function NavTabs({ activeTab, onTabChange }: NavTabsProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={styles.iconWrapper}>
                <tab.Icon 
                  size={22} 
                  color={isActive ? 'var(--brand-primary)' : 'var(--text-muted)'} 
                  className={styles.icon}
                />
                {isActive && <div className={styles.activeIndicator} />}
              </div>
              <span className={styles.label}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
