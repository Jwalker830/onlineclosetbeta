import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs, updateDoc } from "firebase/firestore";

// Reusable function to update stats
export const updateStatsLogic = async (id) => {
    let favs = [];
    let logs = [];

    const getFitFromCode = async (outfitID) => {
        const outfit = {
            hat: null,
            jacket: null,
            top: null,
            bottom: null,
            shoe: null,
            accessories: [],
        };
        let cats = Object.keys(outfit);
        for (let i = 0; i < 5; i++) {
            let curID = outfitID.substr(i * 10, 10);

            if (curID === "0000000000") {
                curID = "000";
            }
            if (curID === "0000000001") {
                curID = "001";
            }

            const b = query(collection(db, "clothing"), where("id", "==", curID));
            const data = await getDocs(b);
            data.forEach((doc) => {
                outfit[cats[i]] = doc.data();
            });
        }

        let accs = outfitID.substring(52, outfitID.length - 2);
        console.log("accs", accs);

        for (let i = 0; i < accs.length / 10; i++) {
            let curID = accs.substr(i * 10, 10);

            if (curID === "0000000002") {
                curID = "002";
            }

            const b = query(collection(db, "clothing"), where("id", "==", curID));
            const data = await getDocs(b);
            data.forEach((doc) => {
                outfit.accessories.push(doc.data());
            });
        }

        return (outfit);

    }

    const getItems = async () => {
        try {
            if (!auth.currentUser) {
                console.error("User is not loaded");
                return;
            }

            const q = query(collection(db, "users"), where("id", "==", id));
            const querySnapshot = await getDocs(q);
            const fitSet = new Set();
            const logSet = new Set();

            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();

                // Process favFits
                await Promise.all(userData.favFits.map(async (fit) => {
                    try {
                        fitSet.add(await getFitFromCode(fit));
                    } catch (error) {
                        console.error('Error parsing accessories:', error);
                    }
                }));
                favs = Array.from(fitSet);
            }));

            const b = query(collection(db, "feed"), where("user", "==", id));
            const buerySnapshot = await getDocs(b);

            await Promise.all(buerySnapshot.docs.map(async (logDoc) => {
                const logData = logDoc.data();

                // Process favFits
                await Promise.all(logData.map(async (log) => {
                    try {
                        logSet.add(await getFitFromCode(log.fitCode));
                    } catch (error) {
                        console.error('Error parsing accessories:', error);
                    }
                }));
                favs = Array.from(fitSet);
            }));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    const getFavItems = () => {
        let items = {
            hats: [],
            jackets: [],
            tops: [],
            bottoms: [],
            shoes: [],
            accessories: []
        };

        // Helper function to process an array of outfits
        const processOutfits = (outfits) => {
            outfits.forEach((outfit) => {
                // Check each item in the outfit
                const itemTypes = ['hat', 'jacket', 'top', 'bottom', 'shoe', 'accessories'];
                itemTypes.forEach((type) => {
                    if (outfit[type]) {
                        // Handle accessories (array) separately
                        if (type === 'accessories') {
                            if (outfit[type].length > 0) {
                                outfit[type].forEach((accessory) => {
                                    updateItemCount(accessory, 'accessories');
                                });
                            }
                        } else {
                            updateItemCount(outfit[type], type);
                        }
                    }
                });
            });
        };

        // Helper function to update the count of an item in the items object
        const updateItemCount = (item, type) => {
            const itemId = item.id;
            const itemName = item.title;
            const category = type === 'accessories' ? 'accessories' : `${type}s`; // Pluralize the type

            // Find if the item already exists in the category
            const existingItem = items[category].find(([name, _, id]) => id === itemId);

            if (existingItem) {
                // Increment the count if the item exists
                existingItem[1]++;
            } else {
                // Add the item to the category if it doesn't exist
                items[category].push([itemName, 1, itemId]);
            }
        };

        // Process both favs and logs arrays
        processOutfits(favs);
        processOutfits(logs);

        // Sort each category by count in descending order
        for (const category in items) {
            items[category].sort((a, b) => b[1] - a[1]);
        }

        return items;
    };

    // Fetch items and process them
    await getItems();

    // Get the favorite items and return the result
    const result = getFavItems();
    console.log(result); // Log the result to the console

    try {
        const q = query(collection(db, "users"), where("id", "==", id));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
            await updateDoc(doc.ref, {
                wearStats: JSON.stringify(result) // Store result as a JSON string
            });
        });
        console.log("updated Stats");
    } catch (error) {
        console.error("Error updating stats: ", error);
    }

    return result;
};

export default updateStatsLogic;