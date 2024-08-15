import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs } from "firebase/firestore";

const GetPrefItems = ({ isAuth, setPrefItems, items, prefs }) => {
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                getPrefClothes();
            }
        });    
        return () => unsubscribe();
    }, []);

    const getPrefClothes = async () => {
        try {
            console.log("getting fav clothes");
            if (!auth.currentUser) {
                console.error("User is not loaded");
                return;
            }
            var itemsList = {
                love: [],
                like: [],
                enjoy: [],
                dislike: [],
                hate: []
            }

            var score = 0;
            items.forEach((item) => {
                item.tags.forEach((tag) => {
                    if (prefs.love.includes(tag)) {
                        score += 2;
                    }
                    if (prefs.like.includes(tag)) {
                        score += 1;
                    }
                    if (prefs.enjoy.includes(tag)) {
                        score += 0;
                    }
                    if (prefs.dislike.includes(tag)) {
                        score -= 1;
                    }
                    if (prefs.hate.includes(tag)) {
                        score -= 2;
                    }
                })
                let ratio = 0;
                if (score === 0){
                    ratio = 0.1 / (item.tags.length);
                }else{
                    ratio = score / (item.tags.length);
                }
                if(ratio < -1.2){
                    itemsList.hate.push(item)
                }
                else if(ratio < 0){
                    itemsList.dislike.push(item)
                }
                else if(ratio < 0.8){
                    itemsList.enjoy.push(item)
                }
                else if(ratio < 1.2){
                    itemsList.like.push(item)
                }
                else if(ratio <= 2){
                    itemsList.love.push(item)
                }
            })
                

            console.log(itemsList);

            setPrefItems(itemsList);
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    return null;
};

export default GetPrefItems;
