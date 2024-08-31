import React, { useState, useEffect } from "react"; // Added useEffect import
import { collection, getDocs, query, where, startAt, endAt, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import GetUserItems from "./GetUserItems";
import { db, auth } from "../firebase-config";
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
    const [following, setFollowing] = useState();
    const [follows, setFollows] = useState();
    const [friends, setFriends] = useState();

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
        localStorage.removeItem("profile");
        getProfile();
    }, [profileID])

    const getProfile = async () => {
        if(!profileID && localStorage.getItem("isAuth")){
            setProfileID(auth.currentUser.uid);
        }

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

    const followUser = async() => {
        console.log("following");
        await updateDoc(doc(db, "users", profileID), {
            followers: arrayUnion(auth.currentUser.uid)
        });
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            following: arrayUnion(profileID)
        });
        setTimeout(() => {
            isFollowing();
        }, 100)
    }

    const unfollowUser = async() => {
        console.log("unfollowing");
        await updateDoc(doc(db, "users", profileID), {
            followers: arrayRemove(auth.currentUser.uid)
        });
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            following: arrayRemove(profileID)
        });
        setTimeout(() => {
            isFollowing();
        }, 100)
    }

    
    const isFollowing = async () => {
        try {
            let uFollow;
            let iFollow;
            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }
    
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
    
            if (userData.following && userData.following.includes(profileID)) {
                setFollowing(true);
                iFollow = true;
            } else {
                setFollowing(false);
                iFollow = false;
            }

            if (userData.followers && userData.followers.includes(profileID)) {
                setFollows(true);
                uFollow = true;
            } else {
                setFollows(false);
                uFollow = true;
            }
            if(iFollow && uFollow){
                setFriends(true);
            }
            else{
                setFriends(false);
            }
        } catch (error) {
            console.error("Error checking following status:", error);
            setFollowing(false);
            setFollows(false);
        }

    }

    useEffect(() => {
        if(localStorage.getItem("isAuth")){
            isFollowing();
        }
    }, [])

    return (
        <div className="profileContainer">
        {profile &&
            <>
                <GetUserItems setItemList={updateItemList} id={profileID}/>
                <div className="profileHeader">
                    <h1>{profile.name}</h1>
                </div>
                <>{(follows && !friends) && <h3>Follows you</h3>}</>
                <>{friends && <h3>Friends</h3>}</>
                {auth.currentUser && auth.currentUser.uid !== profileID &&
                    <>
                        {following ?
                            <button onClick={unfollowUser}>Unfollow</button>
                            :
                            <button onClick={followUser}>Follow</button>
                        }
                    </>
                }
                {items.length > 3 ? (
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
