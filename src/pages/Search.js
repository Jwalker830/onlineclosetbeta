import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, startAt, endAt } from "firebase/firestore";
import { db } from "../firebase-config";
import levenshtein from "fast-levenshtein";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

function Search() {
    const [search, setSearch] = useState("");
    const [profiles, setProfiles] = useState([]);
    const [searched, setSearched] = useState(false)
    let navigate = useNavigate();

    const searchProfiles = async () => {
        setSearched(false);
        if (search.trim() === "") {
            setProfiles([]);
            return;
        }

        try {
            const usersRef = collection(db, "users");

            // Firestore query to get names that start with the search term
            const q = query(
                usersRef,
                where("name", ">=", search),
                where("name", "<=", search + '\uf8ff')
            );

            const usersSnapshot = await getDocs(q);
            const allUsers = usersSnapshot.docs.map(doc => ({
                ...doc.data()
            }));

            // Levenshtein distance sorting
            const rankedProfiles = allUsers
                .map(user => ({
                    ...user,
                    similarity: levenshtein.get(search.toLowerCase(), user.name.toLowerCase())
                }))
                .sort((a, b) => a.similarity - b.similarity);

            setSearched(true);
            setProfiles(rankedProfiles);
        } catch (error) {
            console.error("Error searching profiles:", error);
        }
    };
    
    useEffect(() => {
        searchProfiles();
    }, [search])

    const loadProfile = (selected) => {
        navigate(`/profile/${selected}`);
    }

    return (
        <div className="searchPage">
            <div className="searchBar">
                <input
                    type="text"
                    id="searchQuery"
                    name="query"
                    placeholder="Search for a profile..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={searchProfiles}>
                    <FaSearch />
                </button>
            </div>
            <div className="profileResults">
                {profiles.length > 0 ? (
                    profiles.map(profile => (
                        <div onClick={() => {loadProfile(profile.id)}} key={profile.id} className="result">
                            <p>{profile.name}</p>
                        </div>
                    ))
                ) : (
                    <>
                    {searched ?
                        <p className="noResults">No profiles found</p>  
                    :
                        <>
                        </>
                    }
                    </>
                )}
            </div>
        </div>
    );
}

export default Search;
