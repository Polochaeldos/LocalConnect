'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const serviceCategories = [
  {
    id: 'electrician',
    name: 'Electricians',
    icon: '⚡',
    description: 'Professional electrical services',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    id: 'tutor',
    name: 'Tutors',
    icon: '📚',
    description: 'Educational and academic support',
    color: 'from-blue-400 to-purple-500'
  },
  {
    id: 'cleaner',
    name: 'Cleaners',
    icon: '🧹',
    description: 'Home and office cleaning',
    color: 'from-green-400 to-teal-500'
  },
  {
    id: 'plumber',
    name: 'Plumbers',
    icon: '🔧',
    description: 'Plumbing and water solutions',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'gardener',
    name: 'Gardeners',
    icon: '🌱',
    description: 'Landscaping and garden care',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'painter',
    name: 'Painters',
    icon: '🎨',
    description: 'Interior and exterior painting',
    color: 'from-purple-400 to-pink-500'
  }
];

export default function HomePage() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'customer') {
        router.push('/customer/dashboard');
      } else if (userRole === 'provider') {
        router.push('/provider/dashboard');
      }
    }
  }, [user, userRole, router]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    
    router.push(`/services?${params.toString()}`);
  };

  const handleCategoryClick = (categoryId) => {
    router.push(`/services?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
              Find Trusted
              <span className="text-blue-600 block">Local Services</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-delay">
              Connect with verified local service providers in your area. From electricians to tutors, 
              find the perfect professional for your needs.
            </p>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto mb-12 animate-fade-in-delay-2">
              <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-lg shadow-lg">
                <input
                  type="text"
                  placeholder="What service do you need?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {serviceCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSearch}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Popular Service Categories
          </h2>
          <p className="text-gray-600 text-lg">
            Browse our most requested services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceCategories.map((category, index) => (
            <div
              key={category.id}
              className={`group cursor-pointer transform hover:scale-105 transition-all duration-300 animate-fade-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleCategoryClick(category.id)}
            >
              <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className={`h-32 bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                  <span className="text-4xl">{category.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-gray-600">{category.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose ServiceHub?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Discovery</h3>
              <p className="text-gray-600">Find the right service provider quickly with our smart search and filtering system.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Providers</h3>
              <p className="text-gray-600">All service providers are verified and reviewed by our community for your peace of mind.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Booking</h3>
              <p className="text-gray-600">Book services instantly with our integrated calendar and real-time availability system.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of satisfied customers and service providers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?role=customer"
              className="px-8 py-3 bg-white text-blue-600 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Find Services
            </Link>
            <Link
              href="/register?role=provider"
              className="px-8 py-3 bg-blue-700 text-white rounded-md font-medium hover:bg-blue-800 transition-colors border border-blue-500"
            >
              Become a Provider
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ServiceHub</h3>
              <p className="text-gray-400">
                Connecting communities through trusted local services.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Customers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/services" className="hover:text-white">Browse Services</Link></li>
                <li><Link href="/register?role=customer" className="hover:text-white">Sign Up</Link></li>
                <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Providers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/register?role=provider" className="hover:text-white">Join as Provider</Link></li>
                <li><Link href="/login" className="hover:text-white">Provider Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ServiceHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
