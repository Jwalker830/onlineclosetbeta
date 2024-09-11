import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateDoc, arrayUnion, doc, setDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { MdOutlineFileUpload   } from 'react-icons/md';
import { db, auth } from '../firebase-config';
import { useNavigate } from "react-router-dom";

const ViewField = ({ item, setCurItem, index, itemArray, setCurIndex, isOnMobile }) => {
    const [itemTitle, setItemTitle] = useState("");
    const [itemDesc, setItemDesc] = useState("");
    const [itemTags, setItemTags] = useState("");
    const [itemDisplay, setItemDisplay] = useState(item);
    const [itemType, setItemType] = useState("");
    const [itemImage, setItemImage] = useState("");
    const [newImage, setNewImage] = useState("");
    const [itemPrimary, setItemPrimary] = useState("");
    const [itemSecondary, setItemSecondary] = useState ("");
    let navigate = useNavigate();

    useEffect(() => {
        if (item) {
            setItemTitle(item.title);
            setItemDesc(item.desc);
            setItemTags(item.tags.join(", "));
            setItemType(item.type);
            setItemImage(item.imgURL);
            setItemPrimary(item.primaryColor ? item.primaryColor : convertColor("rgb(0, 0, 0)"));
            setItemSecondary(item.secondaryColor ? item.secondaryColor : convertColor("rgb(0, 0, 0)"));
        }
    }, [item]);

    const styleGarment = () => {
        localStorage.setItem("item", JSON.stringify(item));
        navigate("/");
    }

    const convertColor = (inputColor) => {
        // Function to convert hex to rgb
        const hexToRgb = (hex) => {
          const bigint = parseInt(hex.slice(1), 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          return `rgb(${r}, ${g}, ${b})`;
        };
      
        // Function to convert rgb to hex
        const rgbToHex = (r, g, b) => {
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        };
      
        // Determine if inputColor is in hex or rgb format
        if (inputColor.startsWith('#')) {
          // Input is in hex format
          return hexToRgb(inputColor);
        } else if (inputColor.startsWith('rgb')) {
          // Input is in rgb format
          const rgbValues = inputColor.match(/\d+/g).map(Number);
          return rgbToHex(rgbValues[0], rgbValues[1], rgbValues[2]);
        } else {
          // Invalid format
          return 'Invalid color format';
        }
    };

    const changeItem = (newIndex) => {
        if (newIndex >= 0 && newIndex < itemArray.length) {
            setCurIndex(newIndex);
            const newItem = itemArray[newIndex];
            setCurItem(newItem);
            setItemDisplay(newItem);
            setItemTitle(newItem.title);
            setItemDesc(newItem.desc);
            setItemTags(newItem.tags.join(", "));
            setItemType(newItem.type);
            setItemPrimary(newItem.primaryColor ? newItem.primaryColor : convertColor("rgb(0, 0, 0)"));
            setItemSecondary(newItem.secondaryColor ? newItem.secondaryColor : convertColor("rgb(0, 0, 0)"));
        } else {
            setCurIndex(null);
            setCurItem(null);
            setItemDisplay(null);
        }
    }
      

    return (
        itemDisplay !== null && (
            <div className='infoField' style={{
                flexDirection: isOnMobile ? "column" : "row",
                justifyContent: isOnMobile ? "flex-start" : "space-around"
            }}>
                <div className="image-container">
                    <img key={itemDisplay.id} src={itemImage} alt="Processed" onClick={styleGarment}/>
                </div>
                <div className="details-container">
                    <div className="button-container">
                        <button onClick={() => { changeItem((index - 1 + itemArray.length) % itemArray.length) }}>←</button>
                        <button onClick={() => { changeItem(-1); setItemDisplay(null); }}>x</button>
                        <button onClick={() => { changeItem((index + 1) % itemArray.length) }}>→</button>
                    </div>
                    <div className="itemTitle">
                        <h1>{itemTitle}</h1>
                    </div>
                    <div className="itemDesc">
                        <h3>{itemDesc}</h3>
                    </div>
                    <div className="itemTags">
                        <p>Tags:</p>
                        <p>{itemTags}</p>
                    </div>
                </div>
            </div>
        )
    );
};

export default ViewField;
