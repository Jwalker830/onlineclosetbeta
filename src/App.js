import React, { useState, useEffect } from "react";
import './App.css';
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase-config.js";
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
                    {!isAuth ? <Link to="/login">Login</Link> :
                        <>
                            <button className="signOutBtn" onClick={signUserOut}>Log Out</button>
                        </>
                    }
                    <Link to="/about">About</Link>
                </div>
            </nav>
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