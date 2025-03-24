import React, { useState, useEffect, useRef } from 'react';
import { query, collection, where, getDocs, updateDoc, arrayUnion, arrayRemove, doc } from "firebase/firestore";
import { db, auth, provider } from "../firebase-config";
import { getStorage } from 'firebase/storage';
import { MdOutlineFileUpload } from 'react-icons/md';
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import DisplayFit from "./DisplayFit.js";
import moment from 'moment';

const ViewLog = ({ isOnMobile }) => {
    const [log, setLog] = useState(null);
    const [curFit, setCurFit] = useState(null);
    const { logId: paramLogId } = useParams();
    const storage = getStorage();
    const inputRef = useRef(null);
    let navigate = useNavigate();

    // Fetch the log document from Firestore using the logId from the URL.
    useEffect(() => {
        const fetchLog = async () => {
            if (paramLogId) {
                const q = query(collection(db, "feed"), where("logId", "==", paramLogId));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    setLog(data);
                }
            }
        };
        fetchLog();
    }, [paramLogId]);

    // Check if the current user has liked the log.
    // If no user is logged in, simply set liked to false.
    const [liked, setLiked] = useState(false);
    useEffect(() => {
        if (log && auth.currentUser && log.likedBy && log.likedBy.includes(auth.currentUser.uid)) {
            setLiked(true);
        } else {
            setLiked(false);
        }
    }, [log]);

    // Fetch the outfit based on log.fitCode.
    useEffect(() => {
        if (!log || !log.fitCode) return;

        const getFitFromCode = async (outfitID) => {
            const outfit = {
                hat: null,
                jacket: null,
                top: null,
                bottom: null,
                shoe: null,
                accessories: [],
            };
            let cats = Object.keys(outfit);
            for (let i = 0; i < 5; i++) {
                let curID = outfitID.substr(i * 10, 10);
                if (curID === "0000000000") {
                    curID = "000";
                }
                if (curID === "0000000001") {
                    curID = "001";
                }
                const b = query(collection(db, "clothing"), where("id", "==", curID));
                const data = await getDocs(b);
                data.forEach((docSnap) => {
                    outfit[cats[i]] = docSnap.data();
                });
            }

            // Obtain accessories from the fitCode.
            let accs = outfitID.substring(52, outfitID.length - 2);
            console.log("accs", accs);
            for (let i = 0; i < accs.length / 10; i++) {
                let curID = accs.substr(i * 10, 10);
                if (curID === "0000000002") {
                    curID = "002";
                }
                const b = query(collection(db, "clothing"), where("id", "==", curID));
                const data = await getDocs(b);
                data.forEach((docSnap) => {
                    outfit.accessories.push(docSnap.data());
                });
            }

            return outfit;
        };

        const fetchFit = async () => {
            const outfit = await getFitFromCode(log.fitCode);
            setCurFit(outfit);
        };

        fetchFit();
    }, [log]);

    // Handle like functionality. If the user is not authenticated, do nothing.
    const handleLike = async () => {
        if (!log || !auth.currentUser) return; // Do nothing if not authenticated.
        const actionRef = doc(db, 'feed', log.logId);
        if (!liked) {
            await updateDoc(actionRef, {
                likedBy: arrayUnion(auth.currentUser.uid)
            });
            setLog({ ...log, likedBy: [...log.likedBy, auth.currentUser.uid] });
            setLiked(true);
        } else {
            await updateDoc(actionRef, {
                likedBy: arrayRemove(auth.currentUser.uid)
            });
            setLog({ ...log, likedBy: log.likedBy.filter((id) => id !== auth.currentUser.uid) });
            setLiked(false);
        }
    };

    const goProfile = async () => {
        if (log.user) {
            console.log(log.user)
            navigate(`/profile/${log.user}`)
        }
        else {
            console.log(curFit.top.owner);
            navigate(`/profile/${curFit.top.owner}`)
        }
    }

    return (
        log !== null && (
            <div
                className='logInfoField'
                style={{
                    flexDirection: isOnMobile ? "column" : "row",
                    justifyContent: isOnMobile ? "flex-start" : "space-around"
                }}
            >
                <div className="logFitContainer">
                    <DisplayFit fit={curFit} />
                </div>
                <div className="details-container">
                    <h1 onClick={() => { goProfile() }}>{log.name}</h1>
                    <div className="input-container">
                        <label htmlFor="title">Title:</label>
                        <h1>{log.title}</h1>
                    </div>
                    <div className="input-container">
                        <label htmlFor="description">Description:</label>
                        <h3>{log.desc}</h3>
                    </div>
                    <p>{Array.isArray(log.tags) ? log.tags.join(', ') : log.tags}</p>
                    <div
                        onClick={auth.currentUser ? handleLike : () => { navigate("/login"); }}
                        style={{ cursor: auth.currentUser ? "pointer" : "default" }}
                        title={auth.currentUser ? "" : "Log in to like this outfit"}
                    >
                        {liked ? (
                            <FaHeart style={{ fontSize: "48px", color: "black" }} />
                        ) : (
                            <FaRegHeart style={{ fontSize: "48px", color: "black" }} />
                        )}
                        <span style={{ marginLeft: "10px", fontSize: "18px" }}>
                            {log.likedBy && log.likedBy.length}
                        </span>
                    </div>
                </div>
            </div>
        )
    );
};

export default ViewLog;