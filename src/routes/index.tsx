import { createBrowserRouter } from 'react-router-dom'
import Library from '@/pages/Library'
import Reader from '@/pages/Reader'
import Settings from '@/pages/Settings'

export const router = createBrowserRouter([
  { path: '/', element: <Library /> },
  { path: '/read/:bookId', element: <Reader /> },
  { path: '/configuracoes', element: <Settings /> },
])
