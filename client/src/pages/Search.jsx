import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Phone, MapPin, Droplet, Building2, Hospital } from 'lucide-react';
import { publicAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Search = () => {
    const [searchParams] = useSearchParams();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [searchType, setSearchType] = useState('');

    useEffect(() => {
        const type = searchParams.get('type');
        const bloodGroup = searchParams.get('bloodGroup');
        const state = searchParams.get('state');
        const district = searchParams.get('district');
        const city = searchParams.get('city');

        if (type && state && district && city) {
            setSearchType(type);
            performSearch(type, bloodGroup, state, district, city);
        }
    }, [searchParams]);

    const performSearch = async (type, bloodGroup, state, district, city) => {
        setLoading(true);
        setSearched(true);

        try {
            const searchData = {
                type,
                state,
                district,
                city
            };

            if (bloodGroup) {
                searchData.bloodGroup = bloodGroup;
            }

            const data = await publicAPI.search(searchData);

            if (data.success) {
                setResults(data.results || []);
            } else {
                alert(data.message || 'Search failed');
                setResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('An error occurred while searching');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const getBloodStockStatus = (quantity) => {
        if (quantity > 50) return { text: 'Good', color: 'text-green-600' };
        if (quantity > 20) return { text: 'Low', color: 'text-yellow-600' };
        if (quantity > 0) return { text: 'Critical', color: 'text-orange-600' };
        return { text: 'Out', color: 'text-red-600' };
    };

    const renderDonorCard = (donor) => (
        <div
            key={donor._id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border-l-4 border-red-500"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-3">
                        <User className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-gray-800">{donor.name}</h4>
                        <p className="text-sm text-gray-500">{donor.address?.city}</p>
                    </div>
                </div>
                <div className="bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                    {donor.bloodtype}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
                    <span>{donor.address?.city}, {donor.address?.district}, {donor.address?.state}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
                    <span>{donor.phone}</span>
                </div>
            </div>

            <button
                onClick={() => window.location.href = `tel:${donor.phone}`}
                className="mt-4 w-full bg-red-50 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors"
            >
                📞 Contact Donor
            </button>
        </div>
    );

    const renderHospitalCard = (hospital) => (
        <div
            key={hospital._id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border-l-4 border-blue-500"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <Hospital className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-800">{hospital.hospitalName}</h4>
                        <p className="text-sm text-gray-500">{hospital.address?.city}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                    <span>{hospital.address?.city}, {hospital.address?.district}, {hospital.address?.state}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                    <span>{hospital.phone}</span>
                </div>
            </div>

            {/* Blood Stock Display */}
            <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <Droplet className="w-4 h-4 mr-2 text-red-500" />
                    Blood Stock Availability
                </h5>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(hospital.bloodStock || {}).map(([group, quantity]) => {
                        const status = getBloodStockStatus(quantity);
                        return (
                            <div key={group} className="text-center bg-gray-50 rounded p-2">
                                <div className="font-bold text-red-600">{group}</div>
                                <div className={`text-sm font-semibold ${status.color}`}>
                                    {quantity} units
                                </div>
                                <div className={`text-xs ${status.color}`}>{status.text}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 text-sm text-gray-600">
                    <strong>Total Stock:</strong> {hospital.totalUnits || 0} units
                </div>
            </div>

            <button
                onClick={() => window.location.href = `tel:${hospital.phone}`}
                className="mt-4 w-full bg-blue-50 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
            >
                📞 Contact Hospital
            </button>
        </div>
    );

    const renderOrganisationCard = (org) => (
        <div
            key={org._id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border-l-4 border-purple-500"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center flex-1">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-800">{org.organisationName}</h4>
                        <p className="text-sm text-gray-500">{org.address?.city}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" />
                    <span>{org.address?.city}, {org.address?.district}, {org.address?.state}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" />
                    <span>{org.phone}</span>
                </div>
            </div>

            {/* Blood Stock Display */}
            <div className="border-t pt-4">
                <h5 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <Droplet className="w-4 h-4 mr-2 text-red-500" />
                    Blood Stock Availability
                </h5>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(org.bloodStock || {}).map(([group, quantity]) => {
                        const status = getBloodStockStatus(quantity);
                        return (
                            <div key={group} className="text-center bg-gray-50 rounded p-2">
                                <div className="font-bold text-red-600">{group}</div>
                                <div className={`text-sm font-semibold ${status.color}`}>
                                    {quantity} units
                                </div>
                                <div className={`text-xs ${status.color}`}>{status.text}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 text-sm text-gray-600">
                    <strong>Total Stock:</strong> {org.totalUnits || 0} units
                </div>
            </div>

            <button
                onClick={() => window.location.href = `tel:${org.phone}`}
                className="mt-4 w-full bg-purple-50 text-purple-600 py-2 rounded-lg font-semibold hover:bg-purple-100 transition-colors"
            >
                📞 Contact Organization
            </button>
        </div>
    );

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <section className="bg-gradient-to-r from-red-700 via-red-500 to-red-300 text-white text-center py-16 px-4">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        {searchType === 'donor' && '🩸 Blood Donors'}
                        {searchType === 'hospital' && '🏥 Hospitals'}
                        {searchType === 'organisation' && '🏢 Organizations'}
                    </h1>
                    <p className="text-lg">
                        {searchParams.get('city')}, {searchParams.get('district')}, {searchParams.get('state')}
                        {searchParams.get('bloodGroup') && ` • ${searchParams.get('bloodGroup')}`}
                    </p>
                </section>

                {/* Results Section */}
                <section className="max-w-7xl mx-auto px-4 py-12">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                            <p className="mt-4 text-gray-600">Searching...</p>
                        </div>
                    ) : searched ? (
                        <>
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-800">
                                    {results.length} Result{results.length !== 1 ? 's' : ''} Found
                                </h3>
                            </div>

                            {results.length === 0 ? (
                                <div className="bg-white rounded-lg shadow p-12 text-center">
                                    <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600 text-lg">No results found.</p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Try searching in a different location or adjust your filters.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.map((result) => {
                                        if (searchType === 'donor') return renderDonorCard(result);
                                        if (searchType === 'hospital') return renderHospitalCard(result);
                                        if (searchType === 'organisation') return renderOrganisationCard(result);
                                        return null;
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg">Use the search form to find results</p>
                        </div>
                    )}
                </section>
            </div>
            <Footer />
        </>
    );
};

export default Search;