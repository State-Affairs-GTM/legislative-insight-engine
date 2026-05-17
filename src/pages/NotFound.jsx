import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl mb-2" style={{ color: 'var(--ink)' }}>Page not found</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        That route doesn't exist yet — many features are still rolling out.
      </p>
      <Link to="/" className="text-sm" style={{ color: 'var(--accent)' }}>← Back to overview</Link>
    </div>
  );
}
