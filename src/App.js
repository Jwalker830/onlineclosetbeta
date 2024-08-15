import logo from './logo.svg';
import React, { useState, useEffect } from "react";
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase-config.js";
import TagItems from "./pages/TagItems.js"
import Login from "./pages/Login.js"
import SwipeFits from "./pages/SwipeFits.js"
import Closet from "./pages/Closet.js"
import FavFits from './pages/FavFits.js';
import Search from './pages/Search.js';
import Profile from './pages/Profile.js';

function App() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem("isAuth"));

  const signUserOut = () => {
    signOut(auth).then(() => {
      localStorage.clear()
      setIsAuth(false)
      window.location.pathname = "/login";
    })
  }

  return (
    <>
      <Router>
      <nav>
        {isAuth && <Link to="/" onClick={() => {localStorage.removeItem("closetID")}}>Closet</Link>}
        {isAuth && <Link to="/fits">Outfits</Link>}
        {isAuth && <Link to="/tagitems">Tag Items</Link>}
        <Link to="/search">Search</Link>
        {!isAuth ? <Link to="/login">Login</Link> : 
        <>
          <button className="signOutBtn" onClick={signUserOut}>Log Out</button>
        </>
        }
      </nav>
        <Routes>
          <Route path="/tagitems" element={<TagItems isAuth={ isAuth }/>}></Route>
          <Route path="/login" element={<Login setIsAuth={ setIsAuth }/>}></Route>
          <Route path="/swipe" element={<SwipeFits/>}></Route>
          <Route path="/fits" element={<FavFits isAuth={ isAuth }/>}></Route>
          <Route path="/search" element={<Search isAuth={isAuth}/>}></Route>
          <Route path="/profile" element={<Profile />}></Route>
          <Route path="/" element={<Closet isAuth={isAuth}/>}></Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
