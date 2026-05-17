import { Routes, Route, Navigate } from 'react-router-dom';
import { tokens } from './lib/tokens.js';
import Layout from './components/layout/Layout.jsx';
import Overview from './pages/Overview.jsx';
import StatePage from './pages/StatePage.jsx';
import Methodology from './pages/Methodology.jsx';
import Coverage from './pages/Coverage.jsx';
import Nuances from './pages/Nuances.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div style={tokens}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/state/:abbr" element={<StatePage />} />
          <Route path="/state/:abbr/section/:section" element={<StatePage />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/coverage" element={<Coverage />} />
          <Route path="/nuances" element={<Nuances />} />
          {/* Phase 2+ routes (placeholders for now) */}
          <Route path="/partisanship" element={<Navigate to="/" replace />} />
          <Route path="/legislators" element={<Navigate to="/" replace />} />
          <Route path="/bills" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
}
