import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Import all page components
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
// We will create these components in the next steps
import JournalingPage from './components/JournalingPage';
import MoodTrackingPage from './components/MoodTrackingPage';


function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // This state will control which page the user sees after logging in
    const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'journaling', 'moodtracking'

    useEffect(() => {
        // This listener from Firebase checks if a user is logged in
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            // If the user logs out, reset the view to the landing page
            if (!currentUser) {
                setCurrentPage('landing');
            }
            setLoading(false);
        });
        // Cleanup the listener when the app closes
        return () => unsubscribe();
    }, []);

    // This function will be passed to other components to allow them to change the page
    const handleNavigation = (page) => {
        setCurrentPage(page);
    };

    // A simple loading screen while Firebase checks for a logged-in user
    if (loading) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Mindful...</div>;
    }

    // This function renders the correct component based on the current state
    const renderContent = () => {
        switch(currentPage) {
            case 'journaling':
                // Pass the user, auth, and navigation function to the JournalingPage
                return <JournalingPage auth={auth} user={user} onNavigate={handleNavigation} />;
            case 'moodtracking':
                // Pass the user, auth, and navigation function to the MoodTrackingPage
                return <MoodTrackingPage auth={auth} user={user} onNavigate={handleNavigation} />;
            default:
                // By default, show the beautiful landing page
                return <LandingPage auth={auth} user={user} onNavigate={handleNavigation} />;
        }
    };

    return (
        <div>
            {/* If a user is logged in, render the content. Otherwise, show the AuthPage. */}
            {user ? renderContent() : <AuthPage auth={auth} />}
        </div>
    );
}

export default App;