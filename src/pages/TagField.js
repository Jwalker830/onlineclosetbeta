import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateDoc, arrayUnion, doc, setDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { MdOutlineFileUpload   } from 'react-icons/md';
import { db, auth } from '../firebase-config';
import { useNavigate } from "react-router-dom";

const TagField = ({ item, setCurItem, index, itemArray, setCurIndex, isOnMobile }) => {
    const [itemTitle, setItemTitle] = useState("");
    const [itemDesc, setItemDesc] = useState("");
    const [itemTags, setItemTags] = useState("");
    const [itemDisplay, setItemDisplay] = useState(item);
    const [itemType, setItemType] = useState("");
    const [itemImage, setItemImage] = useState("");
    const [newImage, setNewImage] = useState("");
    const [itemPrimary, setItemPrimary] = useState("");
    const [itemSecondary, setItemSecondary] = useState ("");
    const [fileNameText, setFileNameText] = useState("Click to upload a new image");
    const [imageFile, setImageFile] = useState(null);
    var namer = require('color-namer')
    const storage = getStorage();
    const inputRef = useRef(null);
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

    function stringToArray(inputString) {
        inputString = inputString.trim();
        const itemsArray = inputString.split(',').map(item => item.trim());
        return itemsArray;
    }

    const changeInfo = async () => {
        itemArray[index] = {
            ...itemDisplay,
            title: itemTitle,
            desc: itemDesc,
            tags: stringToArray(itemTags),
            type: itemType,
            imgURL: itemImage,
            primaryColor: itemPrimary,
            secondaryColor: itemSecondary
        };
        console.log(itemPrimary);
        await setDoc(doc(db, 'clothing', itemDisplay.id), itemArray[index]);
        console.log("saved!");
    }

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

    const handleImagesChange = (e) => {
        if (e.target.files[0]) {
            setNewImage(e.target.files);
        }
        let file = e.target.files[0];
        const fileNameText = file 
        ? file.name 
        : "Click to upload a new image";
        setFileNameText(fileNameText);
    };

    
      
    const changeImage = async (image) => {
        if (image) {
            const imgRef = ref(storage, item.id);
            try {
                // Delete old image from storage
                await deleteObject(imgRef);
            } catch (error) {
                console.error('Error deleting old image:', error);
            }
    
            const resizedImage = await resizeImage(image[0]);
            setImageFile(resizedImage);
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Encoded = reader.result.split(',')[1]; // Extract base64 part from Data URL
                const formData = new FormData();
                formData.append('file', base64Encoded); // Ensure 'file' matches the key expected by Flask
                try {
                    // Send Base64 encoded image data to Python server for background removal
                    const response = await axios.post('https://removebg-gd4j.onrender', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
    
                    if (response.status === 200) {
                        const blob = await base64StringToBlob(response.data.image);
    
                        if (blob.size === 0) {
                            console.error('Error: Blob size is 0');
                            return;
                        }
    
                        // Create object URL from Blob
                        const processedImageUrl = URL.createObjectURL(blob);
                        const uploadTask = uploadBytesResumable(imgRef, blob);
    
                        uploadTask.on(
                            'state_changed',
                            (snapshot) => {
                                // Handle progress if needed
                            },
                            (error) => {
                                console.error('Error uploading image:', error);
                            },
                            () => {
                                // Image uploaded successfully, get download URL
                                getDownloadURL(uploadTask.snapshot.ref).then((imgURL) => {
                                    setItemImage(imgURL);
                                    console.log(itemImage);
                                }).catch((error) => {
                                    console.error('Error getting download URL:', error);
                                });
                            }
                        );
                    } else {
                        console.error('Error processing image:', response.statusText);
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                }
            };
            reader.readAsDataURL(resizedImage);
        }
    };
    
    
      const resizeImage = (imageFile) => {
        return new Promise((resolve, reject) => {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(imageFile);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            const MAX_SIZE = 800;
            let width = img.width;
            let height = img.height;
    
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
    
            context.drawImage(img, 0, 0, width, height);
    
            canvas.toBlob((blob) => {
              resolve(blob);
            }, 'image/jpeg', 0.8); // 0.8 is the quality (80%)
          };
          img.onerror = (error) => {
            reject(error);
          };
        });
      };

      const base64StringToBlob = (base64String) => {
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'image/png' }); // Adjust the 'type' as per your image format
      };

      const styleGarment = () => {
        localStorage.setItem("item", JSON.stringify(item));
        navigate("/");
      }
      

    return (
        itemDisplay !== null && (
            <div className='infoField' style={{
                flexDirection: isOnMobile ? "column" : "row",
                justifyContent: isOnMobile ? "flex-start" : "space-around"
            }}>
                <div className="image-container">
                    <img key={itemDisplay.id} src={itemImage} alt="Processed" onClick={styleGarment}/>
                    <div className='uploadUi'>
                        <label className="custom-file-input">
                        <input 
                            type="file" 
                            onChange={handleImagesChange} 
                            ref={inputRef} 
                            multiple 
                            accept="image/*" 
                        />
                        <span className="custom-button">
                            <MdOutlineFileUpload className="upload-icon" />
                        </span>
                        <span className="custom-text">{fileNameText}</span>
                        </label>
                        <button onClick={changeImage} className='uploadButton'>Upload</button>
                    </div>
                </div>
                <div className="details-container">
                    <div className="button-container">
                        <button onClick={() => { changeItem((index - 1 + itemArray.length) % itemArray.length) }}>←</button>
                        <button onClick={() => { changeItem(-1); setItemDisplay(null); }}>x</button>
                        <button onClick={() => { changeItem((index + 1) % itemArray.length) }}>→</button>
                    </div>
                    <div className="input-container">
                        <label htmlFor="title">Title:</label>
                        <input type="text" id="title" name="title" placeholder="Enter title..." value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
                    </div>
                    <div className="input-container">
                        <label htmlFor="description">Description:</label>
                        <textarea id="description" name="description" placeholder="Enter description..." value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
                    </div>
                    <div className="input-container">
                        <label htmlFor="tags">Tags:</label>
                        <textarea id="tags" name="tags" placeholder="Enter tags..." value={itemTags} onChange={(e) => setItemTags(e.target.value)} />
                    </div>
                    <div>
                        <div onChange={(e) => setItemType(e.target.value)}>
                            <label><input type="radio" name="itemType" value="Hat" checked={itemType === "Hat"} /> Hat</label><br/>
                            <label><input type="radio" name="itemType" value="Jacket" checked={itemType === "Jacket"} /> Jacket</label><br/>
                            <label><input type="radio" name="itemType" value="Top" checked={itemType === "Top"} /> Top</label><br/>
                            <label><input type="radio" name="itemType" value="Bottoms" checked={itemType === "Bottoms"} /> Bottoms</label><br/>
                            <label><input type="radio" name="itemType" value="Shoes" checked={itemType === "Shoes"} /> Shoes</label><br/>
                            <label><input type="radio" name="itemType" value="Accessory" checked={itemType === "Accessory"} /> Accessory</label><br/>
                        </div>
                            <div className='colorShow'>
                                <div className='primaryShow'>
                                    <p>Primary Color</p>
                                    <div className='primaryPicker'>
                                    <input
                                        type="color"
                                        value={itemPrimary} // Assuming you have a primaryColor state
                                        onChange={(e) => setItemPrimary(e.target.value)} // Update state on color change
                                    />
                                    </div>
                                </div>
                                <div className='secondaryShow'>
                                    <p>Secondary Color</p>
                                    <div className='secondaryPicker'>
                                    <input
                                        type="color"
                                        value={itemSecondary} // Assuming you have a secondaryColor state
                                        onChange={(e) => setItemSecondary(e.target.value)} // Update state on color change
                                    />
                                    </div>
                                </div>
                            </div>
                    </div>
                    <button type="submit" onClick={changeInfo}>Save</button>
                </div>
            </div>
        )
    );
};

export default TagField;
