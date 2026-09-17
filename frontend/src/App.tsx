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
import SalesOrders from "./pages/SalesOrders";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* Protected ERP routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/enquiries"
              element={<Enquiries />}
            />

            <Route
              path="/quotations"
              element={<Quotations />}
            />

            <Route
              path="/sales-orders"
              element={<SalesOrders />}
            />
          </Route>

          {/* Default route */}
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