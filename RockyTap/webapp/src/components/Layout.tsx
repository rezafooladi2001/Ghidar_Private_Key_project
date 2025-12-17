import React from 'react';
import { NavTabs, TabId } from './ui';
import { GhidarLogo } from './GhidarLogo';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <GhidarLogo size="md" animate />
        </div>
        <div className={styles.headerGlow} />
      </header>
      
      <main className={styles.main}>
        {children}
      </main>
      
      <NavTabs activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
