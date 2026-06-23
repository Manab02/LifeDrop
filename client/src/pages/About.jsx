import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const About = () => {
    return (
        <>
            <Navbar />
            <div className="bg-gray-50 text-gray-800">
                <section className="bg-[url('./assets/aboutusbackground.avif')] bg-cover bg-center relative text-center text-white py-28 px-6">
                    <div className="absolute inset-0 bg-red-500/30"></div>
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About LifeDrop</h1>
                        <p className="text-lg md:text-xl">
                            Helping every Indian find a voluntary blood donor with hope and care.
                        </p>
                    </div>
                </section>
                <section className="py-16 px-6 text-center">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl font-bold text-red-700 mb-6">Our Mission</h2>
                        <p className="text-gray-600 mb-12 text-lg leading-relaxed">
                            At LifeDrop, we believe every drop of blood has the power to change a life.
                            Our mission is to ensure that no one loses their loved ones due to a shortage of blood –
                            by connecting voluntary donors, hospitals, and patients through technology and compassion.
                        </p>

                        <h2 className="text-3xl font-bold text-red-700 mb-6">Our Vision</h2>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            We envision a connected world where generosity meets innovation,
                            and every donor is just a click away from saving a life.
                        </p>
                    </div>
                </section>
                <section className="py-16 bg-white px-6">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-red-700 mb-12">
                            What Makes Us Different
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="bg-white shadow-lg rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 border-t-4 border-red-600">
                                <h3 className="text-xl font-semibold text-red-700 mb-2">
                                    ⚡ Real-Time Blood Availability
                                </h3>
                                <p className="text-gray-600">
                                    See nearby donors and hospital needs instantly with our live blood radar map.
                                </p>
                            </div>
                            <div className="bg-white shadow-lg rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 border-t-4 border-red-600">
                                <h3 className="text-xl font-semibold text-red-700 mb-2">
                                    💰 Blood Credit Wallet
                                </h3>
                                <p className="text-gray-600">
                                    Earn redeemable credits for every donation – use them for your loved ones in need.
                                </p>
                            </div>
                            <div className="bg-white shadow-lg rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 border-t-4 border-red-600">
                                <h3 className="text-xl font-semibold text-red-700 mb-2">
                                    🤖 Smart AI Matching
                                </h3>
                                <p className="text-gray-600">
                                    Our AI connects the right donors to the right patients faster than ever before.
                                </p>
                            </div>
                            <div className="bg-white shadow-lg rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 border-t-4 border-red-600">
                                <h3 className="text-xl font-semibold text-red-700 mb-2">
                                    🔒 Transparent & Secure
                                </h3>
                                <p className="text-gray-600">
                                    Every donation is traceable and verified, ensuring safety and accountability for all.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-red-700 text-white text-center py-20 px-6">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Join Our Movement – Be Someone's Lifeline
                    </h2>
                    <a
                        href="/register"
                        className="inline-block bg-white text-red-700 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition"
                    >
                        Register as a Donor
                    </a>
                </section>
            </div>
            <Footer />
        </>
    );
};

export default About;