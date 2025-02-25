import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import { useNavigate } from "react-router-dom";
import DisplayFit from "./DisplayFit";

function FeedCell({ action, index }) {

    return (
        <div className="feedCellContainer">

            {action.action.type === "fit" ?
            <>
                <h3>{action.name} logged an outfit!</h3>
                <div className="actionContainer" key={index}>
                    <DisplayFit curFit={JSON.parse(action.action.content)} />
                </div>
                {action.action.on && <p>Outfit for {action.action.on}</p>}
            </>
                :
                <div>
                    <h3>{action.name} added an item!</h3>

                </div>
            }
        </div>
    );
}

export default FeedCell;
