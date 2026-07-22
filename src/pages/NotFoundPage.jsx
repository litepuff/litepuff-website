import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';

export default function NotFoundPage() {
  return (
    <><Seo title="Page Not Found" description="The page you requested could not be found." path="/404" /><section className="container-page flex min-h-screen items-center justify-center text-center">
      <div>
        <h1 className="font-display text-6xl font-black">Page not found</h1>
        <Link className="mt-6 inline-block font-black text-brand-primary" to="/">Return home</Link>
      </div>
    </section></>
  );
}
