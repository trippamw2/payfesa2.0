import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const useBackNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = useCallback(() => {
    // Check if we can go back in history
    const canGoBack = window.history.state && window.history.state.idx > 0;
    
    if (canGoBack) {
      // Use native back navigation
      navigate(-1);
    } else {
      // Smart fallback based on current route
      if (location.pathname.startsWith('/groups/')) {
        navigate('/dashboard', { replace: true });
      } else if (location.pathname.startsWith('/admin/')) {
        navigate('/admin', { replace: true });
      } else if (location.pathname.startsWith('/settings/')) {
        navigate('/settings', { replace: true });
      } else {
        // Default fallback
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate, location]);

  return { goBack };
};
