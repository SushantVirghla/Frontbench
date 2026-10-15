import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Eager load: Overview (landing page)
import { OverviewPage } from '../features/overview/OverviewPage';

// Lazy load: secondary routes for Experiment D code splitting demonstration
const ExplorerPage = lazy(() =>
  import('../features/explorer/ExplorerPage').then((m) => ({ default: m.ExplorerPage }))
);
const AnalyticsPage = lazy(() =>
  import('../features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const PerformanceLabPage = lazy(() =>
  import('../features/performance-lab/PerformanceLabPage').then((m) => ({
    default: m.PerformanceLabPage,
  }))
);
const BenchmarkHistoryPage = lazy(() =>
  import('../features/benchmark-history/BenchmarkHistoryPage').then((m) => ({
    default: m.BenchmarkHistoryPage,
  }))
);

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading route chunk..." showLabel />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'explorer',
        element: (
          <LazyWrapper>
            <ExplorerPage />
          </LazyWrapper>
        ),
      },
      {
        path: 'analytics',
        element: (
          <LazyWrapper>
            <AnalyticsPage />
          </LazyWrapper>
        ),
      },
      {
        path: 'performance-lab',
        element: (
          <LazyWrapper>
            <PerformanceLabPage />
          </LazyWrapper>
        ),
      },
      {
        path: 'benchmark-history',
        element: (
          <LazyWrapper>
            <BenchmarkHistoryPage />
          </LazyWrapper>
        ),
      },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});

export function AppRouter() {
  return <RouterProvider router={router} />;
}
