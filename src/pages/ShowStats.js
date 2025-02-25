import React, { useState, useEffect } from "react";
import { doc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import { useNavigate } from "react-router-dom";
import DisplayFit from "./DisplayFit";

function ShowStats({ handleViewItem, id }) {
    const [stats, setStats] = useState(null);
    const [ideal, setIdeal] = useState(null);

    let navigate = useNavigate();

    // Fetch stats from Firestore
    const getStats = async () => {
        try {
            if (!id) {
                console.error("No id");
                return;
            }

            const q = query(collection(db, "users"), where("id", "==", id));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                if (userData.wearStats) {
                    setStats(JSON.parse(userData.wearStats)); // Parse the stats string into an object
                }
                else {
                    setStats("none");
                }
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // Fetch item details from Firestore and update stats
    const getItems = async () => {
        try {
            if (!stats) return; // Exit if stats is not loaded

            console.log("Getting items...");

            // Create a copy of the stats object to avoid mutating state directly
            const updatedStats = { ...stats };

            // Iterate through each category in stats
            for (const category in updatedStats) {
                const items = updatedStats[category];

                // Fetch item details for each item in the category
                const updatedItems = await Promise.all(
                    items.map(async ([name, count, itemId]) => {
                        // Fetch the item details from Firestore using the itemId
                        const q = query(collection(db, "clothing"), where("id", "==", itemId));
                        const itemSnapshot = await getDocs(q);

                        let itemData = null;
                        itemSnapshot.forEach((doc) => {
                            itemData = doc.data(); // Get the item data
                        });

                        // Return the updated tuple with the full item data
                        return [itemData, count];
                    })
                );

                // Update the category with the new items
                updatedStats[category] = updatedItems;
            }

            // Create ideal outfit based on stats
            let outfit = {
                hat: updatedStats.hats[Math.floor(Math.random() * 3)][0],
                jacket: updatedStats.jackets[Math.floor(Math.random() * 3)][0],
                top: updatedStats.tops[Math.floor(Math.random() * 3)][0],
                bottom: updatedStats.bottoms[Math.floor(Math.random() * 3)][0],
                shoe: updatedStats.shoes[Math.floor(Math.random() * 3)][0],
                accessories: [updatedStats.accessories[0][0], updatedStats.accessories[1][0], updatedStats.accessories[2][0]]
            };

            console.log("outfit", outfit);

            setIdeal(outfit);

            // Update the stats state with the new data
            setStats(updatedStats);
            console.log("Updated stats with item details:", updatedStats);
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    useEffect(() => {
        if (id) {
            console.log("Getting stats for: ", id)
            getStats(); // Fetch stats when the component mounts
        }
    }, [id]);

    useEffect(() => {
        if (stats) {
            getItems(); // Fetch item details when stats is updated
        }
    }, [stats]);

    return (
        <div className = "profileStatsContainer">
            <h1>Favorite Items</h1>
            {stats ? (
                <>
                    {stats !== "none" ? (
                        < div >
                    {
                        Object.keys(stats).map((category) => (
                            <div key={category}>
                                <h2>{category}</h2>
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "20px" }}>
                                    {stats[category]
                                        .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
                                        .slice(0, 3) // Take the top 3 items
                                        .map(([itemData, count], index) => (
                                            <li key={index} style={{ textAlign: "center" }}>
                                                {itemData && itemData.imgURL ? (
                                                    <img
                                                        src={itemData.imgURL}
                                                        alt={itemData.title}
                                                        style={{ width: "100px", borderRadius: "10px" }}
                                                        onClick={() => {
                                                            handleViewItem(itemData);
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ width: "100px", height: "100px", backgroundColor: "#ccc", borderRadius: "10px" }}>
                                                        No Image
                                                    </div>
                                                )}
                                                <p>
                                                    <strong>{itemData ? itemData.title : "Unknown Item"}</strong>
                                                    <br />
                                                    {count} Logs
                                                </p>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        ))
                    }
                            < h1 > Top Items Fit</h1>
            <DisplayFit curFit={ideal}></DisplayFit>
        </div>
                    ) : (
                    <p>Favorite/Log more outfits!</p>
                )} 
                </>
            ) : (
                <p>Loading stats...</p>
            )}
        </div>
    );
}

export default ShowStats;