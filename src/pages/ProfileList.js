import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import { useNavigate } from "react-router-dom";

function ProfileList({ setNewProfile, profiles }) {
    let [userObjs, setUserObjs] = useState([]);
    let navigate = useNavigate();

    const getProfiles = async () => {
        try {
            const usersRef = collection(db, "users");
            const fetchedProfiles = [];

            for (let profileID of profiles) {
                const q = query(usersRef, where("id", "==", profileID));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const user = querySnapshot.docs[0].data();
                    fetchedProfiles.push(user);
                }
            }

            setUserObjs(fetchedProfiles); // Set state once after all profiles are fetched
        } catch (error) {
            console.error("Error fetching profiles:", error);
        }
    };

    useEffect(() => {
        if (profiles.length > 0) {
            getProfiles();
        }
    }, [profiles]);

    useEffect(() => {
        console.log(userObjs);
    }, [userObjs]);

    const loadProfile = (selected) => {
        navigate(`/profile/${selected}`);
    };

    return (
        <div className="profileListContainer">
            <div className="profileResults">
                {userObjs.length > 0 ? (
                    userObjs.map((user) => (
                        <div onClick={() => setNewProfile(user.id)} key={user.id} className="result">
                            <p>{user.name}</p>
                        </div>
                    ))
                ) : (
                    <p>No profiles found</p>
                )}
            </div>
        </div>
    );
}

export default ProfileList;
