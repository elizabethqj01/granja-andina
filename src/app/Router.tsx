import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RequireAuth } from '@/components/RequireAuth'
import { NameEntryPage } from '@/pages/NameEntryPage'
import { MainMenuPage } from '@/pages/MainMenuPage'
import { LevelMapPage } from '@/pages/LevelMapPage'

const FarmGamePage = lazy(() =>
  import('@/pages/FarmGamePage').then((m) => ({ default: m.FarmGamePage }))
)

function PageFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-primary">
      <span className="font-mono text-xs text-text-muted animate-pulse">Loading…</span>
    </div>
  )
}

const router = createBrowserRouter([
  // Screen 1 (P-00) — Google sign-in, the sole public entry point
  {
    path: '/',
    element: <NameEntryPage />,
  },
  // Farm flow — guarded by an authenticated Google session
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/menu',
        element: <MainMenuPage />,
      },
      {
        path: '/levels',
        element: <LevelMapPage />,
      },
      {
        path: '/play/:level',
        element: (
          <Suspense fallback={<PageFallback />}>
            <FarmGamePage />
          </Suspense>
        ),
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
