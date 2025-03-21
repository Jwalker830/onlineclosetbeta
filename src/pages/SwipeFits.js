import React, { useState, useEffect } from 'react';
import GetUserItems from './GetUserItems';
import GetUserPrefs from './GetUserPrefs';
import { updateDoc, doc } from 'firebase/firestore';
import { db, auth } from "../firebase-config";
import DisplayFit from './DisplayFit';

const SwipeFits = ({ isAuth }) => {
    const [displayedItems, setDisplayedItems] = useState([]);
    const [curFit, setCurFit] = useState(null);
    const [sorted, setSorted] = useState({
        hatList: [],
        jacketList: [],
        topList: [],
        bottomList: [],
        shoeList: [],
        accessoryList: [],
    });
    const [fitTags, setFitTags] = useState([]);
    const [combos, setCombos] = useState([]);
    const [comboPrefs, setComboPrefs] = useState({});
    const [slideDirection, setSlideDirection] = useState(null);
    const [onMobile, setOnMobile] = useState(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      });
      
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // Fetch items on user authentication
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (displayedItems.length > 0) {
            const sortedItems = sortItemList(displayedItems);
            setSorted(sortedItems); // Update sorted state
            pickOutfit(sortedItems);
        }
    }, [displayedItems]);

    useEffect(() => {
        if(onMobile){
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
        }
        else{
            document.body.style.overflow = '';
            document.body.style.position = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
        }
    }, [onMobile])

    const updateCombos = (newCombos) => {
        const newCombosList = {
            love: [],
            like: [],
            enjoy: [],
            dislike: [],
            hate: []
        };
    
        newCombos.forEach((combo) => {
            const { love, like, enjoy, dislike, hate } = comboPrefs;
    
            // Filter out the current combo from the existing preferences
            const filteredLove = love.filter(c => !(c[0] === combo[0] && c[1] === combo[1]));
            const filteredLike = like.filter(c => !(c[0] === combo[0] && c[1] === combo[1]));
            const filteredEnjoy = enjoy.filter(c => !(c[0] === combo[0] && c[1] === combo[1]));
            const filteredDislike = dislike.filter(c => !(c[0] === combo[0] && c[1] === combo[1]));
            const filteredHate = hate.filter(c => !(c[0] === combo[0] && c[1] === combo[1]));
    
            let ratio;
            if (combo[2] === 0) {
                ratio = 0.1 / combo[3];
            } else {
                ratio = combo[2] / combo[3];
            }
    
            if (ratio < -1) {
                newCombosList.hate.push(combo);
            } else if (ratio < 0) {
                newCombosList.dislike.push(combo);
            } else if (ratio < 0.8) {
                newCombosList.enjoy.push(combo);
            } else if (ratio < 1.8) {
                newCombosList.like.push(combo);
            } else if (ratio <= 2) {
                newCombosList.love.push(combo);
            }
    
            // Re-assign the filtered lists to comboPrefs
            comboPrefs.love = filteredLove;
            comboPrefs.like = filteredLike;
            comboPrefs.enjoy = filteredEnjoy;
            comboPrefs.dislike = filteredDislike;
            comboPrefs.hate = filteredHate;
        });
    
        const updatedComboPrefs = {
            love: [...comboPrefs.love, ...newCombosList.love],
            like: [...comboPrefs.like, ...newCombosList.like],
            enjoy: [...comboPrefs.enjoy, ...newCombosList.enjoy],
            dislike: [...comboPrefs.dislike, ...newCombosList.dislike],
            hate: [...comboPrefs.hate, ...newCombosList.hate],
        };

        console.log(updatedComboPrefs);
    
        updateComboPrefs(updatedComboPrefs);
    };

    const updateComboPrefs = async (updatedComboPrefs) => {
        setComboPrefs(updatedComboPrefs);
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                combos: JSON.stringify(updatedComboPrefs)
            });
        } catch (error) {
            console.error("Error updating combo preferences:", error);
        }
    };

    const scoreTags = (amt) => {
        const newCombos = combos.map(combo => [...combo]);

        // Iterate through each attribute (property) of fitTags
        for(let i = 0; i < fitTags.length; i++){
            for(let j = i; j < fitTags.length; j++){
                if(fitTags[i] !== fitTags[j]){
                    const index = newCombos.findIndex(item => item[0] === fitTags[i] && item[1] === fitTags[j]);
                        if (index !== -1) {
                            newCombos[index][2] += amt;
                            newCombos[index][3]++;
                            console.log(newCombos[index]);
                        }
                }
            }
        }

        // Update combos state with the newCombos array
        setCombos(newCombos);

        // Call updateCombos to update comboPrefs
        updateCombos(newCombos);
        setTimeout(() => {
            pickOutfit(sorted);
            setSlideDirection(null);
        }, 300)
    };

    useEffect(() => {
        let direction = "";
        const handleKeyDown = (event) => {
            switch (event.key) {
                case 'ArrowUp':
                    direction = "up";
                    scoreTags(1);
                    break;
                case 'ArrowDown':
                    direction = "down";
                    scoreTags(-1);
                    break;
                case 'ArrowLeft':
                    direction = "left";
                    scoreTags(-2);
                    break;
                case 'ArrowRight':
                    direction = "right";
                    scoreTags(2);
                    break;
                default:
                    direction = null;;
                    break;
            }
            
            setSlideDirection(direction);
        };
        
        const handleTouchStart = (event) => {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        };

        const handleTouchEnd = (event) => {
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            if(diffX === 0 || diffY === 0){
                return
            }

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) {
                    direction = "right";
                    scoreTags(2);
                } else {
                    direction = "left";
                    scoreTags(-2);
                }
            } else {
                if (diffY > 0) {
                    direction = "down";
                    scoreTags(-1);
                } else {
                    direction = "up";
                    scoreTags(1);
                }
            }

            setSlideDirection(direction);
        };

        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [scoreTags]); // Ensure scoreTags is included as a dependency if it's defined in this scope

    const updateItemList = (newItemList) => {
        setDisplayedItems(newItemList);
    };

    const sortItemList = (items) => {
        const sortedItems = {
            hatList: [],
            jacketList: [],
            topList: [],
            bottomList: [],
            shoeList: [],
            accessoryList: [],
        };

        items.forEach(item => {
            switch (item.type) {
                case "Hat":
                    sortedItems.hatList.push(item);
                    break;
                case "Jacket":
                    sortedItems.jacketList.push(item);
                    break;
                case "Top":
                    sortedItems.topList.push(item);
                    break;
                case "Bottoms":
                    sortedItems.bottomList.push(item);
                    break;
                case "Shoes":
                    sortedItems.shoeList.push(item);
                    break;
                case "Accessory":
                    sortedItems.accessoryList.push(item);
                    break;
                default:
                    break;
            }
        });

        let comboSet = new Set();

        // Convert existing combos to JSON strings and add to comboSet
        const addCombosToSet = (combos) => {
            combos.forEach(combo => {
                comboSet.add(JSON.stringify(combo));
            });
        };

        addCombosToSet(comboPrefs.love);
        addCombosToSet(comboPrefs.like);
        addCombosToSet(comboPrefs.enjoy);
        addCombosToSet(comboPrefs.dislike);
        addCombosToSet(comboPrefs.hate);

        console.log(comboSet);

        for(let i = 0; i < items.length; i++){
            for(let j = i; j < items.length; j++){
                for(let a = 0; a < items[i].tags.length; a++){
                    for(let b = 0; b < items[j].tags.length; b++){
                        if (items[i] !== items[j] && items[i].tags[a] !== items[j].tags[b]) {
                            const combo = JSON.stringify([items[i].tags[a], items[j].tags[b]]);
                            const comboRev = JSON.stringify([items[j].tags[b], [items[i].tags[a]]]);
                            if (!comboSet.has(combo) && !comboSet.has(comboRev)){
                                comboSet.add(combo);
                            }
                        }
                    }
                }
            }
        }

        setCombos(
            Array.from(comboSet).map(combo => {
                let parsedCombo = JSON.parse(combo);
                if (parsedCombo.length < 3) {
                    return parsedCombo.concat([0, 0]);
                } else {
                    return parsedCombo.slice(0, 4);
                }
            })
        );

        return sortedItems;
    };

    const pickOutfit = (sortedItems) => {
        const getRandomItems = (array, amt) => {
            if (array.length === 0) return null;
            let returnItems = new Set();
            if (amt === 0) {
                const item002 = array.filter(item => item.id === "002");
                if (item002.length > 0) {
                    returnItems.add(item002[0]);
                }
                return Array.from(returnItems);
            }
            if (amt === 1) {
                return array[Math.floor(Math.random() * array.length)];
            }
            while (returnItems.size < amt) {
                returnItems.add(array[Math.floor(Math.random() * array.length)]);
            }
            return Array.from(returnItems);
        };
    
        const outfit = {
            hat: getRandomItems(sortedItems.hatList, 1),
            jacket: getRandomItems(sortedItems.jacketList, 1),
            top: getRandomItems(sortedItems.topList, 1),
            bottom: getRandomItems(sortedItems.bottomList, 1),
            shoe: getRandomItems(sortedItems.shoeList, 1),
            accessories: getRandomItems(sortedItems.accessoryList, Math.floor(Math.random() * 3)) || [] // Ensure it's an array
        };
    
        let accessoryTags = new Set();
    
        console.log(outfit.accessories); // Debugging output
    
        if (Array.isArray(outfit.accessories)) {
            outfit.accessories.forEach(accessory => {
                if (accessory && accessory.tags) {
                    if (Array.isArray(accessory.tags)) {
                        accessory.tags.forEach(tag => {
                            accessoryTags.add(tag);
                        });
                    } 
                    else if (typeof accessory.tags === 'object') {
                        Object.keys(accessory.tags).forEach(tag => {
                            accessoryTags.add(tag);
                        });
                    }
                }
            });
        } else {
            // Handle case where 'outfit.accessories' is not an array
            console.warn("Expected 'outfit.accessories' to be an array but got:", typeof outfit.accessories);
            if (outfit.accessories && typeof outfit.accessories === 'object' && outfit.accessories.tags) {
                Object.keys(outfit.accessories.tags).forEach(tag => {
                    accessoryTags.add(tag);
                });
            }
        }
    
        let fitTagsList = [
            ...(outfit.hat ? outfit.hat.tags : []), 
            ...(outfit.jacket ? outfit.jacket.tags : []), 
            ...(outfit.top ? outfit.top.tags : []), 
            ...(outfit.bottom ? outfit.bottom.tags : []), 
            ...(outfit.shoe ? outfit.shoe.tags : []), 
            ...(Array.from(accessoryTags))
        ];
    
        setFitTags(fitTagsList);
        setCurFit(outfit);
    };    

    const updateComboList = (newPrefsObj) => {
        console.log(newPrefsObj);
        setComboPrefs(newPrefsObj);
    };

    const handleRemoveFit = (fit) => {

    }

    return (
        <div>
            <GetUserItems setItemList={updateItemList} id={auth.currentUser.uid}/>
            <GetUserPrefs setPrefs={updateComboList} id={auth.currentUser.uid}/>
            <div className='swipeFitContainer' style={{
                    transition: 'transform 0.3s ease-in-out',
                    transform: slideDirection ? 
                        (slideDirection === 'left' ? 'translateX(-100vw)' :
                        slideDirection === 'right' ? 'translateX(100vw)' :
                        slideDirection === 'up' ? 'translateY(-100vh)' :
                        'translateY(100vh)'
                        ) : 'translate(0, 0)'
                }}>
                {curFit &&
                    <>
                        <DisplayFit fit={curFit} removeFit={handleRemoveFit} width={"150px"} curUser={true}/>
                    </>
                }
            </div>
        </div>
    );
};

export default SwipeFits;
