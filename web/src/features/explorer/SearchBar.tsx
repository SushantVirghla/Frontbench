import { useRef, useEffect, useCallback } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search records by keyword...',
  debounceMs = 250,
}: SearchBarProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onChange(nextValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={styles.container}>
      <label htmlFor="search-input" className="sr-only">
        Search records
      </label>
      <span className={styles.icon} aria-hidden="true">
        🔍
      </span>
      <input
        id="search-input"
        type="search"
        className={styles.input}
        placeholder={placeholder}
        defaultValue={value}
        onChange={handleChange}
        aria-label="Search records"
      />
    </div>
  );
}
