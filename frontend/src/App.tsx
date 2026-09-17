import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Enquiries from "./pages/Enquiries";
import Quotations from "./pages/Quotations";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public login screen */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* All ERP screens require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/enquiries"
              element={<Enquiries />}
            />

            <Route
              path="/quotations"
              element={<Quotations />}
            />

            {/* Sales Orders will be built next */}
            <Route
              path="/sales-orders"
              element={
                <div className="page-container">
                  <h2>Sales Orders</h2>
                  <p>
                    Sales Orders screen coming next.
                  </p>
                </div>
              }
            />
          </Route>

          {/* Redirect unknown routes */}
          <Route
            path="*"
            element={
              <Navigate
                to="/enquiries"
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;