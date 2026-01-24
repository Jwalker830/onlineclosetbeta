import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase-config";
import { query, collection, where, getDocs } from "firebase/firestore";
import './App.css';
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import TagItems from "./pages/TagItems.js";
import Login from "./pages/Login.js";
import SwipeFits from "./pages/SwipeFits.js";
import Closet from "./pages/Closet.js";
import FavFits from './pages/FavFits.js';
import Search from './pages/Search.js';
import Profile from './pages/Profile.js';
import AutoTag from './pages/AutoTag.js';
import Feed from './pages/Feed.js';
import About from './pages/About.js';
import LogField from './pages/LogField.js';
import ViewLog from './pages/ViewLog.js';
import GeneratePackingList from './pages/GeneratePackingList';
import MatchFit from './pages/MatchFit.js';


function App() {
    const [isAuth, setIsAuth] = useState(localStorage.getItem("isAuth"));
    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
    const [showSettings, setShowSettings] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [userCombos, setUserCombos] = useState("");
    // Fetch combos string for export
    useEffect(() => {
        const fetchCombos = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
                const querySnapshot = await getDocs(q);
                let combos = "";
                await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                    const data = userDoc.data();
                    combos = data.combos || "";
                }));
                setUserCombos(combos);
            } catch (error) {
                setUserCombos("");
            }
        };
        if (showSettings && auth.currentUser) fetchCombos();
    }, [showSettings]);

    // Export combos to .txt file
    const handleExportCombos = () => {
        if (!userCombos) return;
        const blob = new Blob([userCombos], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'combos.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Toggle dark mode class on body
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

    const signUserOut = () => {
        signOut(auth).then(() => {
            localStorage.clear();
            setIsAuth(false);
            window.location.pathname = "/onlineclosetbeta/login";
        });
    };


    useEffect(() => {
        const handleResize = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
        };
    }, []);

    return (
        <Router>
            {/* Portrait warning overlay */}
            {isPortrait && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0,
                    width: "100%", height: "100%",
                    backgroundColor: "rgba(0,0,0,0.85)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    textAlign: "center",
                    padding: "20px",
                    fontSize: "1.5rem"
                }}>
                    Please flip your phone horizontal
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ minWidth: 260, maxWidth: 320 }}>
                        <h3 style={{ marginBottom: 18, fontSize: '1.2rem' }}>Settings</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: '1rem' }}>Dark Mode</span>
                            <label className="switch">
                                <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(v => !v)} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <button className="modal-btn" style={{ marginTop: 10, marginBottom: 8, background: '#444', color: '#fff' }} onClick={handleExportCombos} disabled={!userCombos}>
                            Export Combo Sheet
                        </button>
                        <button className="modal-btn cancel" style={{ marginTop: 0 }} onClick={() => setShowSettings(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* Nav is hidden in portrait mode, so also hide settings button */}
            {!isPortrait && (
                <nav>
                    <div className="nav-top">
                        {isAuth && <Link to="/feed">Feed</Link>}
                        {isAuth && <Link to="/" onClick={() => { localStorage.removeItem("closetID") }}>Closet</Link>}
                        {isAuth && <Link to="/pack">Pack</Link>}
                        {isAuth && <Link to="/fits">Outfits</Link>}
                        {isAuth && <Link to="/tagitems">Tag Items</Link>}
                        {isAuth && <Link to="/profile">Profile</Link>}
                        <Link to="/search">Search</Link>
                    </div>
                    <div className="nav-bottom">
                        <button className="settingsBtn" title="Settings" onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', padding: 0, marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, lineHeight: 1 }}>
                            <span role="img" aria-label="Settings">⚙</span>
                        </button>
                        
                        {!isAuth ? <Link to="/login">Login</Link> :
                            <>
                                <button className="signOutBtn" onClick={signUserOut}>Log Out</button>
                            </>
                        }
                        <Link to="/about">About</Link>
                    </div>
                </nav>
            )}
            <div className="main-content">
                <Routes>
                    <Route path="/tagitems" element={<TagItems isAuth={isAuth} />} />
                    <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
                    <Route path="/swipe" element={<SwipeFits />} />
                    <Route path="/pack" element={<GeneratePackingList setIsAuth={setIsAuth} />} />
                    <Route path="/fits" element={<FavFits isAuth={isAuth} />} />
                    <Route path="/search" element={<Search isAuth={isAuth} />} />
                    <Route path="/profile" element={<Profile isAuth={isAuth} />} />
                    <Route path="/profile/:profileId" element={<Profile isAuth={isAuth} />} />
                    <Route path="/post/:logId" element={<ViewLog isAuth={isAuth} />} />
                    <Route path="/" element={<Closet isAuth={isAuth} />} />
                    <Route path="/:profileId" element={<Closet isAuth={isAuth} />} />
                    <Route path="/feed" element={<Feed isAuth={isAuth} />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/createlog" element={<LogField />} />
                    <Route path="/matchfit/:fitcode" element={<MatchFit isAuth={isAuth} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;