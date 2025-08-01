'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProviderDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    averageRating: 0
  });

  useEffect(() => {
    if (user) {
      // Fetch provider profile
      const fetchProfile = async () => {
        try {
          const profileDoc = await getDoc(doc(db, 'providers', user.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data());
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };

      fetchProfile();

      // Listen to real-time updates for provider's bookings
      // Temporary fix: Remove orderBy to avoid index requirement
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort on client side temporarily
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setBookings(bookingsData);

        // Calculate stats
        const totalBookings = bookingsData.length;
        const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
        const completedBookings = bookingsData.filter(b => b.status === 'completed').length;
        
        // Calculate average rating
        const reviewedBookings = bookingsData.filter(b => b.customerReview && b.customerReview.rating);
        const averageRating = reviewedBookings.length > 0 
          ? (reviewedBookings.reduce((sum, b) => sum + b.customerReview.rating, 0) / reviewedBookings.length).toFixed(1)
          : 0;

        setStats({
          totalBookings,
          pendingBookings,
          completedBookings,
          averageRating
        });

        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error accepting booking:', error);
      alert('Failed to accept booking. Please try again.');
    }
  };

  const handleDeclineBooking = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error declining booking:', error);
      alert('Failed to decline booking. Please try again.');
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error completing booking:', error);
      alert('Failed to complete booking. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <RouteGuard allowedRoles={['provider']}>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  ServiceHub
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user?.displayName || user?.email}</span>
                <Link
                  href="/provider/profile"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your services and bookings</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Total Bookings</h3>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Pending</h3>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Completed</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.completedBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Rating</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.averageRating > 0 ? `${stats.averageRating}★` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link href="/provider/profile" className="group">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg group-hover:scale-105 transform transition-all duration-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                      Manage Profile
                    </h3>
                    <p className="text-gray-600">Update your services and availability</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/provider/calendar" className="group">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg group-hover:scale-105 transform transition-all duration-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">
                      Manage Schedule
                    </h3>
                    <p className="text-gray-600">Set your availability and time slots</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Profile Status */}
          {!profile?.isComplete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Complete your profile to start receiving bookings
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Add your services, pricing, and availability to get discovered by customers.</p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/provider/profile"
                      className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      Complete Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Bookings */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Bookings
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Recent service requests and their status
              </p>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-600 mb-4">Complete your profile to start receiving bookings</p>
                <Link
                  href="/provider/profile"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Setup Profile
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <li key={booking.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {booking.customerName?.charAt(0).toUpperCase() || 'C'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.serviceType} - {booking.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.scheduledDate} at {booking.scheduledTime}
                            </div>
                            {booking.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {booking.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                          {booking.totalPrice && (
                            <div className="text-sm font-medium text-gray-900">
                              ${booking.totalPrice}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {booking.status === 'pending' && (
                        <div className="mt-4 flex justify-end space-x-2">
                          <button 
                            onClick={() => handleAcceptBooking(booking.id)}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleDeclineBooking(booking.id)}
                            className="text-sm bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {booking.status === 'confirmed' && (
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => handleCompleteBooking(booking.id)}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Mark as Completed
                          </button>
                        </div>
                      )}

                      {booking.customerReview && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center mb-2">
                            <span className="text-yellow-400">
                              {'★'.repeat(booking.customerReview.rating)}
                              {'☆'.repeat(5 - booking.customerReview.rating)}
                            </span>
                            <span className="ml-2 text-sm text-gray-600">
                              Review from {booking.customerName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{booking.customerReview.comment}</p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
