import React, { useState, useEffect } from 'react';
import { arrayUnion, arrayRemove, updateDoc, doc, query, collection, where, getDocs, deleteDoc } from "firebase/firestore";
import { db, auth, provider} from "../firebase-config";
import { getStorage, ref, deleteObject } from "firebase/storage";


const ItemDisplay = ({ isAuth, items, setCurItem, removeItem, isOnMobile }) => {
    const [sortedItems, setSortedItems] = useState({
        hats: [],
        jackets: [],
        tops: [],
        bottoms: [],
        shoes: [],
        accessories: [],
        other: [],
    });
    const [isSorted, setIsSorted] = useState(false);
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const storage = getStorage();


    useEffect(() => {
        if (items.length > 0) {
            const s = sortPrefItems(items);
            setSortedItems(s);
            setIsSorted(true); // Set isSorted to true when items are sorted
        }
    }, [items]); // Trigger effect when items change

    const sortPrefItems = (items) => {
        const sorted = {
            hats: [],
            jackets: [],
            tops: [],
            bottoms: [],
            shoes: [],
            accessories: [],
            other: [],
        };

        sorted.hats = items.filter(item => item.type === "Hat" && item.title !== "No Hat");
        sorted.jackets = items.filter(item => item.type === "Jacket" && item.title !== "No Jacket");
        sorted.tops = items.filter(item => item.type === "Top");
        sorted.bottoms = items.filter(item => item.type === "Bottoms");
        sorted.shoes = items.filter(item => item.type === "Shoes");
        sorted.accessories = items.filter(item => item.type === "Accessory" && item.title !== "No Accessory");
        sorted.other = items.filter(item => item.type === "");
        console.log(items);

        return sorted;
    };

    const handleMouseEnter = (id) => {
        setHoveredItemId(id);
    };

    const handleMouseLeave = () => {
        setHoveredItemId(null);
    };

    const handleRemoveItem = async (item) => {
        try {
            const imageRef = ref(storage, item.id);
            deleteObject(imageRef).then(() => {
                console.log("deleted")
              }).catch((error) => {
                console.log(error)
              });
              
            console.log("removing item");
            if (!auth.currentUser) {
                console.error("User is not loaded");
                return;
            }
    
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                favFits: arrayRemove(item.id)
            });

            removeItem(item);

            await deleteDoc(doc(db, "clothing", item.id));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    }

    const renderItems = (items, title) => (
        <div className='typeContainer'>
            <div className='typeTitle'>{title}</div>
            <div className={`${title.toLowerCase()}Display`} style={{display: "flex", flexWrap: "wrap"}}>
                {items.map((item) => (
                    <div
                        key={item.id}
                        onMouseEnter={() => handleMouseEnter(item.id)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                            height: isOnMobile ? "120px" : "250px",
                            width: "auto",
                            backgroundColor: hoveredItemId === item.id ? 'rgba(88, 88, 88, 0.5)' : 'transparent',
                            padding: '10px',
                            transition: 'background-color 0.3s ease',
                        }}
                    >
                        <h1 onClick={() => {handleRemoveItem(item)}} className="removeItemX">x</h1>
                        <img 
                            src={item.imgURL} 
                            alt="Processed" 
                            className="itemImg" 
                            onClick={() => setCurItem(item)} 
                            style={{
                                height: isOnMobile ? "120px" : "250px",
                                width: "auto"
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div>
            {isSorted ? (
                <div id='itemDisplay'>
                    {items.length > 0 && (
                        <div>
                            {renderItems(sortedItems.hats, 'Hats')}
                            {renderItems(sortedItems.jackets, 'Jackets')}
                            {renderItems(sortedItems.tops, 'Tops')}
                            {renderItems(sortedItems.bottoms, 'Bottoms')}
                            {renderItems(sortedItems.shoes, 'Shoes')}
                            {renderItems(sortedItems.accessories, 'Accessories')}
                            {renderItems(sortedItems.other, 'Unorganized Items')}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <p>Upload some Items!</p>
                </div>
            )}
        </div>
    );
};

export default ItemDisplay;
