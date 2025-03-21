import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import { useNavigate } from "react-router-dom";
import DisplayFit from "./DisplayFit";

function FeedCell({ action, index }) {

    const [liked, setLiked] = useState()

    return (
        <div className="feedCellContainer">
                <h3>{action.name} logged an outfit!</h3>
                {action.title && <p>{action.title}</p>}
                <div className="actionContainer" key={index}>
                    <DisplayFit fitCode={action.fitCode} />
                </div>
                {action.loggedFor && <p>Outfit for {action.loggedFor}</p>}
                {action.desc && <p>{action.desc}</p>}
                    <div>
                        <div>{liked ? "liked" : "unliked"}</div>
                    </div>
        </div>
    );
}

export default FeedCell;
