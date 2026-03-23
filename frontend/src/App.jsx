import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ManageRooms from './pages/ManageRooms';
import BookRoom from './pages/BookRoom';
import Header from './components/Header';
import Login from './pages/Login';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Header />
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <ManageRooms />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/book" element={
          <ProtectedRoute>
            <Layout>
              <BookRoom />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
