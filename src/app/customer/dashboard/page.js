'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import ReviewModal from '@/components/ReviewModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    if (user) {
      // Listen to real-time updates for user's bookings
      // Temporary fix: Remove orderBy to avoid index requirement
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort on client side temporarily
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setBookings(bookingsData);
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

  const handleReviewSubmit = (reviewData) => {
    // Update the booking in local state
    setBookings(prev => prev.map(booking => 
      booking.id === selectedBooking.id 
        ? { ...booking, customerReview: reviewData }
        : booking
    ));
  };

  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
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
    <RouteGuard allowedRoles={['customer']}>
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
                  href="/services"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Browse Services
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
            <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your bookings and find new services</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link href="/services" className="group">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg group-hover:scale-105 transform transition-all duration-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                      Find Services
                    </h3>
                    <p className="text-gray-600">Browse and book services</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Total Bookings</h3>
                  <p className="text-2xl font-bold text-green-600">{bookings.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Reviews Given</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {bookings.filter(b => b.status === 'completed' && b.customerReview).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Your Bookings
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Recent service bookings and their status
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
                <p className="text-gray-600 mb-4">Start by browsing our available services</p>
                <Link
                  href="/services"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Services
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
                                {booking.serviceType?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.serviceType} - {booking.providerName}
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
                      
                      {booking.status === 'completed' && !booking.customerReview && (
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => openReviewModal(booking)}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Leave Review
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
                            <span className="ml-2 text-sm text-gray-600">Your Review</span>
                          </div>
                          {booking.customerReview.comment && (
                            <p className="text-sm text-gray-700">{booking.customerReview.comment}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {showReviewModal && selectedBooking && (
          <ReviewModal
            booking={selectedBooking}
            onClose={() => setShowReviewModal(false)}
            onSubmit={handleReviewSubmit}
          />
        )}
      </div>
    </RouteGuard>
  );
}
