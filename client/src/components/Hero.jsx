import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const Hero = () => {
    const navigate = useNavigate();
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedState, setSelectedState] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [bloodGroup, setBloodGroup] = useState("");
    const [searchType, setSearchType] = useState("donor"); 
    const [cities, setCities] = useState([]);

    // Load states
    useEffect(() => {
        fetch("/states.json")
            .then((res) => res.json())
            .then((data) => setStates(data))
            .catch((err) => console.error("Error fetching states:", err));
    }, []);

    // Load districts when state changes
    useEffect(() => {
        if (!selectedState) {
            setDistricts([]);
            setCities([]);
            return;
        }
        fetch("/districts.json")
            .then((res) => res.json())
            .then((data) => {
                const filtered = data.filter((item) => item.state_name === selectedState);
                setDistricts(filtered);
                setSelectedDistrict("");
                setSelectedCity("");
                setCities([]);
            })
            .catch((err) => console.error("Error fetching districts:", err));
    }, [selectedState]);

    // Load cities when district changes
    useEffect(() => {
        if (!selectedDistrict) {
            setCities([]);
            return;
        }
        fetch("/cities.json")
            .then((res) => res.json())
            .then((data) => {
                const stateObj = data.india.states.find(s => s.name === selectedState);
                const districtObj = stateObj?.districts.find(d => d.name === selectedDistrict);
                setCities(districtObj ? districtObj.cities : []);
                setSelectedCity("");
            })
            .catch((err) => console.error("Error fetching cities:", err));
    }, [selectedDistrict, selectedState]);

    // Handle search with proper redirect
    const handleSearch = (e) => {
        e.preventDefault();

        // Validation
        if (!searchType) {
            alert('Please select what you want to search for');
            return;
        }

        if (!selectedState || !selectedDistrict || !selectedCity) {
            alert('Please select state, district, and city');
            return;
        }

        if (searchType === 'donor' && !bloodGroup) {
            alert('Please select blood group for donor search');
            return;
        }

        const params = new URLSearchParams({
            type: searchType,
            state: selectedState,
            district: selectedDistrict,
            city: selectedCity
        });

        if (bloodGroup) {
            params.append('bloodGroup', bloodGroup);
        }

        navigate(`/search?${params.toString()}`);
    };

    return (
        <section className="text-center py-24 px-4 bg-gradient-to-r from-red-700 via-red-500 to-red-300 relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-6">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white">
                        FIND BLOOD RESOURCES
                    </h2>
                    <img
                        src="/searchBlood.svg"
                        alt="Blood Drop Search"
                        className="w-20 sm:w-24 md:w-28 lg:w-32 h-auto animate-pulse"
                    />
                </div>

                {/* Search Box */}
                <form onSubmit={handleSearch} className="bg-white shadow-lg rounded-2xl p-6 flex flex-col md:flex-row md:flex-wrap md:justify-center md:space-x-4 space-y-4 md:space-y-0 w-full max-w-6xl">

                    {/*  Search Type Selector */}
                    <div className="flex flex-col">
                        <label className="font-semibold mb-1 text-sm text-gray-700">Search For</label>
                        <select
                            className="border rounded-md px-3 py-2 w-full md:w-44"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            required
                        >
                            <option value="donor">🩸 Blood Donors</option>
                            <option value="hospital">🏥 Hospitals</option>
                            <option value="organisation">🏢 Organizations</option>
                        </select>
                    </div>

                    {/* Blood Group - Show for all types */}
                    <div className="flex flex-col">
                        <label className="font-semibold mb-1 text-sm text-gray-700">
                            Blood Group {searchType === 'donor' && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            className="border rounded-md px-3 py-2 w-full md:w-40"
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                            required={searchType === 'donor'}
                        >
                            <option value="">All Types</option>
                            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                                <option key={bg} value={bg}>{bg}</option>
                            ))}
                        </select>
                    </div>

                    {/* State */}
                    <div className="flex flex-col">
                        <label className="font-semibold mb-1 text-sm text-gray-700">State *</label>
                        <select
                            className="border rounded-md px-3 py-2 w-full md:w-40"
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            required
                        >
                            <option value="">Select State</option>
                            {states.map((s, i) => (
                                <option key={i} value={s.state}>
                                    {s.state}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* District */}
                    <div className="flex flex-col">
                        <label className="font-semibold mb-1 text-sm text-gray-700">District *</label>
                        <select
                            className="border rounded-md px-3 py-2 w-full md:w-40"
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            disabled={!selectedState}
                            required
                        >
                            <option value="">Select District</option>
                            {districts.map((d, i) => (
                                <option key={i} value={d.DIST_name}>
                                    {d.DIST_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* City */}
                    <div className="flex flex-col">
                        <label className="font-semibold mb-1 text-sm text-gray-700">City *</label>
                        <select
                            className="border rounded-md px-3 py-2 w-full md:w-40"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            disabled={!selectedDistrict}
                            required
                        >
                            <option value="">Select City</option>
                            {cities.map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Button */}
                    <div className="flex items-end justify-center md:justify-start">
                        <button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md flex items-center space-x-2 w-full md:w-auto justify-center transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M9.5 17a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
                            </svg>
                            <span>Search</span>
                        </button>
                    </div>
                </form>

                {/* Info text */}
                <p className="text-white text-sm md:text-base max-w-2xl">
                    {searchType === 'donor' && '🩸 Find blood donors near you'}
                    {searchType === 'hospital' && '🏥 Find hospitals with blood stock availability'}
                    {searchType === 'organisation' && '🏢 Find blood donation organizations'}
                </p>
            </div>
        </section>
    );
};

export default Hero;