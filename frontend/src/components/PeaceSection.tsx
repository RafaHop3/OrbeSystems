'use client';

import React from 'react';
import styles from './PeaceSection.module.css';

export default function PeaceSection() {
  const messages = [
    {
      title: 'Peace Through Code',
      description: 'Writing software that creates harmony in digital spaces',
      icon: '⚛️',
    },
    {
      title: 'Secure Systems',
      description: 'Protecting peace with cutting-edge cybersecurity',
      icon: '🔐',
    },
    {
      title: 'Connected Minds',
      description: 'Building bridges between ideas and innovation',
      icon: '🌐',
    },
    {
      title: 'Orbital Growth',
      description: 'Expanding possibilities in infinite directions',
      icon: '🛸',
    },
  ];

  return (
    <section className={styles.peaceSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Our Mission</h2>
          <p className={styles.sectionSubtitle}>
            Creating peaceful solutions through technology
          </p>
        </div>

        <div className={styles.messagesGrid}>
          {messages.map((msg, idx) => (
            <div key={idx} className={styles.messageCard}>
              <div className={styles.cardIcon}>{msg.icon}</div>
              <h3 className={styles.cardTitle}>{msg.title}</h3>
              <p className={styles.cardDescription}>{msg.description}</p>
              <div className={styles.cardGlow} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.backgroundOrbs}>
        <div className={styles.orbBg} style={{ '--delay': '0s' } as React.CSSProperties} />
        <div className={styles.orbBg} style={{ '--delay': '2s' } as React.CSSProperties} />
        <div className={styles.orbBg} style={{ '--delay': '4s' } as React.CSSProperties} />
      </div>
    </section>
  );
}
