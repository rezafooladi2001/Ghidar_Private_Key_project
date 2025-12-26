import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { TelegramBranding } from '../TelegramBranding';
import { TrustBadgeBar } from '../TrustBadgeBar';
import styles from './AboutSection.module.css';

export function AboutSection() {
  return (
    <div className={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>About Ghidar</CardTitle>
        </CardHeader>
        <CardContent className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>What is Ghidar?</h3>
            <p className={styles.description}>
              Ghidar is a secure Telegram Mini App that provides crypto opportunities including 
              airdrops, lottery, and AI trading. Built on Telegram's secure platform, Ghidar 
              offers a trusted environment for earning cryptocurrency rewards.
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Powered by Telegram</h3>
            <div className={styles.telegramSection}>
              <TelegramBranding variant="badge" linkToDocs={true} />
            </div>
            <p className={styles.description}>
              Ghidar is built as a Telegram Mini App, leveraging Telegram's secure authentication 
              and infrastructure. This means your account is protected by Telegram's built-in 
              security features, including two-factor authentication support.
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Security Features</h3>
            <TrustBadgeBar variant="compact" showLabels={true} />
            <ul className={styles.featuresList}>
              <li>SSL encrypted connections for all data transmission</li>
              <li>Telegram's secure authentication system</li>
              <li>Wallet verification for additional security</li>
              <li>Regular security audits and compliance checks</li>
              <li>No private keys stored on our servers</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Contact & Support</h3>
            <p className={styles.description}>
              Need help? Our support team is here to assist you.
            </p>
            <div className={styles.contactInfo}>
              <p>
                <strong>Support:</strong> Available through the Help section in the app
              </p>
              <p>
                <strong>Response Time:</strong> We aim to respond within 24 hours
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Version Information</h3>
            <div className={styles.versionInfo}>
              <p>
                <strong>App Version:</strong> 1.0.0
              </p>
              <p>
                <strong>Platform:</strong> Telegram Mini App
              </p>
              <p>
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className={styles.footerNote}>
            <p>
              Ghidar is committed to providing a secure and trustworthy platform for cryptocurrency 
              enthusiasts. All transactions are processed securely, and we never store your private keys.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

