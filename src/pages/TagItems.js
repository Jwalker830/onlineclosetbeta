import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { auth } from "../firebase-config";
import GetUserItems from './GetUserItems';
import TagField from './TagField';
import ItemDisplay from './ItemDisplay';
import ImgUpload from './ImgUpload';

const TagItems = ({ isAuth }) => {
    const [displayedItems, setDisplayedItems] = useState([]);
    const [sortedItems, setSortedItems] = useState([]);
    const [curIndex, setCurIndex] = useState();
    const [curItem, setCurItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [onMobile, setOnMobile] = useState(() => {return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream});

    const sortItems = (items) => {
        let sorted = [
            ...(items.filter(item => item.type === "Hat")),
            ...(items.filter(item => item.type === "Jacket")),
            ...(items.filter(item => item.type === "Top")),
            ...(items.filter(item => item.type === "Bottoms")),
            ...(items.filter(item => item.type === "Shoes")),
            ...(items.filter(item => item.type === "Accessory")),
            ...(items.filter(item => item.type === ""))
        ];

        const filteredItems = sorted.filter(item => item.id !== "000" && item.id !== "001" && item.id !== "002");

        return filteredItems;
    };

    useEffect(() => {
        let sorted = sortItems(displayedItems);
        setSortedItems(sorted);
    }, [displayedItems]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setLoading(false); // Set loading to false once auth.currentUser is loaded
            }
        });

        return () => unsubscribe();
    }, []);

    const addToItemList = (newItem) => {
        const newList = [...displayedItems, newItem];
        setDisplayedItems(newList);
    };

    const updateItemList = (newItemList) => {
        setDisplayedItems(newItemList);
    };

    const updateCurItem = (item) => {
        setCurItem(item);
    };

    const handleRemoveItem = (item) => {
        setDisplayedItems((prevItems) => prevItems.filter((i) => i.id !== item.id));
    };

    const updateCurIndex = (newIndex) => {
        setCurIndex(newIndex);
    };

    if (loading) {
        return <p>Loading...</p>; // You can customize this loading message or component
    }

    return (
        <div id='itemDisplay'>
            <GetUserItems setItemList={updateItemList} id={auth.currentUser.uid} />
            {curItem === null ? (
                <>
                    <div className='topRow'>
                        <ImgUpload addItemList={addToItemList} />
                        <Link to="/swipe">Score random outfits</Link>
                    </div>
                    <ItemDisplay items={displayedItems} setCurItem={updateCurItem} removeItem={handleRemoveItem} isOnMobile={onMobile}/>
                </>
            ) : (
                <TagField item={curItem} setCurItem={updateCurItem} index={sortedItems.indexOf(curItem)} itemArray={sortedItems} setCurIndex={updateCurIndex} isOnMobile={onMobile}/>
            )}
        </div>
    );
};

export default TagItems;
