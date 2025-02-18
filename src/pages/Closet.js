import React, { useState, useEffect } from 'react';
import { setDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth, provider } from "../firebase-config";
import { onAuthStateChanged  } from "firebase/auth";
import ImgUpload from './ImgUpload';
import { useNavigate, useParams } from "react-router-dom";
import GetUserItems from "./GetUserItems";
import GenerateFit from "./GenerateFit";
import DisplayFit from "./DisplayFit";
import GetUserData from "./GetUserData";

function Closet({ isAuth }) {
    const [onMobile, setOnMobile] = useState(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      });
      

    const { profileId: paramProfileId } = useParams();
    const [currentID, setCurrentID] = useState();
    const [logging, setLogging] = useState(localStorage.getItem("logging"));
    const [date, setDate] = useState(localStorage.getItem("date"));
    const [displayFit, setDisplayFit] = useState(false)
    const [userItems, setUserItems] = useState(null);
    const [sortedItems, setSortedItems] = useState(null);
    const [curFit, setCurFit] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null); // State to track hovered item
    const [lockedItems, setLockedItems] = useState(() => {
        if(localStorage.getItem("curFit")){
            let c = JSON.parse(localStorage.getItem("curFit"));
            return c;
        }
        else if(localStorage.getItem("item")){
            let i = JSON.parse(localStorage.getItem("item"));
            return {
                hat: i.type === "Hat" ? i : null,
                jacket: i.type === "Jacket" ? i : null,
                top: i.type === "Top" ? i : null,
                bottom: i.type === "Bottoms" ? i : null,
                shoe: i.type === "Shoes" ? i : null,
                accessories: i.type === "Accessory" ? [i] : [],
            };
        }
        return {
            hat: null,
            jacket: null,
            top: null,
            bottom: null,
            shoe: null,
            accessories: [],
        };
    });

    const clearLocked = () => {
        setLockedItems({
            hat: null,
            jacket: null,
            top: null,
            bottom: null,
            shoe: null,
            accessories: [],
        })
    }

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

    const updateUserItems = (curItems) => {
        setUserItems(curItems);
    }

    const loadCurFit = (newFit) => {
        setCurFit(newFit);
    }

    let navigate = useNavigate();

    useEffect(() => {
        if (!paramProfileId || paramProfileId.length === 28) {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is signed in, set the currentID
                    setCurrentID(paramProfileId || user.uid);

                    // Redirect to the user's profile if no paramProfileId is provided
                    if (!paramProfileId) {
                        navigate("/" + user.uid);
                    }
                } else if (!paramProfileId) {
                    // User is not signed in, redirect to login
                    navigate("/login");
                }
            });

            // Cleanup the observer on component unmount
            return () => unsubscribe();
        } else if (paramProfileId.length > 28) {
            // Handle the case where paramProfileId is a fit code
            if (!isAuth) {
                setDisplayFit(true);
            }
            getFitFromCode(paramProfileId);

            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setCurrentID(user.uid);
                } else if (!paramProfileId) {
                    navigate("/login");
                }
            });

            return () => unsubscribe();
        }
    }, [paramProfileId, isAuth, navigate]);

    const getFitFromCode = async (outfitID) => {
        const outfit = {
            hat: null,
            jacket: null,
            top: null,
            bottom: null,
            shoe: null,
            accessories: [],
        };
            let cats = Object.keys(outfit);
            for(let i = 0; i < 5; i++){
                let curID = outfitID.substr(i * 10, 10);

                if(curID === "0000000000"){
                    curID = "000";
                }
                if(curID === "0000000001"){
                    curID = "001";
                }
                
                const b = query(collection(db, "clothing"), where("id", "==", curID));
                const data = await getDocs(b);
                data.forEach((doc) => {
                    outfit[cats[i]] = doc.data();
                });
        }

        let accs = outfitID.substring(52, outfitID.length - 2);
        console.log("accs", accs);

        for (let i = 0; i < accs.length / 10; i++) {
            let curID = accs.substr(i * 10, 10);

            if (curID === "0000000002") {
                curID = "002";
            }

            const b = query(collection(db, "clothing"), where("id", "==", curID));
            const data = await getDocs(b);
            data.forEach((doc) => {
                outfit.accessories.push(doc.data());
            });
        }
        
        setCurFit(outfit)

    }

    useEffect(() => {
        if (userItems && userItems.length > 0) {
            const sorted = sortUserItems();
            setSortedItems(sorted);
        }
    }, [userItems]);

    const sortUserItems = () => {
        const sorted = {
            hats: [],
            jackets: [],
            tops: [],
            bottoms: [],
            shoes: [],
            accessories: [],
        };

        sorted.hats = userItems.filter(item => item.type === "Hat");
        sorted.jackets = userItems.filter(item => item.type === "Jacket");
        sorted.tops = userItems.filter(item => item.type === "Top");
        sorted.bottoms = userItems.filter(item => item.type === "Bottoms");
        sorted.shoes = userItems.filter(item => item.type === "Shoes");
        sorted.accessories = userItems.filter(item => item.type === "Accessory");

        
        if(sorted.tops.length < 1 || sorted.bottoms.length < 1 || sorted.shoes.length < 1){
            if (isAuth) {
                navigate("/tagitems");
            }
            else {
                navigate("/search");
            }
        }

        return sorted;
    }

    const updateCurFit = (item) => {
        let cur = { ...curFit };
        
        if (!cur.accessories) {
            cur.accessories = [];
        }
    
        switch (item.type) {
            case "Hat":
                cur.hat = item;
                break;
            case "Jacket":
                cur.jacket = item;
                break;
            case "Top":
                cur.top = item;
                break;
            case "Bottoms":
                cur.bottom = item;
                break;
            case "Shoes":
                cur.shoe = item;
                break;
            case "Accessory":
                if (!Array.isArray(cur.accessories)) {
                    cur.accessories = [];
                }
                
                if (cur.accessories.some(acc => acc.id === item.id)) {
                    cur.accessories = cur.accessories.filter(acc => acc.id !== item.id);
                } else {
                    cur.accessories.push(item);
                }
                break;
            default:
                break;
        }
        setCurFit(cur);
    }

    const toggleLockItem = (item) => {
        localStorage.removeItem("curFit");
        localStorage.removeItem("item");
        setLockedItems(prevLockedItems => {
            let updatedLockedItems = { ...prevLockedItems };
            
            switch (item.type) {
                case "Hat":
                    updatedLockedItems.hat = updatedLockedItems.hat ? null : item;
                    break;
                case "Jacket":
                    updatedLockedItems.jacket = updatedLockedItems.jacket ? null : item;
                    break;
                case "Top":
                    updatedLockedItems.top = updatedLockedItems.top ? null : item;
                    break;
                case "Bottoms":
                    updatedLockedItems.bottom = updatedLockedItems.bottom ? null : item;
                    break;
                case "Shoes":
                    updatedLockedItems.shoe = updatedLockedItems.shoe ? null : item;
                    break;
                case "Accessory":
                    if (updatedLockedItems.accessories.some(acc => acc.id === item.id)) {
                        updatedLockedItems.accessories = updatedLockedItems.accessories.filter(acc => acc.id !== item.id);
                    } else {
                        updatedLockedItems.accessories.push(item);
                    }
                    break;
                default:
                    break;
            }

            return updatedLockedItems;
        });
    }

    const getLockIcon = (item) => {
        let isLocked = false;
        
        switch (item.type) {
            case "Hat":
                isLocked = lockedItems.hat && lockedItems.hat.id === item.id;
                break;
            case "Jacket":
                isLocked = lockedItems.jacket && lockedItems.jacket.id === item.id;
                break;
            case "Top":
                isLocked = lockedItems.top && lockedItems.top.id === item.id;
                break;
            case "Bottoms":
                isLocked = lockedItems.bottom && lockedItems.bottom.id === item.id;
                break;
            case "Shoes":
                isLocked = lockedItems.shoe && lockedItems.shoe.id === item.id;
                break;
            case "Accessory":
                isLocked = lockedItems.accessories.some(acc => acc.id === item.id);
                break;
            default:
                break;
        }

        return isLocked ? '🔒' : '🔓'; // You can use actual icons/images instead of these emojis
    }

    // Determine the background style based on whether the item is included in curFit
    const getItemStyle = (item) => {
        try{
            if(curFit !== null){
                if (curFit.hat.id === item.id ||
                    curFit.jacket.id === item.id ||
                    curFit.top.id === item.id ||
                    curFit.bottom.id === item.id ||
                    curFit.shoe.id === item.id ||
                    (Array.isArray(curFit.accessories) && curFit.accessories.some(acc => acc.id === item.id))) {
                    return {
                        backgroundColor: '#333333',
                        transition: 'background-color 0.3s ease',
                        position: 'relative'
                    };
                }
                if (hoveredItem === item.id) {
                    return {
                        backgroundColor: 'rgba(164, 164, 164, 0.5)', // Light gray background on hover
                        transition: 'background-color 0.3s ease'
                    };
                }
                return {backgroundColor: 'var(--color4)'};
            }
        }
        catch(error){
            console.log(error, "item causing error", curFit);
        }
    }

    const renderLockIcon = (item) => {
            if (curFit && (
                curFit.hat?.id === item.id ||
                curFit.jacket?.id === item.id ||
                curFit.top?.id === item.id ||
                curFit.bottom?.id === item.id ||
                curFit.shoe?.id === item.id ||
                (Array.isArray(curFit.accessories) && curFit.accessories.some(acc => acc.id === item.id))
            )) {
                return (
                    <div className="lockIcon" onClick={(e) => { e.stopPropagation(); toggleLockItem(item); }}>
                        {getLockIcon(item)}
                    </div>
                );
            }
        return null;
    }

    const goProfile = async () => {
        if (currentID) {
            navigate(`/profile/${currentID}`)
        }
        else {
            navigate(`/profile/${curFit.top.owner}`)
        }
    }

    return (
        <div>
            {!displayFit && currentID && <GetUserItems setItemList={updateUserItems} id={currentID} />}
            {sortedItems ? (
                <>
                <button onClick={() => { goProfile() }}>View Profile</button>
                <div className='closetContainer'>
                    <div className="leftCloset scroll-container">
                        <div className="articleDisplay scroll-container">
                            {sortedItems.hats.length > 0 ?
                                <>
                                    {sortedItems.hats.map((item) => (
                                        <div
                                            className="itemContainer"
                                            onClick={() => (!lockedItems.hat && updateCurFit(item))}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            key={item.id}
                                        >
                                            <img src={item.imgURL} alt="hat" className='closetItemImg' 
                                            style={getItemStyle(item)}/>
                                            {renderLockIcon(item)}
                                        </div>
                                    ))}
                                </>
                                :
                                <p>no hats</p>
                            }
                        </div>
                        <div className="articleDisplay scroll-container">
                            {sortedItems.tops.length > 0 ?
                                <>
                                    {sortedItems.tops.map((item) => (
                                        <div
                                            className="itemContainer"
                                            onClick={() => (!lockedItems.top && updateCurFit(item))}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            key={item.id}
                                        >
                                            <img src={item.imgURL} alt="top" className='closetItemImg' 
                                            style={getItemStyle(item)}/>
                                            {renderLockIcon(item)}
                                        </div>
                                    ))}
                                </>
                                :
                                <p>no tops</p>
                            }
                        </div>
                        <div className="articleDisplay scroll-container">
                            {sortedItems.accessories.length > 0 ?
                                <>
                                    {sortedItems.accessories.map((item) => {
                                        if(item.id !== "002"){
                                            return(
                                                <div
                                                    className="itemContainer"
                                                    onClick={() => (lockedItems.accessories.length === 0 && updateCurFit(item))}
                                                    onMouseEnter={() => setHoveredItem(item.id)}
                                                    onMouseLeave={() => setHoveredItem(null)}
                                                    key={item.id}
                                                >
                                                    <img src={item.imgURL} alt="accessory" className='closetItemImg' 
                                                    style={getItemStyle(item)} />
                                                    {renderLockIcon(item)}
                                                </div>
                                            )
                                        }
                                    })}
                                </>
                                :
                                <p>no accessories</p>
                            }
                        </div>
                    </div>
                    <div className="midCloset scroll-container">
                        <GenerateFit passFit={curFit} setNewFit={loadCurFit} baseItems={lockedItems} clearLockedItems={clearLocked} id={currentID} date={date} logging={logging}/>
                    </div>
                    <div className="rightCloset scroll-container">
                        <div className="articleDisplay scroll-container">
                            {sortedItems.jackets.length > 0 ?
                                <>
                                    {sortedItems.jackets.map((item) => (
                                        <div
                                            className="itemContainer"
                                            onClick={() => (!lockedItems.jacket && updateCurFit(item))}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            key={item.id}
                                        >
                                            <img src={item.imgURL} alt="jacket" className='closetItemImg' 
                                            style={getItemStyle(item)}/>
                                            {renderLockIcon(item)}
                                        </div>
                                    ))}
                                </>
                                :
                                <p>no jackets</p>
                            }
                        </div>
                        <div className="articleDisplay scroll-container">
                            {sortedItems.bottoms.length > 0 ?
                                <>
                                    {sortedItems.bottoms.map((item) => (
                                        <div
                                            className="itemContainer"
                                            onClick={() => (!lockedItems.bottom && updateCurFit(item))}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            key={item.id}
                                        >
                                            <img src={item.imgURL} alt="bottom" className='closetItemImg' 
                                            style={getItemStyle(item)}/>
                                            {renderLockIcon(item)}
                                        </div>
                                    ))}
                                </>
                                :
                                <p>no bottoms</p>
                            }
                        </div>
                        <div className="articleDisplay scroll-container">
                            {sortedItems.shoes.length > 0 ?
                                <>
                                    {sortedItems.shoes.map((item) => (
                                        <div
                                            className="itemContainer"
                                            onClick={() => (!lockedItems.shoe && updateCurFit(item))}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            key={item.id}
                                        >
                                            <img src={item.imgURL} alt="shoes" className='closetItemImg' 
                                            style={getItemStyle(item)}/>
                                            {renderLockIcon(item)}
                                        </div>
                                    ))}
                                </>
                                :
                                <p>no shoes</p>
                            }
                        </div>
                    </div>
                    </div>
                </>
            ) : (
                <>
                        {(displayFit && curFit) ?
                            <>
                                <button onClick={() => { goProfile() }}>View Profile</button>
                                <DisplayFit curFit={curFit} />
                            </>
                            :
                            <p>Loading...</p>

                    }
                 </>
            )}
        </div>
    );    
}

export default Closet;