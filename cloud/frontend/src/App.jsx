import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SearchProvider } from './context/SearchContext'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import MyDrive from './pages/MyDrive'
import SharedWithMe from './pages/SharedWithMe'
import Recent from './pages/Recent'
import TailnetDrive from './pages/TailnetDrive'
import FolderView from './pages/FolderView'
import Trash from './pages/Trash'

export default function App() {
  return (
    <AppProvider>
    <SearchProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/drive" replace />} />
          <Route path="drive" element={<MyDrive />} />
          <Route path="drive/folder/:slug" element={<FolderView />} />
          <Route path="shared" element={<SharedWithMe />} />
          <Route path="recent" element={<Recent />} />
          <Route path="machine/:name" element={<TailnetDrive />} />
          <Route path="trash" element={<Trash />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </SearchProvider>
    </AppProvider>
  )
}
