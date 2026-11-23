import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import Cart from './components/Cart.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import { CartProvider } from './components/Context.jsx';
import Checkout from './components/Checkout.jsx';
import CheckoutSuccess from './pages/CheckoutSuccess.jsx';
import DiagnosticQuiz from './components/DiagnosticQuiz.jsx';
import ItemDetailContainer from './components/ItemDetailContainer.jsx';
import ItemListContainer from './components/ItemListContainer.jsx';
import LearningPaths from './components/LearningPaths.jsx';
import Login from './components/Login.jsx';
import NavBar from './components/NavBar.jsx';
import Register from './components/Register.jsx';
import StoreAssistant from './components/StoreAssistant.jsx';
import { AuthProvider, ProtectedRoute, useAuth } from './components/AuthContext.jsx';
import logo from './img/logo.jpg';
import './App.css';

function AccountPage({ title, description }) {
  const { purchasedCourses } = useAuth();

  return (
    <main className="container">
      <div className="box my-6 has-text-centered">
        <h1 className="title">{title}</h1>
        {title === 'Mis cursos' && purchasedCourses.length > 0 ? (
          <ul className="account-course-list">
            {purchasedCourses.map((courseId) => (
              <li key={courseId}>
                <Link to={`/item/${courseId}`}>Abrir curso</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>{description}</p>
        )}
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <NavBar url={logo} />
          <Routes>
            <Route
              path="/"
              element={<ItemListContainer greeting="Te presentamos nuestros cursos:" />}
            />
            <Route
              path="/category/:categoryId"
              element={<ItemListContainer greeting="Productos por categoría" />}
            />
            <Route path="/item/:itemId" element={<ItemDetailContainer />} />
            <Route path="/rutas-de-aprendizaje" element={<LearningPaths />} />
            <Route path="/diagnostico" element={<DiagnosticQuiz />} />
            <Route
              path="/checkout"
              element={<ProtectedRoute><Checkout /></ProtectedRoute>}
            />
            <Route
              path="/checkout/success"
              element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>}
            />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/mis-cursos"
              element={
                <ProtectedRoute>
                  <AccountPage
                    title="Mis cursos"
                    description="Tu biblioteca aparecerá aquí."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <AccountPage
                    title="Mi perfil"
                    description="Administra tu cuenta desde este espacio."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <h1 className="flex justify-center my-12 text-6xl text-center">
                  Error 404 Not Found
                </h1>
              }
            />
          </Routes>
          <CartDrawer />
          <StoreAssistant />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
