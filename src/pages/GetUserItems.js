import React, { useEffect, useRef } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs, updateDoc, doc } from "firebase/firestore";

const GetUserItems = ({ setItemList, id }) => {
    const hasRunOnce = useRef(false);

    useEffect(() => {
        if (id && !hasRunOnce.current) {
            console.log("[GetUserItems] id prop received:", id);
            getItems();
            hasRunOnce.current = true;
        } else if (!id) {
            console.warn("[GetUserItems] No id prop received!");
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

            // Collect all unique tags from items
            const allTags = new Set();
            Array.from(itemsSet).forEach(item => {
                if (item.tags && Array.isArray(item.tags)) {
                    item.tags.forEach(tag => allTags.add(tag));
                }
            });

            // Update the user's itemTags array
            await updateDoc(doc(db, "users", id), { itemTags: Array.from(allTags) });
            console.log("Updated itemTags for user:", Array.from(allTags));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    return null;
};

export default GetUserItems;
