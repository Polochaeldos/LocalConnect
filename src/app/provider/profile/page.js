'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const serviceCategories = [
  'electrician', 'tutor', 'cleaner', 'plumber', 'gardener', 'painter'
];

export default function ProviderProfile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: '',
    description: '',
    services: [],
    city: '',
    phone: '',
    pricing: {
      averagePrice: ''
    },
    availability: {
      0: { available: false, startTime: '09:00', endTime: '17:00' }, // Sunday
      1: { available: true, startTime: '09:00', endTime: '17:00' },  // Monday
      2: { available: true, startTime: '09:00', endTime: '17:00' },  // Tuesday
      3: { available: true, startTime: '09:00', endTime: '17:00' },  // Wednesday
      4: { available: true, startTime: '09:00', endTime: '17:00' },  // Thursday
      5: { available: true, startTime: '09:00', endTime: '17:00' },  // Friday
      6: { available: false, startTime: '09:00', endTime: '17:00' }  // Saturday
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const providerDoc = await getDoc(doc(db, 'providers', user.uid));
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        setProfile(prev => ({ ...prev, ...data }));
      } else {
        // Initialize with user data from auth context
        setProfile(prev => ({
          ...prev,
          name: user.displayName || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('pricing.')) {
      const field = name.split('.')[1];
      setProfile(prev => ({
        ...prev,
        pricing: { ...prev.pricing, [field]: value }
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleServiceToggle = (service) => {
    setProfile(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleAvailabilityChange = (day, field, value) => {
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability[day],
          [field]: field === 'available' ? value === 'true' : value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const profileData = {
        ...profile,
        uid: user.uid,
        email: user.email,
        isActive: true,
        isAvailable: true,
        isComplete: profile.services.length > 0 && profile.description && profile.city,
        updatedAt: new Date().toISOString()
      };

      // Check if profile exists
      const providerDoc = await getDoc(doc(db, 'providers', user.uid));
      
      if (providerDoc.exists()) {
        await updateDoc(doc(db, 'providers', user.uid), profileData);
      } else {
        await setDoc(doc(db, 'providers', user.uid), {
          ...profileData,
          averageRating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString()
        });
      }

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <RouteGuard allowedRoles={['provider']}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    );
  }

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
                <Link
                  href="/provider/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
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

        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900">Provider Profile</h1>
            <p className="mt-2 text-gray-600">Manage your services and availability</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('Error') 
                ? 'bg-red-100 border border-red-400 text-red-700' 
                : 'bg-green-100 border border-green-400 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white shadow px-6 py-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={profile.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City/Location *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={profile.city}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Average Price (USD)
                  </label>
                  <input
                    type="number"
                    name="pricing.averagePrice"
                    value={profile.pricing?.averagePrice || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={profile.description}
                  onChange={handleInputChange}
                  placeholder="Describe your services and experience..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Services */}
            <div className="bg-white shadow px-6 py-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Services Offered *</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {serviceCategories.map((service) => (
                  <label key={service} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profile.services.includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {service}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white shadow px-6 py-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Weekly Availability</h3>
              
              <div className="space-y-4">
                {dayNames.map((dayName, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-24">
                      <span className="text-sm font-medium text-gray-700">{dayName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`availability-${index}`}
                          value="true"
                          checked={profile.availability[index]?.available === true}
                          onChange={(e) => handleAvailabilityChange(index, 'available', e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Available</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`availability-${index}`}
                          value="false"
                          checked={profile.availability[index]?.available === false}
                          onChange={(e) => handleAvailabilityChange(index, 'available', e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Not Available</span>
                      </label>
                    </div>

                    {profile.availability[index]?.available && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={profile.availability[index]?.startTime || '09:00'}
                          onChange={(e) => handleAvailabilityChange(index, 'startTime', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <input
                          type="time"
                          value={profile.availability[index]?.endTime || '17:00'}
                          onChange={(e) => handleAvailabilityChange(index, 'endTime', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RouteGuard>
  );
}
