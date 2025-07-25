import React, { useState, useEffect } from 'react';
import { setDoc, doc, query, collection, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth, provider} from "../firebase-config";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import GetUserItems from "./GetUserItems";
import GetPrefItems from './GetPrefItems';
import GetUserPrefs from './GetUserPrefs';
import DisplayFit from "./DisplayFit";
import { updateStatsLogic } from './UpdateStats';
import moment from 'moment';

function GenerateFit({ isAuth, userItems, passFit, setNewFit, baseItems, clearLockedItems, id, logging, date }) {
    const tcom = require('thesaurus-com');
    const [isCurUser, setIsCurUser] = useState()
    const [prefItems, setPrefItems] = useState({
        love: [],
        like: [],
        enjoy: [],
        dislike: [],
        hate: []
    });
    const [userPrefs, setUserPrefs] = useState({
        love: [],
        like: [],
        enjoy: [],
        dislike: [],
        hate: []
    });
    const [sortedPrefs, setSortedPrefs] = useState({
        hats: [],
        jackets: [],
        tops: [],
        bottoms: [],
        shoes: [],
        accessories: [],
    });
    const [curFit, setCurFit] = useState();
    const [genPrompt, setGenPrompt] = useState(null);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state

    const updatePrompt = (prompt) => {
        if(prompt === ""){
            setGenPrompt(null)
            return
        }
        prompt = prompt.trim();
        const itemsArray = prompt.split(',').map(item => item.trim());
        setGenPrompt(itemsArray);
        return
    }

    useEffect(() => {
        if (userItems) {
            setDisplayedItems(userItems);
        }
    })

    useEffect(() => {
        if(auth.currentUser){
            setIsCurUser(id === auth.currentUser.uid);
            localStorage.removeItem("date")
            localStorage.removeItem("logging")
        }
        else {
            setIsCurUser(false);
        }
    }, [id])

    const updatePrefsList = (newPrefsObj) => {
        setUserPrefs(newPrefsObj);
    };

    const updatePrefItems = (prefItemObj) => {
        setPrefItems(prefItemObj);
    };

    useEffect(() => {
        console.log("passed fit: ", passFit)
        setCurFit(passFit);
    }, [passFit]);

    useEffect(() => {
        console.log(id);
        if (displayedItems.length > 0) {
            setLoading(false);
            console.log(displayedItems);
            if (passFit == null) {
                randomizeFit();
            }
        }
    }, [displayedItems]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {

            }
        });
        return () => unsubscribe();
    }, []);

    const sortPrefItems = (items) => {
        const sorted = {
            hats: [],
            jackets: [],
            tops: [],
            bottoms: [],
            shoes: [],
            accessories: [],
        };
    
        sorted.hats = [...(items.filter(item => item.type === "Hat"))];
        sorted.jackets = [...(items.filter(item => item.type === "Jacket"))];
        sorted.tops = [...(items.filter(item => item.type === "Top"))];
        sorted.bottoms = [...(items.filter(item => item.type === "Bottoms"))];
        sorted.shoes = [...(items.filter(item => item.type === "Shoes"))];
        sorted.accessories = [...(items.filter(item => item.type === "Accessory"))];

        return(sorted);
    }
    

    const randomizeFit = () => {
        const getRandomItems = (array, amt) => {
            if (!array || array.length === 0) return null;
            let returnItems = new Set();
    
            if (amt === 0) {
                const item002 = array.find(item => item.id === "002");
                if (item002) {
                    returnItems.add(item002);
                }
                return Array.from(returnItems);
            }
    
            while (returnItems.size < amt) {
                returnItems.add(array[Math.floor(Math.random() * array.length)]);
            }
    
            return Array.from(returnItems);
        };
    
        const outfit = {
            hat: null,
            jacket: null,
            top: null,
            bottom: null,
            shoe: null,
            accessories: [],
        };
    
        let baseItemsList = [];
    
        Object.keys(baseItems).forEach(key => {
            if(key !== "accessories"){
                if(baseItems[key] !== null){
                    baseItemsList.push(baseItems[key]);
                }
            } else {
                if(baseItems.accessories.length > 0){
                    for(let acc of baseItems.accessories)
                        baseItemsList.push(acc);
                }
            }
        });
    
        if(localStorage.getItem("curFit")){
            localStorage.removeItem("curFit");
            clearLockedItems();
        }
        
        if(localStorage.getItem("item")){
            localStorage.removeItem("item");
        }
    
        console.log(genPrompt);
    
        if(genPrompt === null){
            while (baseItemsList.length < 1) {
                let randInd = Math.floor(Math.random() * displayedItems.length);
                while(displayedItems[randInd].id === "000" || displayedItems[randInd].id === "001" || displayedItems[randInd].id === "002"){
                    randInd = Math.floor(Math.random() * displayedItems.length);
                }
                baseItemsList.push(displayedItems[randInd]);
            }
        }
    
        baseItemsList = baseItemsList.filter(item => item !== null);
        console.log(baseItemsList);
    
        let curTags = new Set();
        if(baseItemsList.length > 0){
            baseItemsList.forEach(item => {
                if(item.tags){
                    item.tags.forEach(tag => {
                        curTags.add(tag);
                    });
                }
            });
        }
    
        if(genPrompt !== null){
            curTags = new Set([...curTags, ...genPrompt]);
        }
    
        let dislikeTags = new Set();
    
        let curPrefs = [...userPrefs.love, ...userPrefs.like];
        let curHates = [...userPrefs.hate, ...userPrefs.dislike];
        console.log(curPrefs);
        console.log(curHates);
    
        let curItems = [];
    
        if(genPrompt !== null){
            displayedItems.forEach((item) => {
                if(item.tags.some(tag => genPrompt.includes(tag))){
                    curItems.push(item);
                    item.tags.forEach((tag) => {
                        curTags.add(tag);
                    });
                }
            });
            console.log(sortPrefItems(curItems));
        }
    
        if(genPrompt === null){
            curTags.forEach(tag => {
                curPrefs.forEach(combo => {
                    if (combo[0] === tag) {
                        curTags.add(combo[1]);
                    }
                    if (combo[1] === tag) {
                        curTags.add(combo[0]);
                    }
                });
            });
        }
    
        curTags.forEach(tag => {
            curHates.forEach(combo => {
                if (combo[0] === tag) {
                    dislikeTags.add(combo[1]);
                    curTags.delete(combo[1]);
                }
                if (combo[1] === tag) {
                    dislikeTags.add(combo[0]);
                    curTags.delete(combo[0]);
                }
            });
        });

        
    
        console.log(curTags);
        console.log(dislikeTags);
    
        displayedItems.forEach(item => {
            let score = 0;
            item.tags.forEach(tag => {
                if(genPrompt && genPrompt.includes(tag)){
                    curItems.push(item);
                }
                if(dislikeTags.has(tag)){
                    score -= 2;
                }
                else if(curTags.has(tag)){
                    score += 5;
                }
                else {
                    score--;
                }
            });
            if ((score / item.tags.length) > (genPrompt === null ? 0.3 : 0)) {
                console.log(score / item.tags.length, item.title);
                curItems.push(item);
            }
        });
    
        let sortedItems = sortPrefItems(curItems);
        console.log(sortedItems);
    
        outfit.hat = baseItems.hat || 
                     (baseItemsList.length > 0 && baseItemsList[0].type === "Hat" && baseItemsList[0]) || 
                     (sortedItems.hats && sortedItems.hats.length > 0 && getRandomItems(sortedItems.hats, 1)[0]) || 
                     (displayedItems.filter(item => item.title === "No Hat")[0] || null);
    
        outfit.jacket = baseItems.jacket || 
                        (baseItemsList.length > 0 && baseItemsList[0].type === "Jacket" && baseItemsList[0]) || 
                        (sortedItems.jackets && sortedItems.jackets.length > 0 && getRandomItems(sortedItems.jackets, 1)[0]) || 
                        (displayedItems.filter(item => item.title === "No Jacket")[0] || null);
    
        outfit.top = baseItems.top || 
                     (baseItemsList.length > 0 && baseItemsList[0].type === "Top" && baseItemsList[0]) || 
                     (sortedItems.tops && sortedItems.tops.length > 0 && getRandomItems(sortedItems.tops, 1)[0]) || 
                     (displayedItems.filter(item => item.type === "Top")[0] || null);
    
        outfit.bottom = baseItems.bottom || 
                        (baseItemsList.length > 0 && baseItemsList[0].type === "Bottoms" && baseItemsList[0]) || 
                        ((sortedItems.bottoms && sortedItems.bottoms.length > 0) && getRandomItems(sortedItems.bottoms, 1)[0]) || 
                        (displayedItems.filter(item => item.type === "Bottoms")[0] || null);
    
        outfit.shoe = baseItems.shoe || 
                      (baseItemsList.length > 0 && baseItemsList[0].type === "Shoe" && baseItemsList[0]) || 
                      (sortedItems.shoes && sortedItems.shoes.length > 0 && getRandomItems(sortedItems.shoes, 1)[0]) || 
                      (displayedItems.filter(item => item.type === "Shoes")[0] || null);
    
        outfit.accessories = baseItems.accessories.length > 0 ? baseItems.accessories : 
                            (sortedItems.accessories && sortedItems.accessories.length > 0 ? getRandomItems(sortedItems.accessories, Math.floor(Math.random() * 3)) : 
                            [(displayedItems.filter(item => item.title === "No Accessory")[0])]);
    
        console.log(outfit);
    
        setNewFit(outfit);
        setCurFit(outfit);
    };
    
    
    

    const removeFit = () => {
        console.log("removed");
    }

    const genCode = (len) => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let output = '';
        for (let i = 0; i < len; ++i) {
            output += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return output;
    };

    let navigate = useNavigate();

    const handleLogging = async () => {
        try {
            localStorage.setItem("logFor", date);
            localStorage.setItem("curFit", JSON.stringify(curFit));
            console.log(localStorage.getItem("curFit"));
            let codeHandle = genCode(17);
            localStorage.setItem("logId", codeHandle);

            const stats = await updateStatsLogic(id);
            console.log("Updated Stats:", stats);
            navigate("/createlog");
        } catch (error) {
            console.error('Error updating fit log:', error);
        }
    }

    return (
        <div  className='randFitContainer'>
            {loading ? (
                <>
                    <p>Loading...</p>
                    <GetUserPrefs setPrefs={updatePrefsList} id={id}/>
                </>
            ) : (
                <>
                    <GetPrefItems setPrefItems={updatePrefItems} items={displayedItems} prefs={userPrefs}/>
                    {curFit !== null &&
                        <div className='generatorContainer'>
                            {logging ?
                            <button onClick={handleLogging}>Log Outfit</button>
                            :
                            <div className='fitTagInput'>
                                <button onClick={randomizeFit} className='newFitButton'>New Outfit</button>
                                <input placeholder='tag...' onChange={(e) => updatePrompt(e.target.value)}></input>
                            </div>
                            }
                            <DisplayFit fit={curFit} removeFit={removeFit} curUser={isCurUser}/>
                        </div>
                    }
                </>
            )}
        </div>
    )
}

export default GenerateFit;
