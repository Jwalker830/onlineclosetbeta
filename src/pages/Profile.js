import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import GetUserItems from "./GetUserItems";
import ProfileList from "./ProfileList";
import { db, auth } from "../firebase-config";
import { useNavigate } from "react-router-dom";
import ViewField from "./ViewField";

function Profile() {
    let navigate = useNavigate();
    const [profileID, setProfileID] = useState(() => {
        if(localStorage.getItem("profile")){
            return JSON.parse(localStorage.getItem("profile"));
        }
        return null;
    });
    const [profile, setProfile] = useState();
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
    const [followingList, setFollowingList] = useState([]);
    const [followerList, setFollowerList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [curItem, setCurItem] = useState();
    const [onMobile, setOnMobile] = useState(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });
    
    const [curIndex, setCurIndex] = useState();

    const updateCurIndex = (newIndex) => {
        setCurIndex(newIndex);
    };

    const updateCurItem = (item) => {
        setCurItem(item);
    };

    const updateItemList = (newItemList) => {
        setItems(newItemList);
    };

    useEffect(() => {
        if (items.length > 0) {
            const s = sortPrefItems(items);
            setSortedItems(s);
        }
    }, [items]);

    useEffect(() => {
        localStorage.removeItem("profile");
        if(localStorage.getItem("isAuth")){
            isFollowing();
        }
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
                    const userDoc = querySnapshot.docs[0];
                    const userData = userDoc.data();
                    console.log(userData);
                    setFollowerList(userData.followers);
                    setFollowingList(userData.following);
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
            flat: []
        };

        sorted.hats = items.filter(item => item.type === "Hat" && item.title !== "No Hat");
        sorted.jackets = items.filter(item => item.type === "Jacket" && item.title !== "No Jacket");
        sorted.tops = items.filter(item => item.type === "Top");
        sorted.bottoms = items.filter(item => item.type === "Bottoms");
        sorted.shoes = items.filter(item => item.type === "Shoes");
        sorted.accessories = items.filter(item => item.type === "Accessory" && item.title !== "No Accessory");
        sorted.other = items.filter(item => item.type === "");
        sorted.flat = [            
            ...sorted.hats,
            ...sorted.jackets,
            ...sorted.tops,
            ...sorted.bottoms,
            ...sorted.shoes,
            ...sorted.accessories,
            ...sorted.other
        ]

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
                        onClick={() => {
                            handleViewItem(item);
                        }}
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
            let uFollow = false;
            let iFollow = false;
            const q = query(collection(db, "users"), where("id", "==", profileID));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }
    
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
    
            if(userData.following){
                setFollowingList(userData.following);
                if (userData.following.includes(auth.currentUser.uid)) {
                    setFollows(true);
                    uFollow = true;
                } else {
                    setFollows(false);
                    uFollow = false;
                }
            }
            if(userData.followers){
                setFollowerList(userData.followers);
                if (userData.followers.includes(auth.currentUser.uid)) {
                    setFollowing(true);
                    iFollow = true;
                } else {
                    setFollowing(false);
                    iFollow = false;
                }
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

    const toggleModal = (type) => {
        setModalType(type)
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const setNewProfileID = (id) => {
        closeModal();
        setProfileID(id)
    }

    const handleViewItem = (item) => {
        setCurItem(item);
    }

    return (
        <div className="profileContainer">
        {profile && !curItem ?
            <>
                <GetUserItems setItemList={updateItemList} id={profileID}/>
                <div className="profileHeader">
                    <h1>{profile.name}</h1>
                    <div className="profileFollowers profileCount" onClick={() => toggleModal("follower")}>
                        <h2>Followers</h2>
                        {followerList && followerList.length >= 0 ?

                        <h3>{followerList.length}</h3>
                        :
                        <h3>0</h3>
                    }
                    </div>
                    <div className="profileFollowing profileCount" onClick={() => toggleModal("following")}>
                        <h2>Following</h2>
                        {followingList && followingList.length >= 0 ?
                        
                        <h3>{followingList.length}</h3>
                        :
                        <h3>0</h3>
                    }
                    </div>
                </div>
                <>{(follows && !friends) && <h3>Follows you</h3>}</>
                <>{friends && <h3>Friends</h3>}</>
                {auth.currentUser && auth.currentUser.uid !== profileID &&
                    <>
                        {following !== null &&
                            <button onClick={following ? unfollowUser : followUser}>{following ? "Unfollow" : "Follow"}</button>
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
            :
            <>
                {sortedItems.flat && curItem && profile && <ViewField item={curItem} setCurItem={updateCurItem} index={sortedItems.flat.indexOf(curItem)} itemArray={sortedItems.flat} setCurIndex={updateCurIndex} isOnMobile={onMobile}/>}
            </>
        }

        {showModal && modalType !== "" && (
            <div className="modalOverlay">
                <div className="modalContent">
                    <button className="closeModal" onClick={closeModal}>X</button>
                    <ProfileList profiles={modalType === "follower" ? followerList : followingList} setNewProfile={setNewProfileID}/>
                </div>
            </div>
        )}
    </div>
    );
}

export default Profile;
