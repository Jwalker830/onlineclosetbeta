import React, { useState, useEffect } from "react";
import { updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import { useNavigate } from "react-router-dom";
import DisplayFit from "./DisplayFit";
import { FaHeart, FaRegHeart } from "react-icons/fa";

function FeedCell({ action, index }) {
    const [liked, setLiked] = useState(false);

    let navigate = useNavigate();

    useEffect(() => {
        if (action.likedBy.includes(auth.currentUser.uid)) {
            setLiked(true);
        } else {
            setLiked(false);
        }
    }, [action]);

    const handleLike = async () => {
        const actionRef = doc(db, 'feed', action.logId);
        if (!liked) {
            await updateDoc(actionRef, {
                likedBy: arrayUnion(auth.currentUser.uid)
            });
            action.likedBy.push(auth.currentUser.uid);
            setLiked(true);
        } else {
            await updateDoc(actionRef, {
                likedBy: arrayRemove(auth.currentUser.uid)
            });
            action.likedBy = action.likedBy.filter((id) => id !== auth.currentUser.uid);
            setLiked(false);
        }
    };

    const viewLog = () => {
        navigate("/post/" + action.logId);
    }

    return (
        <div onClick={viewLog} className="feedCellContainer">
            <div className="topFeed">
                <h3>{action.name}</h3>
                {action.title && <p>{action.title}</p>}
                <div className="actionContainer" key={index}>
                    <DisplayFit fitCode={action.fitCode} />
                </div>
            </div>

            <div className="bottomFeed">
                {action.loggedFor && <p>Outfit for {action.loggedFor}</p>}
                {action.desc && <p>{action.desc}</p>}
                <div className="interactButtons">
                    <div onClick={handleLike} style={{ cursor: "pointer" }}>
                        {liked ? (
                            <FaHeart style={{ fontSize: "48px", color: "black" }} />
                        ) : (
                            <FaRegHeart style={{ fontSize: "48px", color: "black" }} />
                        )}

                        <span style={{ marginLeft: "10px", fontSize: "18px" }}>
                            {action.likedBy.length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FeedCell;