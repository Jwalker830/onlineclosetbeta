import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs } from "firebase/firestore";
import DisplayFit from './DisplayFit';

const FavFits = ({ isAuth }) => {
    const [favFits, setFavFits] = useState([]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                getFits();
            }
        });    
        return () => unsubscribe();
    }, []);

    const getFits = async () => {
        try {
            if (!auth.currentUser) {
                console.error("User is not loaded");
                return;
            }
    
            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);
            const fitSet = new Set();
    
            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                await Promise.all(userData.favFits.map(async (fit) => {
                    try {
                        const parsedAccessories = JSON.parse(fit.accessories || '[]');
                        const realFit = {
                            hat: fit.hat,
                            jacket: fit.jacket,
                            top: fit.top,
                            bottom: fit.bottom,
                            shoe: fit.shoe,
                            accessories: parsedAccessories,
                        };
                        fitSet.add(realFit);
                    } catch (error) {
                        console.error('Error parsing accessories:', error);
                    }
                }));
            }));
            setFavFits(Array.from(fitSet));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };    

    const handleRemoveFit = (fit) => {
        setFavFits((prevItems) => prevItems.filter((f) => f.hat !== fit.hat && f.jacket !== fit.jacket && f.top !== fit.top && f.bottom !== fit.bottom && f.accessories !== fit.accessories && f.shoe !== fit.shoe));
        console.log(favFits);
    }

    return (
        <div>
            {favFits.length > 0 ? (
                <div className='favFitsContainer'>
                    {favFits.map((fit) => (
                        <DisplayFit key={fit.id} curFit={fit} removeFit={handleRemoveFit} curUser={true}/>
                    ))}
                </div>
            ) : (
                <>
                    <h2>No favorite outfits...</h2>
                </>
            )}
        </div>
    );
};

export default FavFits;
