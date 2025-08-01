'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableTimeSlots, hasAvailabilityOnDate, formatTimeForDisplay, getNextAvailableSlot } from '@/lib/availability';

export default function ProviderDetailPage() {
  const { user, userRole } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [providerBookings, setProviderBookings] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    serviceType: '',
    scheduledDate: '',
    scheduledTime: '',
    description: ''
  });

  useEffect(() => {
    if (params.id) {
      fetchProviderData();
    }
  }, [params.id]);

  const fetchProviderData = async () => {
    try {
      // Fetch provider profile
      const providerDoc = await getDoc(doc(db, 'providers', params.id));
      if (providerDoc.exists()) {
        setProvider({ id: providerDoc.id, ...providerDoc.data() });
      }

      // Fetch provider's bookings for availability checking
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', params.id)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProviderBookings(bookingsData);

      // Fetch reviews
      const reviewsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', params.id),
        where('status', '==', 'completed'),
        orderBy('updatedAt', 'desc')
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs
        .map(doc => doc.data())
        .filter(booking => booking.customerReview);
      
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update available time slots when date changes
  useEffect(() => {
    if (provider && bookingData.scheduledDate) {
      const slots = getAvailableTimeSlots(provider, bookingData.scheduledDate, providerBookings);
      setAvailableTimeSlots(slots);
      
      // Clear selected time if it's no longer available
      if (bookingData.scheduledTime && !slots.includes(bookingData.scheduledTime)) {
        setBookingData(prev => ({ ...prev, scheduledTime: '' }));
      }
    } else {
      setAvailableTimeSlots([]);
    }
  }, [provider, bookingData.scheduledDate, providerBookings]);

  // Check if provider has availability in the next 7 days
  const hasNearTermAvailability = () => {
    if (!provider) return false;
    
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      if (hasAvailabilityOnDate(provider, dateString, providerBookings)) {
        return true;
      }
    }
    return false;
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (userRole !== 'customer') {
      alert('Only customers can book services');
      return;
    }

    setBookingLoading(true);

    try {
      const booking = {
        customerId: user.uid,
        customerName: user.displayName || user.email,
        providerId: provider.id,
        providerName: provider.name,
        serviceType: bookingData.serviceType,
        scheduledDate: bookingData.scheduledDate,
        scheduledTime: bookingData.scheduledTime,
        description: bookingData.description,
        status: 'pending',
        totalPrice: provider.pricing?.averagePrice || 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bookings'), booking);
      
      setShowBookingModal(false);
      setBookingData({
        serviceType: '',
        scheduledDate: '',
        scheduledTime: '',
        description: ''
      });

      alert('Booking request sent successfully! The provider will respond soon.');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`text-xl ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Provider not found</h2>
          <Link href="/services" className="text-blue-600 hover:text-blue-500">
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
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
              <Link
                href="/services"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Browse Services
              </Link>
              {user ? (
                <Link
                  href={userRole === 'customer' ? '/customer/dashboard' : '/provider/dashboard'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Provider Information */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{provider.name}</h1>
                  <p className="text-gray-600 mt-1">{provider.city}</p>
                  
                  {provider.averageRating > 0 && (
                    <div className="flex items-center mt-2">
                      {renderStars(provider.averageRating)}
                      <span className="ml-2 text-sm text-gray-600">
                        {provider.averageRating.toFixed(1)} ({provider.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Starting from</p>
                  {provider.pricing?.averagePrice && (
                    <p className="text-2xl font-bold text-green-600">
                      ${provider.pricing.averagePrice}
                    </p>
                  )}
                  <p className={`text-sm ${provider.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                    {provider.isAvailable ? 'Available' : 'Busy'}
                  </p>
                </div>
              </div>

              {/* Services */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Services Offered</h3>
                <div className="flex flex-wrap gap-2">
                  {provider.services?.map((service, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              {provider.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-600 leading-relaxed">{provider.description}</p>
                </div>
              )}

              {/* Contact */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Email:</span> {provider.email}
                  </p>
                  {provider.phone && (
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {provider.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Reviews</h3>
              
              {reviews.length === 0 ? (
                <p className="text-gray-600">No reviews yet.</p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review, index) => (
                    <div key={index} className="border-b pb-6 last:border-b-0">
                      <div className="flex items-center mb-2">
                        {renderStars(review.customerReview.rating)}
                        <span className="ml-2 font-medium text-gray-900">
                          {review.customerName}
                        </span>
                      </div>
                      <p className="text-gray-600">{review.customerReview.comment}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Service: {review.serviceType}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book This Service</h3>
              
              {/* Real-time Availability Display */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Current Availability</h4>
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowString = tomorrow.toISOString().split('T')[0];
                  
                  // Check today's availability
                  const todaySlots = getAvailableTimeSlots(provider, today, providerBookings);
                  const todayAvailableSlots = todaySlots.filter(time => {
                    const slotDateTime = new Date(`${today}T${time}:00`);
                    return slotDateTime > new Date();
                  });
                  
                  // Check tomorrow's availability  
                  const tomorrowSlots = getAvailableTimeSlots(provider, tomorrowString, providerBookings);
                  
                  if (todayAvailableSlots.length > 0) {
                    return (
                      <div>
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm font-medium text-green-700">Available Today</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Next: {formatTimeForDisplay ? formatTimeForDisplay(todayAvailableSlots[0]) : todayAvailableSlots[0]}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {todayAvailableSlots.slice(0, 4).map(time => (
                            <span key={time} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {formatTimeForDisplay ? formatTimeForDisplay(time) : time}
                            </span>
                          ))}
                          {todayAvailableSlots.length > 4 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{todayAvailableSlots.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  } else if (tomorrowSlots.length > 0) {
                    return (
                      <div>
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          <span className="text-sm font-medium text-yellow-700">Available Tomorrow</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          From: {formatTimeForDisplay ? formatTimeForDisplay(tomorrowSlots[0]) : tomorrowSlots[0]}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tomorrowSlots.slice(0, 4).map(time => (
                            <span key={time} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                              {formatTimeForDisplay ? formatTimeForDisplay(time) : time}
                            </span>
                          ))}
                          {tomorrowSlots.length > 4 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{tomorrowSlots.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const nextSlot = getNextAvailableSlot(provider, providerBookings, 7);
                    if (nextSlot) {
                      return (
                        <div>
                          <div className="flex items-center mb-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium text-orange-700">Next Available</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {nextSlot.dayName} at {formatTimeForDisplay ? formatTimeForDisplay(nextSlot.time) : nextSlot.time}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div>
                          <div className="flex items-center mb-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium text-red-700">Limited Availability</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Contact provider for custom scheduling
                          </div>
                        </div>
                      );
                    }
                  }
                })()}
              </div>
              
              {user && userRole === 'customer' ? (
                <button
                  onClick={() => setShowBookingModal(true)}
                  disabled={!hasNearTermAvailability()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {hasNearTermAvailability() ? 'Book Now' : 'Currently Unavailable'}
                </button>
              ) : user && userRole === 'provider' ? (
                <p className="text-gray-600 text-center">
                  Providers cannot book services
                </p>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 text-center block"
                  >
                    Sign In to Book
                  </Link>
                  <Link
                    href="/register?role=customer"
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 text-center block"
                  >
                    Sign Up as Customer
                  </Link>
                </div>
              )}

              {provider.phone && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 text-center">
                    Or call directly:
                  </p>
                  <a
                    href={`tel:${provider.phone}`}
                    className="block text-center text-blue-600 hover:text-blue-500 font-medium"
                  >
                    {provider.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Book Service</h3>
              
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Service Type *
                  </label>
                  <select
                    required
                    value={bookingData.serviceType}
                    onChange={(e) => setBookingData(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a service</option>
                    {provider.services?.map((service) => (
                      <option key={service} value={service} className="capitalize">
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingData.scheduledDate}
                    onChange={(e) => setBookingData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {bookingData.scheduledDate && !hasAvailabilityOnDate(provider, bookingData.scheduledDate, providerBookings) && (
                    <p className="mt-1 text-sm text-red-600">
                      Provider is not available on this date
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Available Time Slots *
                  </label>
                  {!bookingData.scheduledDate ? (
                    <p className="mt-2 text-sm text-gray-500">Please select a date first</p>
                  ) : availableTimeSlots.length === 0 ? (
                    <p className="mt-2 text-sm text-red-600">No available time slots for this date</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {availableTimeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBookingData(prev => ({ ...prev, scheduledTime: slot }))}
                          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            bookingData.scheduledTime === slot
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {formatTimeForDisplay(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={bookingData.description}
                    onChange={(e) => setBookingData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your requirements..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading || !bookingData.scheduledTime}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Booking...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
