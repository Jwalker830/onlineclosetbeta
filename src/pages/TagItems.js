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

  const onMobile = useMemo(
    () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );

  const sortItems = (items) => [
    ...items.filter(i => i.type === "Hat"),
    ...items.filter(i => i.type === "Jacket"),
    ...items.filter(i => i.type === "Top"),
    ...items.filter(i => i.type === "Bottoms"),
    ...items.filter(i => i.type === "Shoes"),
    ...items.filter(i => i.type === "Accessory"),
    ...items.filter(i => !i.type),
  ].filter(i => !["000","001","002"].includes(i.id));

  const sortedItems = useMemo(
    () => sortItems(displayedItems),
    [displayedItems]
  );

  useEffect(() => {
    return auth.onAuthStateChanged(user => {
      if (user) setLoading(false);
    });
  }, []);

  const addToItemList = (item) => {
    setDisplayedItems(prev => [...prev, item]);
  };

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
            <TagField item={curItem} setCurItem={updateCurItem} index={sortedItems.indexOf(curItem)} itemArray={sortedItems} setCurIndex={updateCurIndex} isOnMobile={onMobile}/>
      ) : (
        <>
          <div className="topRow">
            <ImgUpload addItemList={addToItemList} />
            <Link to="/swipe">Score random outfits</Link>
          </div>

          <ItemDisplay
            items={sortedItems}
            setCurItem={setCurItem}
            removeItem={item =>
              setDisplayedItems(prev => prev.filter(i => i.id !== item.id))
            }
            isOnMobile={onMobile}
          />
        </>
      )}
    </div>
  );
};

export default TagItems;
