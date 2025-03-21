import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { setDoc, doc, query, collection, where, getDocs, updateDoc, arrayUnion, deleteDoc, arrayRemove } from "firebase/firestore";
import { db, auth, provider } from "../firebase-config";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { MdOutlineFileUpload   } from 'react-icons/md';
import { useNavigate } from "react-router-dom";
import DisplayFit from "./DisplayFit.js";
import moment from 'moment';



const LogField = ({ fit, isOnMobile }) => {
    const [fitTitle, setFitTitle] = useState("");
    const [fitDesc, setFitDesc] = useState("");
    const [fitTags, setFitTags] = useState("");
    const [dateFor, setDateFor] = useState(() => {
        let temp = localStorage.getItem("logFor");
        return temp;
    })
    const [curFit, setCurFit] = useState(() => {
        let temp = localStorage.getItem("curFit");
        return JSON.parse(temp);
    });
    const [logId, setLogId] = useState(() => {
        let temp = localStorage.getItem("logId");
        return temp;
    })
    const [fitCode, setFitCode] = useState();
    const storage = getStorage();
    const inputRef = useRef(null);
    let navigate = useNavigate();

    useEffect(() => {
        if (fit) {
            setCurFit(fit);
        }
    }, [fit]);

    useEffect(() => {
        localStorage.removeItem("curFit");

        let temp = "";
        console.log("curFit:", curFit);
        let keys = [];
        if (curFit) {
            keys = Object.keys(curFit);
        }

        keys.forEach((key) => {
            const item = curFit[key];

            if (key === "accessories" && Array.isArray(item) && item.length > 0) {
                temp += "--";
                item.forEach((obj) => {
                    if (obj.id) {
                        if (obj.id.length < 10) {
                            temp += ("0000000" + obj.id);
                        } else {
                            temp += obj.id;
                        }
                    } else {
                        console.error(`Missing id in Accessories object:`, obj);
                    }
                });
                temp += "--";
            }
            else if (key === "accessories" && Array.isArray(item) && item.length === 0) {

                temp += "----";
            }

            if (item && item.id && key !== "accessories") {
                if (item.id.length < 10) {
                    temp += ("0000000" + item.id);
                } else {
                    temp += item.id;
                }
            } else {
                console.error(`Invalid or missing 'id' for key '${key}':`, item);
            }
        });

        console.log("Generated fitCode:", temp);
        setFitCode(temp);
    }, [curFit])

    useEffect(() => {
        localStorage.removeItem("LogId");
    }, [logId])

    useEffect(() => {
        localStorage.removeItem("logFor");
    }, [dateFor])

    function stringToArray(inputString) {
        inputString = inputString.trim();
        const itemsArray = inputString.split(',').map(item => item.trim());
        return itemsArray;
    }

    const changeInfo = async () => {
        console.log(fitCode);

        const b = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
        const data = await getDocs(b);
        let name = null;
        data.forEach((doc) => {
            name = doc.data().name;
        })

        let actToLog = {
            title: fitTitle,
            desc: fitDesc,
            tags: stringToArray(fitTags),
            fitCode,
            user: auth.currentUser.uid,
            likedBy: [],
            loggedOn: moment().format('YYYY-MM-DD HH:mm:ss'),
            loggedFor: dateFor,
            logId,
            name
        };
        await setDoc(doc(db, 'feed', logId), actToLog);
        console.log("saved!");
    }



    return (
        curFit !== null && (
            <div className='infoField' style={{
                flexDirection: isOnMobile ? "column" : "row",
                justifyContent: isOnMobile ? "flex-start" : "space-around"
            }}>
                <div className="logFitContainer">
                    <DisplayFit fit={curFit}/>
                </div>
                <div className="details-container">
                    <div className="input-container">
                        <label htmlFor="title">Title:</label>
                        <input type="text" id="title" name="title" placeholder="Enter title..." value={fitTitle} onChange={(e) => setFitTitle(e.target.value)} />
                    </div>
                    <div className="input-container">
                        <label htmlFor="description">Description:</label>
                        <textarea id="description" name="description" placeholder="Enter description..." value={fitDesc} onChange={(e) => setFitDesc(e.target.value)} />
                    </div>
                    <div className="input-container">
                        <label htmlFor="tags">Tags:</label>
                        <textarea
                        id="tags"
                        name="tags"
                        placeholder="Enter tags..."
                        value={fitTags}
                        onChange={(e) => setFitTags(e.target.value)}
                        />
                    </div>
                    <button type="submit" onClick={changeInfo}>Log</button>
                </div>
            </div>
        )
    );
};

export default LogField;
