import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/blood-donation.png";

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen(!menuOpen);
    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="shadow-md bg-white sticky top-0 z-50">
            <div className="flex justify-between items-center px-6 py-4">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center space-x-3 hover:opacity-90 transition"
                    onClick={closeMenu}
                >
                    <img src={logo} alt="Life Drop Logo" className="w-10 h-10" />
                    <div>
                        <h1 className="text-3xl font-bold text-red-600">Life Drop</h1>
                        <p className="text-xs text-gray-500">Every drop matters!</p>
                    </div>
                </Link>

                {/* For (mobile) View */}
                <button
                    onClick={toggleMenu}
                    className="md:hidden text-red-600 text-3xl focus:outline-none"
                >
                    {menuOpen ? "✕" : "☰"}
                </button>

                {/* Desktop Menu */}
                <nav className="hidden md:flex space-x-8 font-medium">
                    <Link
                        to="/find-donor"
                        className="relative group transition-colors duration-300 hover:text-red-600"
                    >
                        Find Donor
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-600 transition-all duration-300 group-hover:w-full"></span>
                    </Link>

                    <Link
                        to="/about"
                        className="relative group transition-colors duration-300 hover:text-red-600"
                    >
                        About Us
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-600 transition-all duration-300 group-hover:w-full"></span>
                    </Link>

                    <Link
                        to="/feedback"
                        className="relative group transition-colors duration-300 hover:text-red-600"
                    >
                        Feedback
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-600 transition-all duration-300 group-hover:w-full"></span>
                    </Link>

                    <div className="flex space-x-4">
                        <Link
                            to="/register"
                            className="relative group transition-colors duration-300 hover:text-red-600"
                        >
                            Register
                            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-600 transition-all duration-300 group-hover:w-full"></span>
                        </Link>

                        <Link
                            to="/login"
                            className="relative group transition-colors duration-300 hover:text-red-600"
                        >
                            Login
                            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-red-600 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    </div>
                </nav>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="font-medium px-6 pb-4 md:hidden mt-2 space-y-3 bg-white border-t border-gray-100">
                    <Link
                        to="/search"
                        onClick={closeMenu}
                        className="block hover:text-red-600 transition"
                    >
                        Find Donor
                    </Link>
                    <Link
                        to="/about"
                        onClick={closeMenu}
                        className="block hover:text-red-600 transition"
                    >
                        About Us
                    </Link>
                    <Link
                        to="/feedback"
                        onClick={closeMenu}
                        className="block hover:text-red-600 transition"
                    >
                        Feedback
                    </Link>
                    <Link
                        to="/register"
                        onClick={closeMenu}
                        className="block hover:text-red-600 transition"
                    >
                        Register
                    </Link>
                    <Link
                        to="/login"
                        onClick={closeMenu}
                        className="block hover:text-red-600 transition"
                    >
                        Login
                    </Link>
                </div>
            )}
        </header>
    );
};

export default Navbar;
