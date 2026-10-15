import { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: '📊' },
  { to: '/explorer', label: 'Data Explorer', icon: '🔍' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/performance-lab', label: 'Performance Lab', icon: '⚡' },
  { to: '/benchmark-history', label: 'Benchmark History', icon: '📋' },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Overview | FrontBench',
  '/explorer': 'Data Explorer | FrontBench',
  '/analytics': 'Analytics | FrontBench',
  '/performance-lab': 'Performance Lab | FrontBench',
  '/benchmark-history': 'Benchmark History | FrontBench',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[location.pathname] || 'FrontBench — High-Performance Data Explorer';
    document.title = title;
  }, [location.pathname]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.logo}>
          FRONT<span className={styles.logoAccent}>BENCH</span>
        </span>
        <span className={styles.tagline}>High-Performance Data Explorer</span>
        <button
          className={styles.menuButton}
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-nav"
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </header>

      <nav
        id="sidebar-nav"
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
        aria-label="Main navigation"
      >
        <ul className={styles.nav} role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
                onClick={closeSidebar}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.main} id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
