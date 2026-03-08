import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SearchProvider } from './context/SearchContext'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import MyDrive from './pages/MyDrive'
import Recent from './pages/Recent'
import TailnetDrive from './pages/TailnetDrive'
import BrowseFolder from './pages/BrowseFolder'
import Trash from './pages/Trash'
import Cameras from './pages/Cameras'

export default function App() {
  return (
    <AppProvider>
    <SearchProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/drive" replace />} />
          <Route path="drive" element={<MyDrive />} />
          <Route path="browse" element={<BrowseFolder />} />
          <Route path="recent" element={<Recent />} />
          <Route path="machine/:name" element={<TailnetDrive />} />
          <Route path="trash" element={<Trash />} />
          <Route path="cameras" element={<Cameras />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </SearchProvider>
    </AppProvider>
  )
}
