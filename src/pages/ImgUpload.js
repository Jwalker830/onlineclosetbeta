import React, { useState, useRef, useEffect } from "react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { updateDoc, arrayUnion, doc, setDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import { MdOutlineFileUpload } from "react-icons/md";
import { removeBackground, preload } from "@imgly/background-removal";
import moment from "moment";

preload();

const ImgUpload = ({ addItemList, onUploadStart, onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileNameText, setFileNameText] = useState("Click to upload a garment");

  const progressRef = useRef({ transferred: 0, total: 0 });

  /* ------------------------- FILE INPUT ------------------------- */

  const handleImagesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setFileNameText(
      selected.length ? selected.map(f => f.name).join(", ") : "Click to upload a garment"
    );
  };

  /* ------------------------- UPLOAD FLOW ------------------------- */

  const startUploads = async () => {
    if (!files.length) return;

    setUploading(true);
    setProgress(0);
    progressRef.current = { transferred: 0, total: 0 };
    onUploadStart?.();

    try {
      const results = await Promise.all(files.map(processAndUpload));
      await commitToFirestore(results);
      addItemList(results) // ✅ immediate UI update
      setFiles([]);
      setFileNameText("Click to upload a garment");
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      onUploadComplete?.();
    }
  };


  /* ------------------------- IMAGE PIPELINE ------------------------- */

  const processAndUpload = async (file) => {
    const resized = await resizeImage(file);
    const processed = await removeBackground(resized);
    const colors = await getAverageColor(processed);

    const id = genCode(10);
    const storageRef = ref(getStorage(), id);

    const uploadTask = uploadBytesResumable(storageRef, processed);

    progressRef.current.total += processed.size;

    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snap) => {
          progressRef.current.transferred += snap.bytesTransferred;
          setProgress(
            Math.min(
              100,
              (progressRef.current.transferred / progressRef.current.total) * 100
            )
          );
        },
        reject,
        resolve
      );
    });

    const imgURL = await getDownloadURL(storageRef);

    return {
      id,
      imgURL,
      ...colors,
      type: "", 
      title: "", 
      tags: [],
      desc: "",
      owner: auth.currentUser.uid,
    };
  };

  /* ------------------------- FIRESTORE ------------------------- */

  const commitToFirestore = async (items) => {
    const batch = writeBatch(db);
    const userRef = doc(db, "users", auth.currentUser.uid);

    items.forEach((item) => {
      batch.set(doc(db, "clothing", item.id), {
        ...item,
        title: "",
        desc: "",
        tags: [],
        type: "",
      });

      batch.update(userRef, {
        items: arrayUnion({ id: item.id }),
        actions: arrayUnion({
          user: auth.currentUser.uid,
          type: "item",
          content: item.id,
          time: moment().format("YYYY-MM-DD HH:mm:ss"),
        }),
      });
    });

    await batch.commit();
  };

  /* ------------------------- HELPERS ------------------------- */

  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const max = 800;
        let { width, height } = img;

        if (width > height && width > max) {
          height *= max / width;
          width = max;
        } else if (height > max) {
          width *= max / height;
          height = max;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, "image/png", 0.9);
      };

      img.onerror = reject;
    });

  const getAverageColor = (blob) =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        resolve({
          primaryColor: `rgb(${r / count | 0}, ${g / count | 0}, ${b / count | 0})`,
          secondaryColor: "rgb(0,0,0)",
        });
      };
    });

  const genCode = (len) =>
    [...crypto.getRandomValues(new Uint8Array(len))]
      .map(v => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[v % 62])
      .join("");

  /* ------------------------- UI ------------------------- */

  return (
    <div>
      <label className="custom-file-input">
        <input type="file" multiple accept="image/*" onChange={handleImagesChange} />
        <span className="custom-button"><MdOutlineFileUpload /></span>
        <span className="custom-text">{fileNameText}</span>
      </label>

      <button onClick={startUploads} disabled={uploading}>
        Upload
      </button>

      {uploading && (
        <div className="loading-popup">
          <div className="loading-bar">
            <div className="loading-bar-progress" style={{ width: `${progress}%` }} />
          </div>
          <p>{progress >= 100 ? "Done!" : "Uploading..."}</p>
        </div>
      )}
    </div>
  );
};

export default ImgUpload;
