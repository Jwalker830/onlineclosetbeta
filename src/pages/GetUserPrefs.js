import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs, doc, getDoc } from "firebase/firestore";

const GetUserPrefs = ({ isAuth, setPrefs, id }) => {
    useEffect(() => {
        if (id) {
            getPrefs();
        }
    }, [id]);

    const getPrefs = async () => {
        try {
            let combos = "";
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
    
            if (docSnap.exists()) {
                const data = docSnap.data();
                combos = JSON.parse(data.combos);
                console.log('Combos retrieved and parsed successfully:', combos);
            } else {
                console.log('No such document!');
            }
            setPrefs(combos);
        } catch (error) {
            console.error('Error retrieving combos:', error);
        }
    };

    return null;
};

export default GetUserPrefs;
