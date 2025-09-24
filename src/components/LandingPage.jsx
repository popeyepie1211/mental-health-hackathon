import React from 'react';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

// --- Custom Hook for Typewriter Effect ---
const useTypewriter = (text, speed = 50) => {
    const [displayText, setDisplayText] = React.useState('');
    React.useEffect(() => {
        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                setDisplayText(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(typingInterval);
            }
        }, speed);
        return () => clearInterval(typingInterval);
    }, [text, speed]);
    return displayText;
};

// --- Testimonial Carousel Component ---
const testimonials = [
    { quote: "Mindful has become my daily ritual. It's helped me understand my emotional patterns like never before.", author: "Jessica L." },
    { quote: "The journaling analysis is a game-changer. Seeing the key topics from my entries has been incredibly insightful.", author: "Mark C." },
    { quote: "A beautiful and calming space to reflect. I finally feel in tune with my mental well-being.", author: "Samantha R." },
];

const TestimonialCarousel = () => {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prevIndex => (prevIndex + 1) % testimonials.length);
        }, 5000); // Change testimonial every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative h-24 w-full max-w-2xl mt-16 overflow-hidden">
            <AnimatePresence>
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center"
                >
                    <p className="text-lg italic text-slate-700">"{testimonials[index].quote}"</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">- {testimonials[index].author}</p>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};


// --- Main Landing Page Component ---
const LandingPage = ({ auth, user, onNavigate }) => {
    const animatedSubheading = useTypewriter("Your sanctuary for self-reflection and growth.", 40);

    return (
        // UPDATED: Replaced bg-slate-50 with a beautiful multi-color gradient
        <div className="min-h-screen w-full bg-gradient-to-br from-cyan-100 via-purple-100 to-pink-200 text-slate-900 font-sans overflow-hidden relative">
            
            <div className="relative z-10">
                {/* Navbar */}
                <motion.nav 
                    initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex justify-between items-center p-6 max-w-7xl mx-auto"
                >
                    <h1 className="text-2xl font-bold tracking-wider text-slate-800">Mindful</h1>
                    <div className="flex items-center space-x-6">
                        <button onClick={() => onNavigate('journaling')} className="text-slate-600 hover:text-slate-900 transition-colors">Journaling</button>
                        <button onClick={() => onNavigate('moodtracking')} className="text-slate-600 hover:text-slate-900 transition-colors">Mood Tracking</button>
                        <button onClick={() => signOut(auth)} className="bg-white/50 hover:bg-white/80 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-200 text-slate-700 backdrop-blur-sm">
                            Sign Out
                        </button>
                    </div>
                </motion.nav>

                {/* Hero Section */}
                <main className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
                        className="text-5xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-pink-500"
                    >
                        Welcome, {user?.email?.split('@')[0] || 'User'}
                    </motion.h2>
                    <p className="text-lg md:text-xl text-slate-600 mb-12 h-8">
                        {animatedSubheading}
                        <span className="animate-ping text-slate-500">_</span>
                    </p>

                    {/* Feature Cards */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }}
                        className="flex flex-col md:flex-row gap-8"
                    >
                        <FeatureCard 
                            title="Begin Journaling"
                            description="Uncover insights from your daily thoughts."
                            onClick={() => onNavigate('journaling')}
                            borderColor="border-green-500/50"
                        />
                        <FeatureCard 
                            title="Track Your Mood"
                            description="Visualize your emotional patterns over time."
                            onClick={() => onNavigate('moodtracking')}
                            borderColor="border-blue-500/50"
                        />
                    </motion.div>
                    
                    <TestimonialCarousel />
                </main>
            </div>
        </div>
    );
};

const FeatureCard = ({ title, description, onClick, borderColor }) => (
    <motion.div
        whileHover={{ y: -8, scale: 1.02, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}
        transition={{ type: "spring", stiffness: 300 }}
        onClick={onClick}
        className={`w-80 h-48 bg-white/60 p-8 rounded-2xl cursor-pointer flex flex-col justify-center items-center text-center border ${borderColor} backdrop-blur-lg shadow-lg`}
    >
        <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-600 text-sm">{description}</p>
    </motion.div>
);

export default LandingPage;

