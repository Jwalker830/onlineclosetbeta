import React, { useEffect } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs } from "firebase/firestore";

const GetUserItems = ({ setItemList, id }) => {

    useEffect(() => {
        if (id) {
            console.log(id);
            getItems();
        }
    }, [id]);

    const getItems = async () => {
        try {
            console.log("getting items");

            const q = query(collection(db, "users"), where("id", "==", id));
            const querySnapshot = await getDocs(q);
            const itemsSet = new Set();

            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                await Promise.all(userData.items.map(async (item) => {
                    const b = query(collection(db, "clothing"), where("id", "==", item.id));
                    const data = await getDocs(b);
                    data.forEach((doc) => {
                        itemsSet.add(doc.data());
                    });
                }));
            }));

            setItemList(Array.from(itemsSet));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    return null;
};

export default GetUserItems;
