import React, { useState, useEffect } from 'react';

const FeedbackPage = () => {
    // Sample feedback data (in a real app, fetch from API)
    const [feedbacks, setFeedbacks] = useState([]);

    // Form state
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [errors, setErrors] = useState({});

    // Slideshow state
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-advance slideshow every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % feedbacks.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [feedbacks.length]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors({ ...errors, [name]: '' }); // Clear error on change
    };

    // Validate and submit form
    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required.';
        if (!formData.email.trim()) newErrors.email = 'Email is required.';
        if (!formData.message.trim()) newErrors.message = 'Message is required.';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Add new feedback to the list
        const newFeedback = {
            id: feedbacks.length + 1,
            ...formData,
        };
        setFeedbacks([...feedbacks, newFeedback]);
        setFormData({ name: '', email: '', message: '' }); // Reset form
        alert('Thank you for your feedback!');
    };

    // Slideshow navigation
    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % feedbacks.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + feedbacks.length) % feedbacks.length);

    return (
        <div className="max-w-4xl mx-auto p-6 font-sans">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Feedback Page</h1>

            {/* Feedback Form */}
            <div className="bg-white shadow-lg rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 border-t-4 border-red-600 mb-8">
                <h2 className="text-xl font-semibold text-red-700 mb-4">Submit Your Feedback</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.name && <span className="text-red-500 text-sm mt-1 block">{errors.name}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message:</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.message && <span className="text-red-500 text-sm mt-1 block">{errors.message}</span>}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200"
                    >
                        Submit Feedback
                    </button>
                </form>
            </div>

            {/* Feedback Slideshow */}
            <div className="bg-white shadow-lg rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 border-t-4 border-red-600">
                <h2 className="text-xl font-semibold text-red-700 mb-4">What Others Are Saying</h2>
                {feedbacks.length > 0 ? (
                    <div className="relative overflow-hidden w-full h-48 md:h-56">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {feedbacks.map((feedback) => (
                                <div key={feedback.id} className="min-w-full p-4 text-center">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{feedback.name}</h3>
                                    <p className="text-gray-700">{feedback.message}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
                            onClick={prevSlide}
                        >
                            &lt;
                        </button>
                        <button
                            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
                            onClick={nextSlide}
                        >
                            &gt;
                        </button>
                        <div className="flex justify-center mt-4 space-x-2">
                            {feedbacks.map((_, index) => (
                                <span
                                    key={index}
                                    className={`w-3 h-3 rounded-full cursor-pointer transition-colors ${index === currentSlide ? 'bg-red-600' : 'bg-gray-300'}`}
                                    onClick={() => setCurrentSlide(index)}
                                ></span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center">No feedback yet. Be the first to submit!</p>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
