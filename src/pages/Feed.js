import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import DisplayFit from "./DisplayFit";

function Feed({ isAuth }) {
    const [following, setFollowing] = useState([]);
    const [feed, setFeed] = useState([]);
    const [sortedFeed, setSortedFeed] = useState([]);

    // Fetch user data and set the following list
    const isFollowing = async () => {
        try {
            if (!auth.currentUser) {
                console.error("No user is currently authenticated.");
                return;
            }

            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.following) {
                setFollowing(userData.following);
            }

            if (userData.actions) {
                const userActions = userData.actions.map((action) => ({
                    action,
                    name: userData.name
                }));
                setFeed((prevFeed) => [...prevFeed, ...userActions]); // Add user’s actions to the feed
            }

        } catch (error) {
            console.error("Error checking following status:", error);
        }
    };

    // Fetch the feed based on the following users
    const getFeed = async () => {
        try {
            let userActions = {};

            if (!auth.currentUser) {
                console.error("No user is currently authenticated.");
                return;
            }

            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.following) {
                setFollowing(userData.following);
            }

            if (userData.actions) {
                userActions = userData.actions.map((action) => ({
                    action,
                    name: userData.name
                }));
                setFeed((prevFeed) => [...prevFeed, ...userActions]); // Add user’s actions to the feed
            }

            const usersRef = collection(db, "users");
            const promises = following.map(async (profileID) => {
                const q = query(usersRef, where("id", "==", profileID));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0].data();
                    if (userDoc.actions) {
                        console.log(userDoc)
                        return userDoc.actions.map(action => ({
                            action,
                            name: userDoc.name
                        }));
                    }
                }
                return [];
            });

            const actionsFromAll = await Promise.all(promises); // Wait for all promises to resolve
            const flatActions = actionsFromAll.flat(); // Flatten the nested arrays into a single array
            setFeed((prev) => [...prev, ...flatActions, ...userActions]); // Spread the previous feed and add the new actions

        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };

    // Sort feed when it's updated
    useEffect(() => {
        if (feed.length > 0) {
            const sorted = feed
                .filter((item) => item.action && item.action.time) // Ensure action and date exist
                .sort((a, b) => new Date(a.action.time) - new Date(b.action.time)); // Sort by date
            console.log(feed);
            setSortedFeed(sorted);
        }
    }, [feed]);

    // Fetch the feed whenever `isAuth` changes
    useEffect(() => {
        if (isAuth) {
            getFeed();
        }
    }, [isAuth]);

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
                <p>Loading...</p>
            )}
        </div>
    );
}

export default Feed;