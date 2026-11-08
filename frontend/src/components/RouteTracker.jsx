import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

/**
 * RouteTracker
 * 
 * Synchronizes React Router SPA route transitions and browser history navigation
 * (Back/Forward) with Google Analytics 4 virtual pageviews.
 * Defers execution slightly to ensure react-helmet-async has updated document.title.
 */
export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // 50ms delay gives React Helmet Async time to commit the new document.title
    const timer = setTimeout(() => {
      const fullPath = location.pathname + location.search;
      trackPageView(fullPath, document.title);
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
