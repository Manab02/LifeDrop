import React from "react";
import instagram from "../assets/instagram.png";
import facebook from "../assets/facebook.png";
import twitter from "../assets/twitter.png";
import youtube from "../assets/youtube.png";

const Footer = () => {
    const socialIcons = [
        { name: "instagram", src: instagram, link: "#" },
        { name: "facebook", src: facebook, link: "#" },
        { name: "twitter", src: twitter, link: "#" },
        { name: "youtube", src: youtube, link: "#" },
    ];

    return (
        <footer className="bg-gray-900 text-white py-10 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {/* LifeDrop */}
                <div>
                    <h2 className="text-xl font-bold mb-2 tracking-wide">LifeDrop</h2>
                    <div className="w-16 h-0.5 bg-red-600 mb-4"></div>
                    <p className="text-gray-300 text-sm mb-4">
                        Helping every Indian find a voluntary blood donor with hope and care.
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">
                        {socialIcons.map((icon) => (
                            <a
                                key={icon.name}
                                href={icon.link}
                                className="p-2 rounded-full hover:bg-red-700 transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:scale-105"
                            >
                                <img
                                    src={icon.src}
                                    alt={icon.name}
                                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10"
                                />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h2 className="text-xl font-bold mb-2 tracking-wide">QUICK LINKS</h2>
                    <div className="w-28 h-0.5 bg-red-600 mb-4"></div>
                    <ul className="space-y-2 text-sm text-gray-300">
                        {["Achievements", "Contributors", "News Coverage"].map((item) => (
                            <li key={item}>
                                <a
                                    href="#"
                                    className="hover:text-red-500 flex items-center transform transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
                                >
                                    <span className="mr-2">›</span> {item}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* About */}
                <div>
                    <h2 className="text-xl font-bold mb-2 tracking-wide">ABOUT</h2>
                    <div className="w-16 h-0.5 bg-red-600 mb-4"></div>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li>
                            <a href="/about" className="hover:text-red-500 flex items-center transform transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
                                <span className="mr-2">›</span> About Us
                            </a>
                        </li>
                        <li>
                            <a href="/founders" className="hover:text-red-500 flex items-center transform transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
                                <span className="mr-2">›</span> Founders
                            </a>
                        </li>
                        <li>
                            <a href="/team" className="hover:text-red-500 flex items-center transform transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
                                <span className="mr-2">›</span> Team On Field
                            </a>
                        </li>
                    </ul>

                </div>

                {/* Contact */}
                <div>
                    <h2 className="text-xl font-bold mb-2 tracking-wide">CONTACT US</h2>
                    <div className="w-28 h-0.5 bg-red-600 mb-4"></div>
                    <a
                        href="mailto:lifedrop@gmail.com"
                        className="flex items-center text-sm text-gray-300 hover:text-red-500 transform transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
                    >
                        Email: lifedrop@gmail.com
                    </a>
                    <br />
                    <a
                        href="tel:+91-9339286350"
                        className="flex items-center text-sm text-gray-300 hover:text-red-500 transform transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
                    >
                        Helpline: +91-9339286350
                    </a>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="mt-8 pt-4 text-center text-sm text-gray-400 border-t border-gray-700 w-full max-w-7xl mx-auto">
                Copyright © 2025 Blood Emergency. All Rights Reserved.
            </div>
        </footer>
    );
};

export default Footer;
