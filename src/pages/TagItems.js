import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase-config";
import GetUserItems from "./GetUserItems";
import TagField from "./TagField";
import ItemDisplay from "./ItemDisplay";
import ImgUpload from "./ImgUpload";

const TagItems = ({ isAuth }) => {
    const [displayedItems, setDisplayedItems] = useState([]);
    const [curIndex, setCurIndex] = useState();
    const [curItem, setCurItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

  const onMobile = useMemo(
    () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );

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
        console.log(sorted);

        return sorted;
    };

    const sortedItems = useMemo(() => sortPrefItems(displayedItems), [displayedItems]);
    
    const flatItems = useMemo(
        () => Object.values(sortedItems).flat(),
        [sortedItems]
    );

    useEffect(() => {
        console.log("Newly sorted List:", sortedItems);
    }, [sortedItems]);

  useEffect(() => {
    return auth.onAuthStateChanged(user => {
      if (user) setLoading(false);
    });
  }, []);

  const mergeItemList = (items) => {
    setDisplayedItems(prev => {
      const map = new Map(prev.map(i => [i.id, i]));
      items.forEach(i => map.set(i.id, i));
      return Array.from(map.values());
    });
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
    <div id="itemDisplay">
      <GetUserItems setItemList={mergeItemList} id={auth.currentUser.uid} />

      {curItem ? (
            <TagField item={curItem} setCurItem={updateCurItem} index={flatItems.findIndex(i => i.id === curItem.id)} itemArray={sortedItems} setCurIndex={updateCurIndex} isOnMobile={onMobile}/>
      ) : (
        <>
          <div className="topRow">
            <ImgUpload addItemList={mergeItemList} onUploadStart={() => setIsUploading(true)} onUploadComplete={() => setIsUploading(false)} />
            <Link to="/swipe">Score random outfits</Link>
          </div>

          {isUploading ? (
            <p>Uploading and processing items...</p>
          ) : (
            <ItemDisplay
              items={sortedItems}
              setCurItem={setCurItem}
              removeItem={item =>
                setDisplayedItems(prev => prev.filter(i => i.id !== item.id))
              }
              isOnMobile={onMobile}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TagItems;
