import type { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </span>
  );
}
