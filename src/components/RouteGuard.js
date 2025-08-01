'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const RouteGuard = ({ children, allowedRoles = [], requireAuth = true }) => {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check if authentication is required
      if (requireAuth && !user) {
        router.push('/login');
        return;
      }

      // Check if user has the required role
      if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
        // Redirect based on user role
        if (userRole === 'customer') {
          router.push('/customer/dashboard');
        } else if (userRole === 'provider') {
          router.push('/provider/dashboard');
        } else {
          router.push('/');
        }
        return;
      }
    }
  }, [user, userRole, loading, router, allowedRoles, requireAuth]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show content if authentication checks pass
  if (requireAuth && !user) {
    return null; // Will redirect to login
  }

  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return null; // Will redirect to appropriate dashboard
  }

  return children;
};

export default RouteGuard;
