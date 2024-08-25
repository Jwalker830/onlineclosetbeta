import React, { useState, useEffect } from 'react';
import { setDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth, provider} from "../firebase-config";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import GetUserItems from "./GetUserItems";
import GetPrefItems from './GetPrefItems';
import GetUserPrefs from './GetUserPrefs';
import DisplayFit from "./DisplayFit";

function GenerateFit({ isAuth, passFit, setNewFit, baseItems, clearLockedItems, id }) {
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
    const [curFit, setCurFit] = useState(() => {
        if(passFit){
            return passFit;
        }
        else{
            return null;
        }
    });
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
        if(auth.currentUser){
            setIsCurUser(id === auth.currentUser.uid);
        }
        else {
            setIsCurUser(false);
        }
    }, [id])

    const updateItemList = (newItemList) => {
        setDisplayedItems(newItemList);
    };

    const updatePrefsList = (newPrefsObj) => {
        setUserPrefs(newPrefsObj);
    };

    const updatePrefItems = (prefItemObj) => {
        setPrefItems(prefItemObj);
    };

    useEffect(() => {
        setCurFit(passFit);
    }, [passFit]);

    useEffect(() => {
        console.log(id);
        if (displayedItems.length > 0) {
            setLoading(false);
            console.log(displayedItems);
            randomizeFit();
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
    
        let curPrefs = [...userPrefs.love];
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
                if (combo[0] === tag && !curTags.has(combo[1])) {
                    dislikeTags.add(combo[1]);
                }
                if (combo[1] === tag && !curTags.has(combo[0])) {
                    dislikeTags.add(combo[0]);
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
                if(curTags.has(tag)){
                    score++;
                }
                else if(dislikeTags.has(tag)){
                    score -= 2;
                }
                else {
                    score--;
                }
            });
            if ((score / item.tags.length) > (genPrompt === null ? 0.5 : 0.2)) {
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
                        (sortedItems.bottoms && sortedItems.bottoms.length > 0 && getRandomItems(sortedItems.bottoms, 1)[0]) || 
                        (displayedItems.filter(item => item.type === "Bottoms")[0] || null);
    
        outfit.shoe = baseItems.shoe || 
                      (baseItemsList.length > 0 && baseItemsList[0].type === "Shoe" && baseItemsList[0]) || 
                      (sortedItems.shoes && sortedItems.shoes.length > 0 && getRandomItems(sortedItems.shoes, 1)[0]) || 
                      (displayedItems.filter(item => item.type === "Shoes")[0] || null);
    
        outfit.accessories = baseItems.accessories.length > 0 ? baseItems.accessories : 
                            (sortedItems.accessories && sortedItems.accessories.length > 0 ? getRandomItems(sortedItems.accessories, Math.floor(Math.random() * sortedItems.accessories.length)) : 
                            [(displayedItems.filter(item => item.title === "No Accessory")[0])]);
    
        console.log(outfit);
    
        setNewFit(outfit);
        setCurFit(outfit);
    };
    
    
    

    const removeFit = () => {
        console.log("removed");
    }
    

    let navigate = useNavigate();

    return (
        <div  className='randFitContainer'>
            {loading ? (
                <>
                    <p>Loading...</p>
                    <GetUserItems setItemList={updateItemList} id={id}/>
                    <GetUserPrefs setPrefs={updatePrefsList}/>
                </>
            ) : (
                <>
                    <GetPrefItems setPrefItems={updatePrefItems} items={displayedItems} prefs={userPrefs}/>
                    {curFit !== null &&
                        <div className='generatorContainer'>
                            <div className='fitTagInput'>
                                <button onClick={randomizeFit} className='newFitButton'>New Outfit</button>
                                <input placeholder='tag...' onChange={(e) => updatePrompt(e.target.value)}></input>
                            </div>
                            <DisplayFit curFit={curFit} removeFit={removeFit} curUser={isCurUser}/>
                        </div>
                    }
                </>
            )}
        </div>
    )
}

export default GenerateFit;
