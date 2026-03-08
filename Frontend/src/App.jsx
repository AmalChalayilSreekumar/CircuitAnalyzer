import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PostPage from './pages/PostPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/posts/:id" element={<PostPage />} />
        <Route path="/" element={<Navigate to="/posts/b1000001-0000-4000-8000-000000000001" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
