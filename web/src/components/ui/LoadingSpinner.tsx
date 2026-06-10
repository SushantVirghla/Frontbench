import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

export function LoadingSpinner({ size = 'md', label = 'Loading...', showLabel = false }: LoadingSpinnerProps) {
  return (
    <div className={styles.container} role="status" aria-label={label}>
      <div className={`${styles.spinner} ${styles[size]}`} />
      {showLabel ? <span className={styles.label}>{label}</span> : <span className="sr-only">{label}</span>}
    </div>
  );
}
