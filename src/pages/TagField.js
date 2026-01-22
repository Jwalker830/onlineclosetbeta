import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateDoc, arrayUnion, doc, setDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { MdOutlineFileUpload   } from 'react-icons/md';
import { db, auth } from '../firebase-config';
import { useNavigate } from "react-router-dom";
import AutoTag from './AutoTag';  // Adjust the import path as needed



const TagField = ({ item, setCurItem, index, itemArray, setCurIndex, isOnMobile, updateItem }) => {
    const [itemTitle, setItemTitle] = useState("");
    const [itemDesc, setItemDesc] = useState("");
    const [itemTags, setItemTags] = useState("");
    const [itemDisplay, setItemDisplay] = useState(item);
    const [itemType, setItemType] = useState("");
    const [itemImage, setItemImage] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [newImage, setNewImage] = useState("");
    const [itemPrimary, setItemPrimary] = useState("");
    const [itemSecondary, setItemSecondary] = useState ("");
    const [fileNameText, setFileNameText] = useState("Click to upload a new image");
    const [showSavedPopup, setShowSavedPopup] = useState(false);
    const inputRef = useRef(null);
    const storage = getStorage();
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


    // Converts the visible tag input to an array, excluding color tags
    function stringToArray(inputString) {
        inputString = inputString.trim();
        const itemsArray = inputString.split(',').map(item => item.trim()).filter(Boolean);
        return itemsArray;
    }

    // Returns the full tag array including hidden color tags
    function getFullTagsArray() {
        const visibleTags = stringToArray(itemTags);
        // Use a unique prefix to avoid collision with user tags
        const colorTags = [
            `__color_primary:${itemPrimary}`,
            `__color_secondary:${itemSecondary}`
        ];
        return [...visibleTags, ...colorTags];
    }

    const changeInfo = async () => {
        const updatedItem = {
            ...itemDisplay,
            title: itemTitle,
            desc: itemDesc,
            tags: getFullTagsArray(),
            type: itemType,
            imgURL: itemImage,
            primaryColor: itemPrimary,
            secondaryColor: itemSecondary
        };
        console.log(itemPrimary);
        await setDoc(doc(db, 'clothing', itemDisplay.id), updatedItem);
        console.log("saved!");
        updateItem(updatedItem);
        setShowSavedPopup(true);
        setTimeout(() => setShowSavedPopup(false), 3000); // Hide after 3 seconds
    }

    const changeItem = (direction) => {
        if (direction === -2) {
            setCurIndex(null);
            setCurItem(null);
            setItemDisplay(null);
            return;
        }
        if (itemArray.length === 0) return;
        const currentIndex = itemArray.findIndex(i => i.id === itemDisplay.id);
        if (currentIndex === -1) return;
        const newIndex = (currentIndex + direction + itemArray.length) % itemArray.length;
        const newItem = itemArray[newIndex];
        if (!newItem) return;
        setCurIndex(newIndex);
        setCurItem(newItem);
        setItemDisplay(newItem);
        setItemTitle(newItem.title);
        setItemDesc(newItem.desc);
        setItemTags(newItem.tags.join(", "));
        setItemType(newItem.type);
        setItemPrimary(newItem.primaryColor ? newItem.primaryColor : convertColor("rgb(0, 0, 0)"));
        setItemSecondary(newItem.secondaryColor ? newItem.secondaryColor : convertColor("rgb(0, 0, 0)"));
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
                    const response = await axios.post('https://web-production-933d3.up.railway.app', formData, {
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
                                    const updatedItem = { ...itemDisplay, imgURL };
                                    updateItem(updatedItem);
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
      
      const handleAutoTagResult = (tags) => {
        setItemTags(tags.join(", "));  // Update itemTags state with the tags for display
    };


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
                        <button onClick={() => { changeItem(-1) }}>←</button>
                        <button onClick={() => { changeItem(-2) }}>x</button>
                        <button onClick={() => { changeItem(1) }}>→</button>
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
                        <textarea
                        id="tags"
                        name="tags"
                        placeholder="Enter tags..."
                        value={itemTags}
                        onChange={(e) => setItemTags(e.target.value)}
                        />
                        <AutoTag onAutoTag={handleAutoTagResult} item={itemDisplay} />
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
                            <div className='colorShow' style={{ display: 'flex', flexDirection: 'row', gap: '2rem', alignItems: 'center' }}>
                                <div className='primaryShow' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <p>Primary Color</p>
                                    <div className='primaryPicker'>
                                        <input
                                            type="color"
                                            value={itemPrimary}
                                            onChange={(e) => setItemPrimary(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className='secondaryShow' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <p>Secondary Color</p>
                                    <div className='secondaryPicker'>
                                        <input
                                            type="color"
                                            value={itemSecondary}
                                            onChange={(e) => setItemSecondary(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button type="button" style={{ height: '2.5rem', alignSelf: 'flex-end' }} onClick={async () => {
                                    // K-means clustering for color extraction
                                    if (!itemImage) return;
                                    const img = new window.Image();
                                    img.crossOrigin = 'Anonymous';
                                    img.src = itemImage;
                                    img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        const ctx = canvas.getContext('2d');
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        ctx.drawImage(img, 0, 0);
                                        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                        // Collect all non-transparent pixels
                                        let pixels = [];
                                        for (let i = 0; i < data.length; i += 4) {
                                            if (data[i + 3] > 0) {
                                                pixels.push([data[i], data[i + 1], data[i + 2]]);
                                            }
                                        }
                                        // K-means clustering implementation
                                        function kMeans(data, k = 2, maxIter = 10) {
                                            // Randomly initialize centroids
                                            let centroids = [];
                                            for (let i = 0; i < k; i++) {
                                                centroids.push(data[Math.floor(Math.random() * data.length)]);
                                            }
                                            let assignments = new Array(data.length);
                                            for (let iter = 0; iter < maxIter; iter++) {
                                                // Assign each pixel to the nearest centroid
                                                for (let i = 0; i < data.length; i++) {
                                                    let minDist = Infinity, idx = 0;
                                                    for (let j = 0; j < k; j++) {
                                                        let dist = Math.sqrt(
                                                            Math.pow(data[i][0] - centroids[j][0], 2) +
                                                            Math.pow(data[i][1] - centroids[j][1], 2) +
                                                            Math.pow(data[i][2] - centroids[j][2], 2)
                                                        );
                                                        if (dist < minDist) {
                                                            minDist = dist;
                                                            idx = j;
                                                        }
                                                    }
                                                    assignments[i] = idx;
                                                }
                                                // Update centroids
                                                let sums = Array(k).fill().map(() => [0, 0, 0]);
                                                let counts = Array(k).fill(0);
                                                for (let i = 0; i < data.length; i++) {
                                                    let cluster = assignments[i];
                                                    sums[cluster][0] += data[i][0];
                                                    sums[cluster][1] += data[i][1];
                                                    sums[cluster][2] += data[i][2];
                                                    counts[cluster]++;
                                                }
                                                for (let j = 0; j < k; j++) {
                                                    if (counts[j] > 0) {
                                                        centroids[j] = [
                                                            Math.round(sums[j][0] / counts[j]),
                                                            Math.round(sums[j][1] / counts[j]),
                                                            Math.round(sums[j][2] / counts[j])
                                                        ];
                                                    }
                                                }
                                            }
                                            return centroids;
                                        }
                                        if (pixels.length > 0) {
                                            const [primary, secondary] = kMeans(pixels, 2);
                                            setItemPrimary(convertColor(`rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`));
                                            setItemSecondary(convertColor(`rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`));
                                        }
                                    };
                                }}>
                                    Auto Color
                                </button>
                            </div>
                    </div>
                    <button type="submit" onClick={changeInfo}>Save</button>
                </div>
                {showSavedPopup && (
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        zIndex: 1000,
                        textAlign: 'center'
                    }}>
                        <p>Information saved successfully!</p>
                    </div>
                )}
            </div>
        )
    );
};

export default TagField;
