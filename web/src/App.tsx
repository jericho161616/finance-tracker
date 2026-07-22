import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PinGate from './components/PinGate'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import CreditCards from './pages/CreditCards'
import Settings from './pages/Settings'

export default function App() {
  return (
    <PinGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="income" element={<Income />} />
            <Route path="credit-cards" element={<CreditCards />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PinGate>
  )
}
