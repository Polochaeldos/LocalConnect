'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  filterProvidersByAvailability, 
  hasAvailabilityOnDate, 
  getAvailableTimeSlots,
  getAvailabilityStatus,
  getNextAvailableSlot,
  filterPastSlots,
  formatTimeForDisplay
} from '@/lib/availability';

const serviceCategories = [
  { id: 'electrician', name: 'Electricians', icon: '⚡' },
  { id: 'tutor', name: 'Tutors', icon: '📚' },
  { id: 'cleaner', name: 'Cleaners', icon: '🧹' },
  { id: 'plumber', name: 'Plumbers', icon: '🔧' },
  { id: 'gardener', name: 'Gardeners', icon: '🌱' },
  { id: 'painter', name: 'Painters', icon: '🎨' }
];

export default function ServicesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    priceRange: '',
    rating: '',
    availabilityDate: '',
    availabilityTime: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all bookings for availability checking
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllBookings(bookingsData);

        // Query providers from Firestore
        let providersQuery = query(
          collection(db, 'providers'),
          where('isActive', '==', true)
        );

        // Apply category filter if selected
        if (filters.category) {
          providersQuery = query(
            collection(db, 'providers'),
            where('isActive', '==', true),
            where('services', 'array-contains', filters.category)
          );
        }

        const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
          let providersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Apply search filter
          if (filters.search) {
            providersData = providersData.filter(provider => 
              provider.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
              provider.services?.some(service => 
                service.toLowerCase().includes(filters.search.toLowerCase())
              ) ||
              provider.city?.toLowerCase().includes(filters.search.toLowerCase())
            );
          }

          // Apply price range filter
          if (filters.priceRange) {
            const [min, max] = filters.priceRange.split('-').map(Number);
            providersData = providersData.filter(provider => {
              const avgPrice = provider.pricing?.averagePrice || 0;
              return avgPrice >= min && (max ? avgPrice <= max : true);
            });
          }

          // Apply rating filter
          if (filters.rating) {
            const minRating = Number(filters.rating);
            providersData = providersData.filter(provider => 
              (provider.averageRating || 0) >= minRating
            );
          }

          // Apply availability filter
          if (filters.availabilityDate || filters.availabilityTime) {
            // Create bookings map for efficient lookup
            const bookingsMap = {};
            bookingsData.forEach(booking => {
              if (!bookingsMap[booking.providerId]) {
                bookingsMap[booking.providerId] = [];
              }
              bookingsMap[booking.providerId].push(booking);
            });

            providersData = filterProvidersByAvailability(
              providersData,
              filters.availabilityDate,
              filters.availabilityTime,
              bookingsMap
            );
          }

          setProviders(providersData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      search: '',
      priceRange: '',
      rating: '',
      availabilityDate: '',
      availabilityTime: ''
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">★</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">★</span>);
    }

    return stars;
  };

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
              {user ? (
                <>
                  <Link
                    href={user ? (user.userRole === 'customer' ? '/customer/dashboard' : '/provider/dashboard') : '/'}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Find Local Services</h1>
          <p className="mt-2 text-gray-600">Discover trusted service providers in your area</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Clear All
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Service, provider, or location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {serviceCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Price</option>
                  <option value="0-50">$0 - $50</option>
                  <option value="50-100">$50 - $100</option>
                  <option value="100-200">$100 - $200</option>
                  <option value="200-">$200+</option>
                </select>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>

              {/* Availability */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available On
                </label>
                <input
                  type="date"
                  value={filters.availabilityDate}
                  onChange={(e) => handleFilterChange('availabilityDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Time Preference */}
              {filters.availabilityDate && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time
                  </label>
                  <select
                    value={filters.availabilityTime}
                    onChange={(e) => handleFilterChange('availabilityTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Any Time</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="lg:w-3/4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading services...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                <p className="text-gray-600">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {providers.map((provider) => (
                  <div key={provider.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {provider.name}
                          </h3>
                          <p className="text-gray-600">{provider.city}</p>
                        </div>
                        <div className="text-right">
                          {provider.averageRating > 0 && (
                            <div className="flex items-center">
                              {renderStars(provider.averageRating)}
                              <span className="ml-1 text-sm text-gray-600">
                                ({provider.reviewCount || 0})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {provider.services?.slice(0, 3).map((service, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {service}
                            </span>
                          ))}
                          {provider.services?.length > 3 && (
                            <span className="text-sm text-gray-500">
                              +{provider.services.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {provider.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {provider.description}
                        </p>
                      )}

                      {/* Real-time Availability Display */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Availability</h4>
                        {(() => {
                          const providerBookings = allBookings.filter(booking => booking.providerId === provider.id);
                          const today = new Date().toISOString().split('T')[0];
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const tomorrowString = tomorrow.toISOString().split('T')[0];
                          
                          // Check today's availability
                          const todaySlots = getAvailableTimeSlots(provider, today, providerBookings);
                          const todayAvailableSlots = filterPastSlots(today, todaySlots);
                          
                          // Check tomorrow's availability
                          const tomorrowSlots = getAvailableTimeSlots(provider, tomorrowString, providerBookings);
                          
                          if (todayAvailableSlots.length > 0) {
                            return (
                              <div className="text-sm">
                                <div className="text-green-600 font-medium">Available Today</div>
                                <div className="text-gray-600">
                                  Next slot: {formatTimeForDisplay ? formatTimeForDisplay(todayAvailableSlots[0]) : todayAvailableSlots[0]}
                                  {todayAvailableSlots.length > 1 && ` (+${todayAvailableSlots.length - 1} more)`}
                                </div>
                              </div>
                            );
                          } else if (tomorrowSlots.length > 0) {
                            return (
                              <div className="text-sm">
                                <div className="text-yellow-600 font-medium">Available Tomorrow</div>
                                <div className="text-gray-600">
                                  From {formatTimeForDisplay ? formatTimeForDisplay(tomorrowSlots[0]) : tomorrowSlots[0]}
                                  ({tomorrowSlots.length} slots)
                                </div>
                              </div>
                            );
                          } else {
                            // Check next available slot
                            const nextSlot = getNextAvailableSlot(provider, providerBookings, 7);
                            if (nextSlot) {
                              return (
                                <div className="text-sm">
                                  <div className="text-orange-600 font-medium">Next Available</div>
                                  <div className="text-gray-600">
                                    {nextSlot.dayName}, {formatTimeForDisplay ? formatTimeForDisplay(nextSlot.time) : nextSlot.time}
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-sm">
                                  <div className="text-red-600 font-medium">Limited Availability</div>
                                  <div className="text-gray-600">Contact for scheduling</div>
                                </div>
                              );
                            }
                          }
                        })()}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          {provider.pricing?.averagePrice && (
                            <p className="text-lg font-semibold text-gray-900">
                              From ${provider.pricing.averagePrice}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            {provider.isAvailable ? (
                              <span className="text-green-600">Available</span>
                            ) : (
                              <span className="text-red-600">Busy</span>
                            )}
                          </p>
                        </div>
                        <Link
                          href={`/providers/${provider.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
