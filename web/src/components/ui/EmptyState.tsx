import styles from './EmptyState.module.css';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
