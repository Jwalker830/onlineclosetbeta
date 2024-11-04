import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import DisplayFit from "./DisplayFit";

function Feed({ isAuth, profileID }) {
    const [following, setFollowing] = useState([]);
    const [feed, setFeed] = useState([]);
    const [sortedFeed, setSortedFeed] = useState([]);
    const [checked, setChecked] = useState(false);

    // Fetch the feed based on the following users
    const getFeed = async () => {
        try {
            if (!auth.currentUser) {
                console.error("No user is currently authenticated.");
                return;
            }

            // Get the current user's data
            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Collect the user's own actions
            let userActions = [];
            if (userData.actions) {
                userActions = userData.actions.map((action) => ({
                    action,
                    name: userData.name
                }));
            }

            // Fetch actions from users in the 'following' list
            const followingList = userData.following || [];
            const usersRef = collection(db, "users");

            const promises = followingList.map(async (profileID) => {
                const q = query(usersRef, where("id", "==", profileID));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const followedUser = querySnapshot.docs[0].data();
                    if (followedUser.actions) {
                        return followedUser.actions.map(action => ({
                            action,
                            name: followedUser.name
                        }));
                    }
                }
                return [];
            });

            // Wait for all actions from followed users to be retrieved
            const actionsFromAll = await Promise.all(promises);
            const flatActions = actionsFromAll.flat();

            setChecked(true);
            setFeed([...userActions, ...flatActions]);

        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };

    const getUserFeed = async () => {
        try {

            // Get the current user's data
            const q = query(collection(db, "users"), where("id", "==", profileID));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            let userActions = [];
            if (userData.actions) {
                userActions = userData.actions.map((action) => ({
                    action,
                    name: userData.name
                }));
            }

            setChecked(true);

            if (userActions.length > 0) {
                setFeed(userActions);
            }

        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };


    // Sort feed when it's updated
    useEffect(() => {
        if (feed.length > 0) {
            const sorted = feed
                .filter((item) => item.action && item.action.time) // Ensure action and date exist
                .sort((a, b) => new Date(b.action.time) - new Date(a.action.time)); // Sort by date
            console.log(feed);
            setSortedFeed(sorted);
        }
    }, [feed]);

    useEffect(() => {
        if (profileID) {
            setFeed([]);
            setSortedFeed([]);
            getUserFeed();
        } else if (isAuth && !profileID) {
            setFeed([]);
            setSortedFeed([]);
            getFeed();
        }
    }, [isAuth, profileID]);

    return (
        <div className="feedContainer">
            {sortedFeed.length > 0 ? (
                <div className="feed">
                    {sortedFeed.map((actionObj, index) => {
                        const action = actionObj.action;
                        if (action.type === "fit") {
                            return (
                                <div className="actionContainer" key={index}>
                                    <p>{actionObj.name} logged an outfit!</p>
                                    <DisplayFit curFit={JSON.parse(action.content)} />
                                </div>
                            );
                        } else {
                            return null;
                        }
                    })}
                </div>
            ) : (
                    <>
                        {
                            checked ?
                                <>
                                    {
                                        feed.length <= 0 && <p>No Actions to Show</p>
                                    }
                                </>
                                :
                                <p>Loading...</p>
                        }
                    </>
            )}
        </div>
    );
}

export default Feed;