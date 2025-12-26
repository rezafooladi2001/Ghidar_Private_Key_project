import React from 'react';
import { TelegramBranding } from './TelegramBranding';
import { TrustBadgeBar } from './TrustBadgeBar';
import styles from './Footer.module.css';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${styles.footer} ${className}`} role="contentinfo">
      <div className={styles.content}>
        {/* Trust Badges */}
        <div className={styles.trustSection}>
          <TrustBadgeBar variant="compact" showLabels={false} />
        </div>

        {/* Telegram Branding */}
        <div className={styles.brandingSection}>
          <TelegramBranding variant="text" linkToDocs={true} />
        </div>

        {/* Links */}
        <div className={styles.linksSection}>
          <a 
            href="#terms" 
            className={styles.link}
            onClick={(e) => {
              e.preventDefault();
              // TODO: Navigate to terms page or open modal
            }}
          >
            Terms of Service
          </a>
          <span className={styles.separator}>•</span>
          <a 
            href="#privacy" 
            className={styles.link}
            onClick={(e) => {
              e.preventDefault();
              // TODO: Navigate to privacy page or open modal
            }}
          >
            Privacy Policy
          </a>
          <span className={styles.separator}>•</span>
          <a 
            href="#support" 
            className={styles.link}
            onClick={(e) => {
              e.preventDefault();
              // TODO: Open support modal or navigate to help
            }}
          >
            Support
          </a>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p>© {currentYear} Ghidar. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

