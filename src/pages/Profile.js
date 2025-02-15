import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import GetUserItems from "./GetUserItems";
import ProfileList from "./ProfileList";
import { db, auth } from "../firebase-config";
import { useNavigate, useParams } from "react-router-dom";
import ViewField from "./ViewField";
import OutfitLog from "./OutfitLog";
import Feed from "./Feed";
import ShowStats from "./ShowStats";

function Profile({ isAuth }) {
    let navigate = useNavigate();
    const { profileId: paramProfileId } = useParams();
    const [profileId, setProfileId] = useState();
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
    const [editName, setEditName] = useState(false);
    const [curIndex, setCurIndex] = useState();
    const [tempName, setTempName] = useState();

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
        console.log("a");
    }, []);

    useEffect(() => {
        if (items.length > 0) {
            const s = sortPrefItems(items);
            setSortedItems(s);
        }
    }, [items]);

    useEffect(() => {
        setProfileId(paramProfileId || auth.currentUser?.uid);
    }, [paramProfileId]);

    useEffect(() => {
        if (auth.currentUser) {
            if (isAuth && profileId === auth.currentUser.uid) {
                navigate("/profile/" + auth.currentUser.uid);
            }
            if (auth.currentUser) {
                isFollowing();
            }
        }
        getProfile();
    }, [profileId]);

    const getProfile = async () => {
        const currentProfileId = profileId || auth.currentUser?.uid;

        if (currentProfileId) {
            try {
                const q = query(collection(db, "users"), where("id", "==", currentProfileId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const userData = userDoc.data();
                    setFollowerList(userData.followers);
                    setFollowingList(userData.following);
                    setProfile(userData);
                    setTempName(userData.name);
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
        ];

        return sorted;
    };

    const renderItems = (items, title) => (
        <div className='profileTypeContainer'>
            <div className='profileTypeTitle'>{title}</div>
            <div className={"typeDisplay"} style={{ display: "flex", flexWrap: "wrap" }}>
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

    const viewItems = (id) => {
        navigate(`/${id}`);
    };

    const followUser = async () => {
        await updateDoc(doc(db, "users", profileId), {
            followers: arrayUnion(auth.currentUser.uid)
        });
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            following: arrayUnion(profileId)
        });
        isFollowing();
    };

    const unfollowUser = async () => {
        await updateDoc(doc(db, "users", profileId), {
            followers: arrayRemove(auth.currentUser.uid)
        });
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            following: arrayRemove(profileId)
        });
        isFollowing();
    };

    const isFollowing = async () => {
        try {
            const q = query(collection(db, "users"), where("id", "==", profileId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            setFollowingList(userData.following);
            setFollowerList(userData.followers);
            setFollows(userData.following.includes(auth.currentUser.uid));
            setFollowing(userData.followers.includes(auth.currentUser.uid));
            setFriends(userData.following.includes(auth.currentUser.uid) && userData.followers.includes(auth.currentUser.uid));

        } catch (error) {
            console.error("Error checking following status:", error);
            setFollowing(false);
            setFollows(false);
        }
    };

    const toggleModal = (type) => {
        setModalType(type);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const setNewProfileID = (id) => {
        closeModal();
        navigate(`/profile/${id}`);
    };

    const handleViewItem = (item) => {
        setCurItem(item);
    };

    const handleEditName = async () => {
        if (editName) {
            const userRef = doc(db, 'users', profileId);
            await updateDoc(userRef, {
                name: tempName
            });
            setProfile({ ...profile, name: tempName });
            setEditName(false);
        }
        else {
            setEditName(true);
        }
    };

    return (
        <div className="profileContainer">
            {profile && !curItem ?
                <>
                    <GetUserItems setItemList={updateItemList} id={profileId} />
                    <div className="profileHeader">
                        {auth.currentUser && profileId === auth.currentUser.uid ?
                            <div className="namePlate">
                                {!editName ?
                                    <>
                                        <h1>{profile.name}</h1>
                                        <button onClick={handleEditName}>✏️</button>
                                    </>
                                    :
                                    <>
                                        <input type="text" id="name" name="name" placeholder="Display Name..." value={tempName} onChange={(e) => setTempName(e.target.value)} />
                                        <button onClick={handleEditName}>✔️</button>
                                    </>
                                }
                            </div>
                            :
                            <>
                                <h1>{profile.name}</h1>
                            </>
                        }
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
                    {auth.currentUser && auth.currentUser.uid !== profileId &&
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
                            <button onClick={() => { viewItems(profile.id)}}>View in Closet</button>
                        </div>
                    ) : (
                        <div>No Items</div>
                    )}

                    <ShowStats handleViewItem={handleViewItem} id = { profile.id }></ShowStats>
                </>
                :
                <>
                    {sortedItems.flat && curItem && profile && <ViewField item={curItem} setCurItem={updateCurItem} index={sortedItems.flat.indexOf(curItem)} itemArray={sortedItems.flat} setCurIndex={updateCurIndex} isOnMobile={onMobile} />}
                </>
            }

            {profile && !curItem &&
                <>
                    <h1>Outfit Log</h1>
                    <OutfitLog profileID={profile.id} />
                    <br></br>
                    <Feed profileID={profile.id} />
                </>
            }

            {showModal && modalType !== "" && (
                <div className="modalOverlay">
                    <div className="modalContent">
                        <button className="closeModal" onClick={closeModal}>X</button>
                        <ProfileList profiles={modalType === "follower" ? followerList : followingList} setNewProfile={setNewProfileID} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;
