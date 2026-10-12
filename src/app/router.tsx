import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from './app-shell'
import { RouteFallback } from './route-fallback'

// Chaque page est chargée à la demande (code-splitting par route)
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, element: <Navigate to="/clients" replace /> },
      { path: 'clients/:clientId?', lazy: async () => ({ Component: (await import('@/features/clients/clients-workspace')).ClientsWorkspace }) },
      { path: 'agenda', lazy: async () => ({ Component: (await import('@/features/tasks/agenda-page')).AgendaPage }) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
