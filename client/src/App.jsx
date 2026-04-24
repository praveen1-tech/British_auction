import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import AuctionList from './pages/AuctionList';
import CreateRFQ from './pages/CreateRFQ';
import AuctionDetails from './pages/AuctionDetails';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Navigation */}
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="navbar-logo">BA</div>
            <div>
              <div className="navbar-title">British Auction</div>
              <div className="navbar-subtitle">RFQ System</div>
            </div>
          </div>
          <div className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              🏠 Auctions
            </NavLink>
            <NavLink
              to="/create"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              ＋ New RFQ
            </NavLink>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<AuctionList />} />
          <Route path="/create" element={<CreateRFQ />} />
          <Route path="/auction/:id" element={<AuctionDetails />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
