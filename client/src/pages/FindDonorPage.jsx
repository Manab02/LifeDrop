import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { User, Phone, MapPin, Droplet } from 'lucide-react';
import { donorAPI } from '../services/api';

const FindDonor = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [bloodGroup, setBloodGroup] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    const [statesData, setStatesData] = useState([]);
    const [districtsData, setDistrictsData] = useState([]);
    const [citiesData, setCitiesData] = useState([]);

    const [filteredDistricts, setFilteredDistricts] = useState([]);
    const [filteredCities, setFilteredCities] = useState([]);

    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Load all JSON files
    useEffect(() => {
        fetch('/states.json')
            .then(res => res.json())
            .then(data => setStatesData(data))
            .catch(err => console.error('Error loading states:', err));

        fetch('/districts.json')
            .then(res => res.json())
            .then(data => setDistrictsData(data))
            .catch(err => console.error('Error loading districts:', err));

        fetch('/cities.json')
            .then(res => res.json())
            .then(data => {
                if (data.india && data.india.states) {
                    setCitiesData(data.india.states);
                }
            })
            .catch(err => console.error('Error loading cities:', err));
    }, []);

    // READ URL PARAMS ON MOUNT
    useEffect(() => {
        const urlBloodGroup = searchParams.get('bloodGroup');
        const urlState = searchParams.get('state');
        const urlDistrict = searchParams.get('district');
        const urlCity = searchParams.get('city');

        if (urlBloodGroup && urlState && urlDistrict && urlCity) {
            setBloodGroup(urlBloodGroup);
            setSelectedState(urlState);
            setSelectedDistrict(urlDistrict);
            setSelectedCity(urlCity);

            // Auto-search when params present
            setTimeout(() => {
                handleSearch(urlBloodGroup, urlState, urlDistrict, urlCity);
            }, 500);
        }
    }, [searchParams]);

    // Update districts when state changes
    useEffect(() => {
        if (selectedState) {
            const districts = districtsData.filter(d => d.state_name === selectedState);
            setFilteredDistricts(districts);

            if (!districts.find(d => d.DIST_name === selectedDistrict)) {
                setFilteredCities([]);
                if (!searchParams.get('district')) {
                    setSelectedDistrict('');
                    setSelectedCity('');
                }
            }
        } else {
            setFilteredDistricts([]);
            setFilteredCities([]);
        }
    }, [selectedState, districtsData]);

    // Update cities when district changes
    useEffect(() => {
        if (selectedDistrict && selectedState) {
            const state = citiesData.find(s => s.name === selectedState);
            if (state && state.districts) {
                const district = state.districts.find(d => d.name === selectedDistrict);
                if (district && district.cities) {
                    setFilteredCities(district.cities);

                    if (!district.cities.includes(selectedCity) && !searchParams.get('city')) {
                        setSelectedCity('');
                    }
                }
            }
        } else {
            setFilteredCities([]);
        }
    }, [selectedDistrict, selectedState, citiesData]);

    const handleSearch = async (bg, state, district, city) => {
        const searchBloodGroup = bg || bloodGroup;
        const searchState = state || selectedState;
        const searchDistrict = district || selectedDistrict;
        const searchCity = city || selectedCity;

        if (!searchBloodGroup || !searchState || !searchDistrict || !searchCity) {
            alert('Please fill all fields');
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            const data = await donorAPI.searchDonors({
                bloodGroup: searchBloodGroup,
                state: searchState,
                district: searchDistrict,
                city: searchCity,
            });

            if (data.success) {
                setDonors(data.donors || []);
            } else {
                alert(data.message || 'Search failed');
                setDonors([]);
            }
        } catch (error) {
            console.error('Error searching donors:', error);
            alert('An error occurred while searching');
            setDonors([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="text-center py-24 px-4 bg-gradient-to-r from-red-700 via-red-500 to-red-300 relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-6">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white">
                            FIND A BLOOD DONOR
                        </h2>
                        <img
                            src="/searchBlood.svg"
                            alt="Blood Drop Search"
                            className="w-20 sm:w-24 md:w-28 lg:w-32 h-auto animate-pulse"
                        />
                    </div>

                    {/* Search Box */}
                    <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col md:flex-row md:flex-wrap md:justify-center md:space-x-4 space-y-4 md:space-y-0 w-full max-w-5xl">
                        <div className="flex flex-col">
                            <label className="font-semibold mb-1 text-sm">Blood Group</label>
                            <select
                                className="border rounded-md px-3 py-2 w-full md:w-40"
                                value={bloodGroup}
                                onChange={(e) => setBloodGroup(e.target.value)}
                            >
                                <option value="">Select</option>
                                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold mb-1 text-sm">State</label>
                            <select
                                className="border rounded-md px-3 py-2 w-full md:w-40"
                                value={selectedState}
                                onChange={(e) => setSelectedState(e.target.value)}
                            >
                                <option value="">Select</option>
                                {statesData.map((s, i) => (
                                    <option key={i} value={s.state}>
                                        {s.state}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold mb-1 text-sm">District</label>
                            <select
                                className="border rounded-md px-3 py-2 w-full md:w-40"
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                disabled={!selectedState}
                            >
                                <option value="">Select</option>
                                {filteredDistricts.map((d, i) => (
                                    <option key={i} value={d.DIST_name}>
                                        {d.DIST_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold mb-1 text-sm">City</label>
                            <select
                                className="border rounded-md px-3 py-2 w-full md:w-40"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                disabled={!selectedDistrict}
                            >
                                <option value="">Select</option>
                                {filteredCities.map((c, i) => (
                                    <option key={i} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end justify-center md:justify-start">
                            <button
                                onClick={() => handleSearch()}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md flex items-center space-x-2 w-full md:w-auto justify-center disabled:bg-red-400"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M9.5 17a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
                                </svg>
                                <span>{loading ? 'Searching...' : 'Search'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Results Section */}
            <section className="max-w-7xl mx-auto px-4 py-12">
                {searched && (
                    <>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                                <p className="mt-4 text-gray-600">Searching for donors...</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-gray-800">
                                        Available Donors ({donors.length})
                                    </h3>
                                    {bloodGroup && selectedCity && (
                                        <span className="text-sm text-gray-600">
                                            {bloodGroup} donors in {selectedCity}, {selectedDistrict}
                                        </span>
                                    )}
                                </div>

                                {donors.length === 0 ? (
                                    <div className="bg-white rounded-lg shadow p-12 text-center">
                                        <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600 text-lg">No donors found matching your criteria.</p>
                                        <p className="text-gray-500 text-sm mt-2">Try searching in a different location or blood group.</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {donors.map((donor) => (
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
                                                        <span>{donor.address?.district}, {donor.address?.state}</span>
                                                    </div>
                                                    <div className="flex items-center text-gray-600">
                                                        <Phone className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
                                                        <span>{donor.phone || donor.email}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => window.location.href = `tel:${donor.phone}`}
                                                    className="mt-4 w-full bg-red-50 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                                                >
                                                    Contact Donor
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {!searched && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">Select blood group and location to find donors</p>
                        <p className="text-gray-500 text-sm mt-2">Use the search form above to begin</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default FindDonor;