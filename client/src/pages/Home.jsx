import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <div className="bg-white text-gray-800">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
};

export default Home;
