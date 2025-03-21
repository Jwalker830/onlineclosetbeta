import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import FeedCell from "./FeedCell"

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

            // Get the current user's actions
            const q = query(collection(db, "feed"), where("user", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);

            let userActions = querySnapshot.docs.map((action) => ({
                ...action.data()
            }));

            const usersRef = collection(db, "users");

            // Get the following list for the current user
            const b = query(usersRef, where("id", "==", auth.currentUser.uid));
            const buerySnapshot = await getDocs(b);

            if (buerySnapshot.empty) {
                console.error("No following list found for the current user.");
                return;
            }

            const userData = buerySnapshot.docs[0].data();
            const followingList = userData.following || [];

            if (followingList.length === 0) {
                setFeed(userActions);
                setChecked(true);
                return;
            }

            // Fetch actions from all followed users in a single query using 'in'
            const followActionsQuery = query(collection(db, "feed"), where("user", "in", followingList));
            const followActionsSnapshot = await getDocs(followActionsQuery);

            const followActions = followActionsSnapshot.docs.map((action) => ({
                ...action.data()
            }));

            setChecked(true);
            setFeed([...userActions, ...followActions]);

        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };


    const getUserFeed = async () => {
        try {
            const q = query(collection(db, "feed"), where("user", "==", profileID));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.error("No user document found");
                return;
            }

            const userActions = querySnapshot.docs.map((action) => ({
                ...action.data()
            }));

            setChecked(true);
            setFeed(userActions);

        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };



    // Sort feed when it's updated
    useEffect(() => {
        console.log(feed);
        if (feed.length > 0) {
            const sorted = feed
                .filter((item) => item.loggedFor && item.loggedOn) // Ensure action and date exist
                .sort((a, b) => new Date(b.loggedOn) - new Date(a.loggedOn)); // Sort by date
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
                        return (<FeedCell action={actionObj} index={index} />);
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