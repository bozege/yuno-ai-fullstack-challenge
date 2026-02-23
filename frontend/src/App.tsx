import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PaymentDetail from "./pages/PaymentDetail";
import StrategyConfig from "./pages/StrategyConfig";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/payments/:id" element={<PaymentDetail />} />
      <Route path="/strategy" element={<StrategyConfig />} />
    </Routes>
  );
}
