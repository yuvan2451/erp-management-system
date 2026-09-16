import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

/**
 * Temporary screens.
 *
 * These will be replaced with the actual ERP screens
 * as we build each feature.
 */
function EnquiriesPlaceholder() {
  return <h1>Enquiries</h1>;
}

function QuotationsPlaceholder() {
  return <h1>Quotations</h1>;
}

function SalesOrdersPlaceholder() {
  return <h1>Sales Orders</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected ERP routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/enquiries"
              element={<EnquiriesPlaceholder />}
            />

            <Route
              path="/quotations"
              element={<QuotationsPlaceholder />}
            />

            <Route
              path="/sales-orders"
              element={<SalesOrdersPlaceholder />}
            />
          </Route>

          {/* Default route */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;