import React, { useState, useEffect } from 'react';
import { setDoc, doc, query, collection, where, getDocs, getDoc, documentId } from "firebase/firestore";
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
    const [hoveredItem, setHoveredItem] = useState(null);
    const [selectedCloset, setSelectedCloset] = useState("");
    const [subClosets, setSubClosets] = useState([]);
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
        if (paramProfileId) {
             if (paramProfileId.length === 28) {                  // user profile
                 setCurrentID(paramProfileId);
                 getClosetFromCode(paramProfileId);
             } else if (paramProfileId.length === 8) {            // closet code
                 setSelectedCloset(paramProfileId);
                 getClosetFromCode(paramProfileId);
             } else {                                             // outfit code
                 if (!isAuth) {
                     setDisplayFit(true);
                 }
                 getFitFromCode(paramProfileId);
             }
        } else {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setCurrentID(user.uid);
                    navigate("/" + user.uid);
                } else {
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

        setCurrentID(outfit.top.owner);
        
        setCurFit(outfit)

    }

    useEffect(() => {
        if (userItems && userItems.length > 0) {
            const sorted = sortUserItems();
            setSortedItems(sorted);
        }
    }, [userItems]);

    useEffect(() => {
        if (!currentID) return;

        // read once; if you want live updates use onSnapshot instead
        getDoc(doc(db, "users", currentID)).then(snap => {
            if (snap.exists()) {
                setSubClosets(snap.data().subclosets || []);
            } else {
                setSubClosets([]);            // no document yet → empty array
            }
        });
    }, [currentID]);

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

    const fetchClothes = async ids => {
        const unique = [...new Set(ids)];      // no duplicates
        const chunks = [];
        while (unique.length) chunks.push(unique.splice(0, 10)); // 10 ids / chunk

        const promises = chunks.map(chunk => {
            const q = query(collection(db, "clothing"),
                where(documentId(), "in", chunk));

            return getDocs(q);
        });

        const snaps = await Promise.all(promises);   // ❷  1–15 requests TOTAL
        const result = [];
        snaps.forEach(snap =>
            snap.forEach(doc => result.push({ id: doc.id, ...doc.data() }))
        );
        return result;
    };

   // ---------- turn an 8-char closet code into userItems -------------
    const getClosetFromCode = async closetId => {

        let ids = [];

        if (paramProfileId.length === 28) {
            const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (!snap.exists()) { console.warn("No such closet"); return; }

            snap.data().items.forEach((item) => {
                ids.push(item.id);
            });
        }
        else if(paramProfileId.length === 8){
            const snap = await getDoc(doc(db, "closets", closetId));
            if (!snap.exists()) { console.warn("No such closet"); return; }

            const monster = snap.data().items ?? "";   // big concatenated string

            // 1️⃣  ensure the three placeholder ids are present
            ["000", "001", "002"].forEach(id => {
                if (!ids.includes(id)) ids.push(id);
            });

            // pull the 10-character ids out of the monster string
            for (let i = 0; i < monster.length; i += 10) {
                ids.push(monster.substr(i, 10));
            }

        }

        console.log(ids);

        const clothes = await fetchClothes(ids);   // ⇦ batched version
        setUserItems(clothes);
    };

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
            {sortedItems ? (
                <>
                <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                     <button onClick={goProfile}>View Profile</button>
 
                     {/* -------- Garments dropdown -------- */}
                        <select
                            value={selectedCloset}
                            onChange={e => {
                                const val = e.target.value;
                                setSelectedCloset(val);
                                if (!val) {
                                    navigate("/" + currentID);         // default full closet
                                } else {
                                    navigate("/" + val);               // 8-char code → useEffect loads it
                                }
                            }}>
                            <option value="">Default garments</option>
                            {subClosets.map(code => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
 
                     {/* -------- Style dropdown (empty for now) -------- */}
                     <select disabled>
                        <option>Style</option>
                     </select>
                 </div>
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
                            <GenerateFit userItems={userItems} passFit={curFit} setNewFit={loadCurFit} baseItems={lockedItems} clearLockedItems={clearLocked} id={currentID} date={date} logging={logging}/>
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
                                <div style={{ width: "200px", margin: "auto" }} >
                                    <DisplayFit fit={curFit} />
                                </div>
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