import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
// Correctly import 'limit' from firestore
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit } from 'firebase/firestore'; 
import { getFirestore } from 'firebase/firestore';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// --- SVG Icons ---
const SparkleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7z"/></svg>;
const LoaderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;

// --- Helper Components & Data ---
const qualityOptions = ["Excellent", "Good", "Fair", "Poor"];
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

// Main Sleep Page Component
export default function SleepPage({ auth, user, onNavigate }) {
    const [duration, setDuration] = useState('');
    const [quality, setQuality] = useState('Good');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    
    const [sleepLogs, setSleepLogs] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [aiComment, setAiComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const processChartData = (logs) => {
        if (!logs || logs.length === 0) return null;
        const reversedLogs = [...logs].reverse();
        return {
            dates: reversedLogs.map(log => log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'N/A'),
            durations: reversedLogs.map(log => log.duration_minutes)
        };
    };

    useEffect(() => {
        if (!user?.uid || !auth?.app) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        const db = getFirestore(auth.app);
        const path = `/artifacts/${appId}/users/${user.uid}/sleepLogs`;
        const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(30));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSleepLogs(fetchedLogs);
            setChartData(processChartData(fetchedLogs));
            setIsLoading(false);
        }, (error) => {
            console.error("Failed to fetch sleep logs:", error);
            setModalMessage("Failed to fetch sleep history.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user, auth, appId]);

    const handleSaveEntry = async (e) => {
        e.preventDefault();
        if (!duration || parseInt(duration) <= 0) {
            setModalMessage("Please enter a valid duration.");
            return;
        }
        setIsSubmitting(true);
        setAiComment('');

        const newEntry = {
            duration_minutes: parseInt(duration),
            quality: quality,
            timestamp: serverTimestamp(),
        };

        try {
            const db = getFirestore(auth.app);
            const path = `/artifacts/${appId}/users/${user.uid}/sleepLogs`;
            await addDoc(collection(db, path), newEntry);
            
            const response = await fetch('http://localhost:8000/generate_sleep_comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: new Date().toISOString().split('T')[0],
                    sleep_hours: newEntry.duration_minutes / 60
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAiComment(data.sleep_comment);
            } else {
                 throw new Error("Failed to fetch AI comment.");
            }

            setModalMessage("Sleep logged successfully!");
            setDuration('');
            setQuality('Good');
        } catch (error) {
            console.error("Error during sleep log submission:", error);
            setModalMessage("Failed to save or get comment. Is the backend running?");
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
                .uiverse-card-sleep {
                    --background: linear-gradient(to left, #3b82f6 0%, #1e40af 100%);
                    width: 100%; height: 100%; padding: 5px; border-radius: 1rem;
                    overflow: visible; background: var(--background); position: relative; z-index: 1;
                }
                .uiverse-card-sleep::after {
                    position: absolute; content: ""; top: 30px; left: 0; right: 0; z-index: -1;
                    height: 100%; width: 100%; transform: scale(0.9); filter: blur(25px);
                    background: var(--background); transition: opacity 0.5s;
                }
                .uiverse-card-info-sleep {
                    --color: #1e293b; background: var(--color); color: white; display: flex; flex-direction: column;
                    justify-content: space-between; width: 100%; height: 100%; padding: 1.5rem; border-radius: 0.8rem;
                }
                .uiverse-card-sleep:hover::after { opacity: 0; }
            `}</style>
            <Modal message={modalMessage} onClose={() => setModalMessage('')} />

            <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
                <motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-4xl font-bold tracking-tight">Sleep Journal</motion.h1>
                <motion.button initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onClick={() => onNavigate('landing')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors text-sm backdrop-blur-sm border border-white/20">Back to Home</motion.button>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <div className="uiverse-card-sleep">
                        <div className="uiverse-card-info-sleep">
                            <div>
                                <h2 className="text-2xl font-semibold mb-6 text-center">Log Your Night's Rest</h2>
                                <form onSubmit={handleSaveEntry} className="space-y-6">
                                    <div>
                                        <label htmlFor="duration" className="block mb-2 text-blue-300">Duration (in minutes)</label>
                                        <input id="duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 480" className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block mb-3 text-blue-300">Quality</label>
                                        <div className="flex flex-wrap gap-2">
                                            {qualityOptions.map(label => (
                                                <button type="button" key={label} onClick={() => setQuality(label)} className={`px-3 py-1 text-sm rounded-full transition-all duration-300 ${quality === label ? 'bg-blue-400 text-white font-semibold shadow-lg scale-110' : 'bg-slate-700 hover:bg-slate-600'}`}>{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                                        {isSubmitting && <LoaderIcon />} {isSubmitting ? 'Saving...' : 'Save Log'}
                                    </button>
                                </form>
                            </div>
                            <AnimatePresence>
                                {aiComment && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 bg-slate-800/50 p-4 rounded-lg border border-white/20 flex items-start gap-3">
                                        <SparkleIcon />
                                        <p className="text-blue-200 text-sm leading-relaxed flex-1">{aiComment}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-lg border border-white/20">
                    <h2 className="text-2xl font-semibold mb-4">Your Sleep History</h2>
                     {isLoading ? (<div className="flex items-center justify-center h-full"><p>Loading History...</p></div>) : sleepLogs.length > 0 ? (
                        <div className="flex flex-col gap-6 h-full">
                            <div className="h-64">
                                <h3 className="font-semibold text-blue-300 mb-2 text-center">Sleep Trend</h3>
                                <Line data={{ labels: chartData.dates, datasets: [{ label: 'Duration (minutes)', data: chartData.durations, fill: true, borderColor: 'rgba(96, 165, 250, 0.8)', backgroundColor: 'rgba(59, 130, 246, 0.2)', tension: 0.4, pointBackgroundColor: '#60a5fa' }]}} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#9ca3af' }, grid: { display: false } } }, plugins: { legend: { display: false } } }} />
                            </div>
                            <div className="flex-grow overflow-y-auto pr-2">
                                <h3 className="font-semibold text-blue-300 mb-2">Recent Logs</h3>
                                <ul className="space-y-2">
                                    {sleepLogs.map(log => (
                                        <li key={log.id} className="bg-slate-900/70 p-3 rounded-lg flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-semibold">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'N/A'}</span>
                                                <span className="text-slate-400 ml-3">({log.quality})</span>
                                            </div>
                                            <span className="font-bold">{Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                     ) : (<div className="flex items-center justify-center h-full text-center"><p>Log your sleep to see your history and trends!</p></div>)}
                </motion.div>
            </main>
        </div>
    );
}

