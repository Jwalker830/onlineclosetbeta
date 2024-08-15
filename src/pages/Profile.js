import React, { useState, useEffect } from "react"; // Added useEffect import
import { collection, getDocs, query, where, startAt, endAt } from "firebase/firestore";
import GetUserItems from "./GetUserItems";
import { db } from "../firebase-config";
import { useNavigate } from "react-router-dom";

function Profile() {
    let navigate = useNavigate();
    const [profileID, setProfileID] = useState(() => {
        if(localStorage.getItem("profile")){
            return JSON.parse(localStorage.getItem("profile"));
        }
        return null;
    });
    const [profile, setProfile] = useState();
    const [profileView, setProfileView] = useState("");
    const [items, setItems] = useState([]);
    const [sortedItems, setSortedItems] = useState({
        hats: [],
        jackets: [],
        tops: [],
        bottoms: [],
        shoes: [],
        accessories: [],
        other: [],
    });

    const updateItemList = (newItemList) => {
        setItems(newItemList);
    };

    useEffect(() => {
        if (items.length > 0) {
            const s = sortPrefItems(items);
            setSortedItems(s);
        }
    }, [items]); // Trigger effect when items change

    useEffect(() => {
        getProfile();
    }, [profileID])

    const getProfile = async () => {
        if (profileID) {
            console.log(profileID);
            try {
                const q = query(collection(db, "users"), where("id", "==", profileID));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0]; // Assuming there's only one matching document
                    const userData = userDoc.data(); // Retrieve the user data
                    console.log(userData);
                    setProfile(userData);
                } else {
                    console.error("No matching user found");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }
    };
    

    const sortPrefItems = (items) => {
        const sorted = {
            hats: [],
            jackets: [],
            tops: [],
            bottoms: [],
            shoes: [],
            accessories: [],
            other: [],
        };

        sorted.hats = items.filter(item => item.type === "Hat" && item.title !== "No Hat");
        sorted.jackets = items.filter(item => item.type === "Jacket" && item.title !== "No Jacket");
        sorted.tops = items.filter(item => item.type === "Top");
        sorted.bottoms = items.filter(item => item.type === "Bottoms");
        sorted.shoes = items.filter(item => item.type === "Shoes");
        sorted.accessories = items.filter(item => item.type === "Accessory" && item.title !== "No Accessory");
        sorted.other = items.filter(item => item.type === "");
        console.log(items);

        return sorted;
    };

    const renderItems = (items, title) => (
        <div className='profileTypeContainer' >
            <div className='profileTypeTitle'>{title}</div>
            <div className={"typeDisplay"} style={{display: "flex", flexWrap: "wrap"}}>
                {items.map((item) => (
                    <div className="profileItem"
                        key={item.id}
                    >
                        <img 
                            src={item.imgURL} 
                            alt="Processed" 
                            className="itemImg" 
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    const viewItems = () => {
        localStorage.setItem("closetID", JSON.stringify(profileID));
        navigate("/");
    }

    return (
        <div className="profileContainer">
        {profile &&
            <>
                <GetUserItems setItemList={updateItemList} id={profileID}/>
                <h1>{profile.name}</h1>
                {items.length > 0 ? (
                    <div className="closetShow">
                        <div className="profileItemDisplay">
                            {renderItems(sortedItems.hats, 'Hats')}
                            {renderItems(sortedItems.jackets, 'Jackets')}
                            {renderItems(sortedItems.tops, 'Tops')}
                            {renderItems(sortedItems.bottoms, 'Bottoms')}
                            {renderItems(sortedItems.shoes, 'Shoes')}
                            {renderItems(sortedItems.accessories, 'Accessories')}
                            {renderItems(sortedItems.other, 'Unorganized Items')}
                        </div>
                        <button onClick={viewItems}>View in Closet</button>
                    </div>
                ) : (
                    <div>No Items</div>
                )}
            </>
        }
        </div>
    );
}

export default Profile;
