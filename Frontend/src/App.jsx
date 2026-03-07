import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PostPage from './pages/PostPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/posts/:id" element={<PostPage />} />
        <Route path="/" element={<Navigate to="/posts/1" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
