'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const BookingCard = ({ booking, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      onStatusUpdate(booking.id, newStatus);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Error updating booking status');
    } finally {
      setUpdating(false);
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {booking.serviceType} - {booking.customerName}
          </h3>
          <p className="text-gray-600">
            {booking.scheduledDate} at {booking.scheduledTime}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>

      {booking.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Description:</span> {booking.description}
          </p>
        </div>
      )}

      {booking.totalPrice && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Price:</span> ${booking.totalPrice}
          </p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Requested:</span> {new Date(booking.createdAt).toLocaleDateString()}
        </p>
      </div>

      {booking.status === 'pending' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleStatusUpdate('confirmed')}
            disabled={updating}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            Accept
          </button>
          <button
            onClick={() => handleStatusUpdate('rejected')}
            disabled={updating}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            Decline
          </button>
        </div>
      )}

      {booking.status === 'confirmed' && (
        <button
          onClick={() => handleStatusUpdate('completed')}
          disabled={updating}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          Mark as Completed
        </button>
      )}

      {booking.customerReview && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center mb-2">
            <span className="text-yellow-400">
              {'★'.repeat(booking.customerReview.rating)}
              {'☆'.repeat(5 - booking.customerReview.rating)}
            </span>
            <span className="ml-2 text-sm font-medium text-gray-900">
              Customer Review
            </span>
          </div>
          <p className="text-sm text-gray-700">{booking.customerReview.comment}</p>
        </div>
      )}
    </div>
  );
};

export default function BookingManagement() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(bookingsData);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleStatusUpdate = (bookingId, newStatus) => {
    setBookings(prev => prev.map(booking => 
      booking.id === bookingId 
        ? { ...booking, status: newStatus }
        : booking
    ));
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getFilterCount = (status) => {
    if (status === 'all') return bookings.length;
    return bookings.filter(b => b.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'completed', label: 'Completed' },
          { key: 'rejected', label: 'Rejected' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({getFilterCount(tab.key)})
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Complete your profile to start receiving bookings'
              : `You don't have any ${filter} bookings at the moment`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
