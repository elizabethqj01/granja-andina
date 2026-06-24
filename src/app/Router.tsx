import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RequireName } from '@/components/RequireName'
import { NameEntryPage } from '@/pages/NameEntryPage'
import { MainMenuPage } from '@/pages/MainMenuPage'
import { LevelMapPage } from '@/pages/LevelMapPage'
import { LoginPage } from '@/pages/LoginPage'

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
  // Screen 1 — player name entry (public entry point)
  {
    path: '/',
    element: <NameEntryPage />,
  },
  // Legacy Firebase login kept available for authenticated features
  {
    path: '/login',
    element: <LoginPage />,
  },
  // Farm pivot flow — guarded by the local player name
  {
    element: <RequireName />,
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
