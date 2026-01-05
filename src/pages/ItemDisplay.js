import React, { useState, useEffect, useMemo } from 'react';
import { arrayUnion, arrayRemove, updateDoc, doc, query, collection, where, getDocs, deleteDoc } from "firebase/firestore";
import { db, auth, provider} from "../firebase-config";
import { getStorage, ref, deleteObject } from "firebase/storage";


const ItemDisplay = ({ isAuth, items, setCurItem, removeItem, isOnMobile }) => {
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const storage = getStorage();

        
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

        const totalItems =
    items.hats.length +
    items.jackets.length +
    items.tops.length +
    items.bottoms.length +
    items.shoes.length +
    items.accessories.length +
    items.other.length;


    return (
    <div>
        {totalItems > 0 ? (
        <div id='itemDisplay'>
            {items.other.length > 0 ? renderItems(items.other, 'Unorganized Items') : null}
            {renderItems(items.hats, 'Hats')}
            {renderItems(items.jackets, 'Jackets')}
            {renderItems(items.tops, 'Tops')}
            {renderItems(items.bottoms, 'Bottoms')}
            {renderItems(items.shoes, 'Shoes')}
            {renderItems(items.accessories, 'Accessories')}
        </div>
        ) : (
        <p>Upload some Items!</p>
        )}
    </div>
    );

};

export default ItemDisplay;
