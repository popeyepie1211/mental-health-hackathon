import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

// --- Helper Components & Data ---
const moodOptions = ["Happy", "Excited", "Calm", "Neutral", "Anxious", "Sad", "Angry"];
const Modal = ({ message, onClose }) => {
    if (!message) return null;
    return (
        <motion.div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center font-sans" initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}>
                <p className="text-lg font-medium text-gray-800 mb-4">{message}</p>
                <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300">Close</button>
            </motion.div>
        </motion.div>
    );
};
const LoaderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;

// --- Main Mood Tracking Page Component ---
export default function MoodTrackingPage({ auth, user, onNavigate }) {
    const [moodScore, setMoodScore] = useState(5);
    const [moodLabel, setMoodLabel] = useState('Neutral');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const [moodAnalysis, setMoodAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const analyzeData = useCallback(async (currentLogs) => {
        if (currentLogs.length === 0) {
            setMoodAnalysis(null);
            return;
        }
        try {
            const response = await fetch('http://localhost:8000/analyze_mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: currentLogs })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            setMoodAnalysis(data);
        } catch (error) {
            console.error("Error analyzing mood data:", error);
            setModalMessage("Could not analyze mood data. Is the backend server running?");
        }
    }, []);
    
    const fetchMoodLogs = useCallback(async () => {
        if (!user?.uid || !auth?.app) return;
        setIsLoading(true);
        try {
            const db = getFirestore(auth.app);
            const path = `/artifacts/${appId}/users/${user.uid}/entries`;
            const q = query(collection(db, path), orderBy("date", "asc"));
            const querySnapshot = await getDocs(q);
            const fetchedLogs = querySnapshot.docs.map(doc => doc.data()).filter(entry => entry.mood_score != null);
            await analyzeData(fetchedLogs);
        } catch (error) {
            console.error("Error fetching mood logs:", error);
            setModalMessage("Failed to fetch mood history.");
        } finally {
            setIsLoading(false);
        }
    }, [user, auth, appId, analyzeData]);

    useEffect(() => {
        fetchMoodLogs();
    }, [fetchMoodLogs]);

    const handleMoodSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newEntry = {
            date: new Date().toISOString().split('T')[0],
            mood_score: moodScore,
            mood_label: moodLabel,
        };
        try {
            const db = getFirestore(auth.app);
            const path = `/artifacts/${appId}/users/${user.uid}/entries`;
            await addDoc(collection(db, path), newEntry);
            setModalMessage("Mood logged successfully!");
            await fetchMoodLogs();
        } catch (error) {
            console.error("Error saving mood entry:", error);
            setModalMessage("Failed to save your mood.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
    };

    return (
        <div className="min-h-screen w-full bg-[#0d1120] text-white font-sans p-4 sm:p-8 overflow-hidden">
            <style>{`
                /* Inspired by Uiverse.io by adamgiebl */
                .uiverse-card {
                    --background: linear-gradient(to left, #6366f1 0%, #a855f7 100%);
                    width: 100%;
                    height: 100%;
                    padding: 5px;
                    border-radius: 1rem;
                    overflow: visible;
                    background: var(--background);
                    position: relative;
                    z-index: 1;
                }
                .uiverse-card::after {
                    position: absolute;
                    content: "";
                    top: 30px;
                    left: 0;
                    right: 0;
                    z-index: -1;
                    height: 100%;
                    width: 100%;
                    transform: scale(0.9);
                    filter: blur(25px);
                    background: var(--background);
                    transition: opacity 0.5s;
                }
                .uiverse-card-info {
                    --color: #1e293b; /* slate-800 */
                    background: var(--color);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    padding: 1.5rem;
                    border-radius: 0.8rem;
                }
                .uiverse-card:hover::after {
                    opacity: 0;
                }
            `}</style>

            <Modal message={modalMessage} onClose={() => setModalMessage('')} />

            <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
                <motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-4xl font-bold tracking-tight">How Are You?</motion.h1>
                <motion.button initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onClick={() => onNavigate('landing')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors text-sm backdrop-blur-sm border border-white/20">Back to Home</motion.button>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Input Form */}
                <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <div className="uiverse-card">
                        <div className="uiverse-card-info">
                            <h2 className="text-2xl font-semibold mb-6 text-center">Log Your Mood</h2>
                            <form onSubmit={handleMoodSubmit} className="space-y-6">
                                <div>
                                    <label className="block mb-3 text-center text-indigo-300">Score: <span className="font-bold text-white text-2xl">{moodScore}</span>/10</label>
                                    <input type="range" min="1" max="10" value={moodScore} onChange={(e) => setMoodScore(parseInt(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-400" />
                                </div>
                                <div>
                                    <label className="block mb-3 text-indigo-300 text-center">Label</label>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {moodOptions.map(label => (
                                            <button type="button" key={label} onClick={() => setMoodLabel(label)} className={`px-3 py-1 text-sm rounded-full transition-all duration-300 ${moodLabel === label ? 'bg-indigo-400 text-white font-semibold shadow-lg scale-110' : 'bg-slate-700 hover:bg-slate-600'}`}>{label}</button>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                                    {isSubmitting && <LoaderIcon />} {isSubmitting ? 'Logging...' : 'Log Mood'}
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Analytics */}
                <motion.div variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-lg border border-white/20">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Your Analytics</h2>
                    {isLoading ? (<div className="flex items-center justify-center h-full"><p>Loading Analytics...</p></div>) : moodAnalysis ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-full">
                            <div className="md:col-span-3 h-80">
                                <h3 className="font-semibold text-indigo-300 mb-2 text-center">Mood Trend</h3>
                                <Line data={{ labels: moodAnalysis.dates, datasets: [{ label: 'Mood Score', data: moodAnalysis.mood_scores, fill: true, borderColor: 'rgba(165, 180, 252, 0.8)', backgroundColor: 'rgba(129, 140, 248, 0.2)', tension: 0.4, pointBackgroundColor: '#a5b4fc' }] }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#9ca3af' }, grid: { display: false } } }, plugins: { legend: { display: false } } }} />
                            </div>
                            <div className="md:col-span-2 flex flex-col items-center justify-center h-80">
                                <h3 className="font-semibold text-indigo-300 mb-4 text-center">Distribution</h3>
                                <div className="w-48 h-48 sm:w-56 sm:h-56">
                                    <Doughnut data={{ labels: Object.keys(moodAnalysis.mood_distribution), datasets: [{ data: Object.values(moodAnalysis.mood_distribution), backgroundColor: ['#34D399', '#FBBF24', '#F87171', '#60A5FA', '#A78BFA', '#F472B6', '#818CF8'], borderColor: '#1e293b', borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                </div>
                            </div>
                        </div>
                    ) : (<div className="flex items-center justify-center h-full text-center"><p>Log your mood to see your analytics dashboard!</p></div>)}
                </motion.div>
            </main>
        </div>
    );
}
