import React, { useEffect } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs } from "firebase/firestore";

const GetUserData = ({ setProfile, id }) => {

    useEffect(() => {
        if (id) {
            console.log(id);
            getItems();
        }
    }, [id]);

    const getItems = async () => {
        try {
            console.log("getting data");

            const q = query(collection(db, "users"), where("id", "==", id));
            const querySnapshot = await getDocs(q);
            let userData = "";

            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                userData = userDoc.data();
            }));

            setProfile(userData);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    return null;
};

export default GetUserData;
