import React, { useState, useRef } from 'react';
import axios from 'axios';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateDoc, arrayUnion, doc, setDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase-config';
import { MdOutlineFileUpload   } from 'react-icons/md';
import Pica from 'pica'; // Import Pica

const ImgUpload = ({ addItemList }) => {
  const [curItem, setCurItem] = useState();
  const [imageFile, setImageFile] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [processedImage, setProcessedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const [fileNameText, setFileNameText] = useState("Click to upload a garment");
  let itemList = [];

  const pica = Pica();

  const handleImagesChange = (e) => {
    if (e.target.files[0]) {
      setImageList(e.target.files);
    }      
    const files = e.target.files;
    const fileNameText = files.length > 0 
    ? Array.from(files).map(file => file.name).join(', ') 
    : "Click to upload a garment";
    setFileNameText(fileNameText);
  };

  const deleteItem = async (p) => {
    const storage = getStorage();

    const postDoc = doc(db, "clothes", p.id);
    await deleteDoc(postDoc);

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        items: arrayRemove(p.id)
    });

    deleteObject(ref(storage, 'images/' + p.id))
  }

  const startUploads = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    for (let i = 0; i < imageList.length; i++) {
      await handleUpload(imageList[i]);
      setUploadProgress(((i + 1) / imageList.length) * 100); // Update progress
    }
    setIsUploading(false);
  }

  const handleUpload = async (image) => {
    if (image) {
      // Resize the image if needed
      const resizedImage = await resizeImage(image);
      setImageFile(resizedImage);
  
      // Use FormData to send the resized image file as a Blob
      const formData = new FormData();
      formData.append('file', resizedImage, image.name); // Include the file name
  
      try {
        // Send the image file to the Python server for background removal
        const response = await axios.post('web-production-933d3.up.railway.app', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob' // Set response type to 'blob' to handle binary data
        });
  
        if (response.status === 200) {
          // Create a URL for the response Blob
          const processedImageUrl = URL.createObjectURL(response.data);
          console.log(processedImageUrl);
  
          // Calculate average colors from the processed image
          getAverageColor(response.data, (colors) => {
            let primaryColor = colors.primary;
            let secondaryColor = colors.secondary;
  
            console.log("Primary Color:", primaryColor);
            console.log("Secondary Color:", secondaryColor);
  
            // Convert the Blob to a Blob object for uploading
            const blob = response.data;
            const code = genCode(10);
            const storage = getStorage();
            const storageRef = ref(storage, code);
            const uploadTask = uploadBytesResumable(storageRef, blob);
  
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
                  addItem(imgURL, code, primaryColor, secondaryColor); // Add item to Firestore
                }).catch((error) => {
                  console.error('Error getting download URL:', error);
                });
              }
            );
          });
        } else {
          console.error('Error processing image:', response.statusText);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  };  
  

  const getAverageColor = (blob, callback) => {
    const reader = new FileReader();
  
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
  
        ctx.drawImage(img, 0, 0);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
        const calculateAverageColor = (imageData) => {
          const { data } = imageData;
          let r = 0, g = 0, b = 0, count = 0;
  
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // Check if pixel is opaque
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
          }
  
          if (count === 0) return { r: 0, g: 0, b: 0 }; // No opaque pixels
  
          return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
          };
        };
  
        const removeClosePixels = (imageData, avgColor) => {
          const { data } = imageData;
          const tolerance = 80; // Adjust tolerance as needed
  
          for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - avgColor.r;
            const dg = data[i + 1] - avgColor.g;
            const db = data[i + 2] - avgColor.b;
            if (Math.sqrt(dr * dr + dg * dg + db * db) < tolerance) {
              data[i + 3] = 0; // Make pixel transparent
            }
          }
        };
  
        const avgColor1 = calculateAverageColor(imageData);
        removeClosePixels(imageData, avgColor1);
  
        ctx.putImageData(imageData, 0, 0);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const avgColor2 = calculateAverageColor(imageData);
        
  
        callback({
          primary: `rgb(${avgColor1.r}, ${avgColor1.g}, ${avgColor1.b})`,
          secondary: `rgb(${avgColor2.r}, ${avgColor2.g}, ${avgColor2.b})`,
        });
      };
      img.src = event.target.result;
    };
  
    reader.readAsDataURL(blob);
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

  // Function to generate a random code if needed
  const genCode = (len) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let output = '';
    for (let i = 0; i < len; ++i) {
      output += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return output;
  };

  const addItem = async (imgURL, code, primaryColor, secondaryColor) => {
    const itemObj = {
      id: code,
      owner: auth.currentUser.uid,
      imgURL,
      title: "",
      desc: "",
      tags: [],
      type: "",
      primaryColor,
      secondaryColor
    }
    await setDoc(doc(db, 'clothing', code), itemObj);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      items: arrayUnion({ id: code })
    });
    itemList.push(itemObj);
    addItemList(itemObj);
    console.log(itemList);
  };

  /*
  const addDefaults = async() => {
    const noJacket = {
      id: "000",
      owner: auth.currentUser.uid,
      imgURL: "https://firebasestorage.googleapis.com/v0/b/onlinecloset-4f4d7.appspot.com/o/1200px-Gray_cross_out.svg.png?alt=media&token=f92fbec2-c903-4657-946d-17684ae49be3",
      title: "No Jacket",
      desc: "",
      tags: ["No Jacket"],
      type: "Jacket"
    }

    const noHat = {
      id: "001",
      owner: auth.currentUser.uid,
      imgURL: "https://firebasestorage.googleapis.com/v0/b/onlinecloset-4f4d7.appspot.com/o/1200px-Gray_cross_out.svg.png?alt=media&token=f92fbec2-c903-4657-946d-17684ae49be3",
      title: "No Hat",
      desc: "",
      tags: ["No Hat"],
      type: "Hat"
  }

    const noAcc = {
      id: "002",
      owner: auth.currentUser.uid,
      imgURL: "https://firebasestorage.googleapis.com/v0/b/onlinecloset-4f4d7.appspot.com/o/1200px-Gray_cross_out.svg.png?alt=media&token=f92fbec2-c903-4657-946d-17684ae49be3",
      title: "No Accessory",
      desc: "",
      tags: ["No Accessory"],
      type: "Accessory"
    }
    await setDoc(doc(db, 'clothing', noJacket.id), noJacket);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      items: arrayUnion({ id: noJacket.id })
    });
    await setDoc(doc(db, 'clothing', noHat.id), noHat);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      items: arrayUnion({ id: noHat.id })
    });
    await setDoc(doc(db, 'clothing', noAcc.id), noAcc);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      items: arrayUnion({ id: noAcc.id })
    });
  }
  */

  return (
    <div>
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
        <button onClick={startUploads} className='uploadButton'>Upload</button>
      </div>
      



      {isUploading && (
        <div className="loading-popup">
          <div className="loading-bar">
            <div className="loading-bar-progress" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          {uploadProgress === 100 ? <p>Done!</p> : <p>Uploading...</p>}
        </div>
      )}
    </div>
  );
};

export default ImgUpload;
