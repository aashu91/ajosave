"use client";

import styles from "./ConnectionStatus.module.css";

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: Date;
}

export function ConnectionStatus({ isConnected, lastUpdate }: ConnectionStatusProps) {
  return (
    <div className={styles.container}>
      <div className={`${styles.indicator} ${isConnected ? styles.connected : styles.disconnected}`}>
        <span className={styles.dot} />
        <span className={styles.text}>
          {isConnected ? "Live" : "Disconnected"}
        </span>
      </div>
      {lastUpdate && isConnected && (
        <span className={styles.timestamp}>
          Updated {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
