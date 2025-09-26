import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig.js'; // Import db from your config file
import { collection, addDoc, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// --- Helper Components ---
const LoaderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;

// --- Reusable Chart Components (Styled for Dark Theme) ---
const SentimentChart = ({ data }) => {
  if (!data || !data.sentiment_distribution) {
    return <p className="text-center text-slate-400">No sentiment data available.</p>;
  }
  const chartData = {
    labels: Object.keys(data.sentiment_distribution),
    datasets: [
      {
        data: Object.values(data.sentiment_distribution),
        backgroundColor: ['#22c55e', '#f97316', '#ef4444'],
        borderColor: '#1e293b', // Dark background color for borders
        borderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, boxWidth: 12, font: { size: 12 }, color: '#cbd5e1' } // Light text for legend
      }
    }
  };
  return <Pie data={chartData} options={options} />;
};

const EmotionChart = ({ data }) => {
  if (!data || !data.emotions) {
    return <p className="text-center text-slate-400">No emotion data available.</p>;
  }
  const chartData = {
    labels: data.emotions.map(e => e.emotion),
    datasets: [
      {
        label: 'Emotion Intensity',
        data: data.emotions.map(e => e.intensity),
        backgroundColor: '#818cf8', // A nice purple for the dark theme
      },
    ],
  };
  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { display: false }
      }
    }
  };
  return <Bar data={chartData} options={options} />;
};

// --- Main Journal Page ---
const JournalPage = ({ user, onNavigate }) => {
  const [journalText, setJournalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousEntries, setPreviousEntries] = useState([]);
  const [error, setError] = useState(null);

  const fetchJournalAnalysis = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const entriesRef = collection(db, 'entries');
      const q = query(entriesRef, where('userId', '==', user.uid), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPreviousEntries(fetchedEntries);
      const allJournalEntries = fetchedEntries.filter((entry) => entry.journal_text);
      if (allJournalEntries.length > 0) {
        const res = await fetch('http://localhost:8000/analyze_journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: allJournalEntries }),
        });
        if (!res.ok) throw new Error(`Server responded with an error: ${res.status} ${res.statusText}`);
        const data = await res.json();
        setAnalysis(data);
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Error fetching or analyzing journal entries:', err);
      if (err.message.includes('Failed to fetch')) setError('Connection failed. Ensure the analysis server is running.');
      else if (err.message.includes('index')) setError('A database index is required. Check the browser console for a link to create it.');
      else setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJournalAnalysis();
  }, [user, fetchJournalAnalysis]);

  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    if (!journalText.trim() || !user) return;
    setIsSubmitting(true);
    const newEntry = {
      userId: user.uid,
      date: new Date().toISOString(),
      journal_text: journalText,
    };
    try {
      await addDoc(collection(db, 'entries'), newEntry);
      setJournalText('');
      await fetchJournalAnalysis();
    } catch (err) {
      console.error('Error saving journal:', err);
      setError('Failed to save journal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id) => {
      try {
          const entryDocRef = doc(db, 'entries', id);
          await deleteDoc(entryDocRef);
          await fetchJournalAnalysis();
      } catch (err) {
          console.error("Error deleting entry:", err);
          setError("Failed to delete the journal entry. Please try again.");
      }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1120] font-sans">
        <div className="text-center p-8 bg-slate-800/50 rounded-lg shadow-lg border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">Welcome to Your Journal</h2>
          <p className="text-slate-400">Please sign in to begin recording and analyzing your thoughts.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
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
          width: 100%;
          height: 100%;
          padding: 1.5rem;
          border-radius: 0.8rem;
        }
        .uiverse-card:hover::after {
          opacity: 0;
        }
      `}</style>
      <div className="min-h-screen w-full bg-[#0d1120] text-white font-sans p-4 sm:p-8">
        <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
            <motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-4xl font-bold tracking-tight">Your Journal</motion.h1>
            <motion.button initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onClick={() => onNavigate('landing')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors text-sm backdrop-blur-sm border border-white/20">
                Back to Home
            </motion.button>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-1">
            <div className="uiverse-card">
              <div className="uiverse-card-info">
                <h2 className="text-xl font-semibold mb-4 text-slate-100">Write your thoughts</h2>
                <form onSubmit={handleJournalSubmit} className="space-y-4">
                  <textarea
                    rows="6"
                    className="w-full bg-slate-700 p-3 rounded-md border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow placeholder:text-slate-400"
                    placeholder="How was your day? What's on your mind?"
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                  ></textarea>
                  <button
                    type="submit"
                    disabled={isSubmitting || !journalText.trim()}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white py-2.5 rounded-lg font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <LoaderIcon/>}
                    {isSubmitting ? 'Saving...' : 'Save & Analyze'}
                  </button>
                </form>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-3 text-slate-300">Recent Entries</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    <AnimatePresence>
                      {!isLoading && previousEntries.length > 0 ? previousEntries.map(entry => (
                        <motion.div
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                          className="relative bg-slate-900/50 p-4 rounded-lg border border-slate-700"
                        >
                          <button onClick={() => handleDeleteEntry(entry.id)} className="absolute top-2 right-2 p-1 rounded-full text-slate-500 hover:bg-red-900/50 hover:text-red-400 transition-colors" aria-label="Delete entry">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <p className="text-xs font-semibold text-indigo-400 mb-1 pr-6">{new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{entry.journal_text}</p>
                        </motion.div>
                      )) : null}
                    </AnimatePresence>
                    {!isLoading && previousEntries.length === 0 && (
                      <div className="text-center py-8 px-4 text-slate-500">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        <p className="mt-4 text-sm">Your past entries will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right Column */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-lg border border-white/20 flex flex-col">
            {error && <div className="bg-red-900/80 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4" role="alert"><strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span></div>}
            
            {isLoading ? (
              <div className="flex items-center justify-center flex-grow min-h-[300px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div></div>
            ) : analysis && !error ? (
              <div className="flex flex-col flex-grow space-y-6">
                {analysis.ai_comment && analysis.ai_comment !== "Unable to generate comment at the moment." && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/30 text-indigo-200">
                    <p className="text-sm leading-relaxed"><strong className="font-semibold">A quick thought for you:</strong> {analysis.ai_comment}</p>
                  </motion.div>
                )}
                
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">Sentiment</h3>
                    <div className="relative flex-grow w-full max-w-[250px]"><SentimentChart data={analysis} /></div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 text-center">Emotions</h3>
                    <div className="relative flex-grow w-full min-h-[250px]"><EmotionChart data={analysis} /></div>
                  </div>
                </div>

              </div>
            ) : (
              !error && (
                <div className="text-center flex-grow flex flex-col items-center justify-center text-slate-500">
                  <svg className="mx-auto h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" /></svg>
                  <h3 className="text-lg font-semibold text-slate-300">Your Insights Will Appear Here</h3>
                  <p className="mt-1 text-sm">Start by writing a journal entry to see your emotional analysis.</p>
                </div>
              )
            )}
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default JournalPage;