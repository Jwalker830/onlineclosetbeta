import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs, getDoc, doc } from "firebase/firestore";
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import DisplayFit from './DisplayFit';
import GetUserItems from './GetUserItems';

const nlp = winkNLP(model);

const MatchFit = () => {
    const { fitcode } = useParams();
    const [originalFit, setOriginalFit] = useState(null);
    const [userItems, setUserItems] = useState([]);
    const [itemTags, setItemTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchedFits, setMatchedFits] = useState([]);

    useEffect(() => {
        if (auth.currentUser && fitcode) {
            console.log(fitcode)
            getUserData();
            getUserItems();
        } else {
            setLoading(false);
        }
    }, [fitcode]);


    const updateUserItems = (items) => {
        console.log("Updating user items in MatchFit:", items);
        setUserItems(items);
    }

    const getUserData = async () => {
        try {
            // Get user's itemTags
            const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userSnap.exists()) {
                console.log("User data:", userSnap.data().itemTags);
                setItemTags(userSnap.data().itemTags || []);
            }
        } catch (error) {
            console.error("Error getting user data:", error);
        }
    };

    const getUserItems = async () => {
        try {
            console.log("getting items");

            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);
            const itemsSet = new Set();

            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                await Promise.all(userData.items.map(async (item) => {
                    const b = query(collection(db, "clothing"), where("id", "==", item.id));
                    const data = await getDocs(b);
                    data.forEach((doc) => {
                        itemsSet.add(doc.data());
                    });
                }));
            }));

            setUserItems(Array.from(itemsSet));
        } catch (error) {
            console.error("Error getting user data:", error);
        }
    };

    const getFitFromCode = async (code) => {
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
            let curID = code.substr(i * 10, 10);

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

        let accs = code.substring(52, code.length - 2);
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

        return outfit;
    };

    const findBestMatch = (tag, tagList) => {
        let bestMatch = { target: null, rating: 0 };
        tagList.forEach(candidate => {
            const doc1 = nlp.readDoc(tag);
            const doc2 = nlp.readDoc(candidate);
            const similarity = doc1.out(nlp.its.similarity, doc2);
            if (similarity > bestMatch.rating) {
                bestMatch = { target: candidate, rating: similarity };
            }
        });
        return { bestMatch };
    };

    const findSimilarTags = (fitTags) => {
        console.log("Relating tags from fitTags:", fitTags);
        const similarTags = new Set();
        fitTags.forEach(tag => {
            if (itemTags.includes(tag)) {
                console.log(`Direct match for tag "${tag}"`);
                similarTags.add(tag);
            } else {
                // Find best match
                const result = findBestMatch(tag, itemTags);
                console.log(`Best match for "${tag}": "${result.bestMatch.target}" with rating ${result.bestMatch.rating}`);
                if (result.bestMatch.rating > 0.6) { // Threshold for similarity
                    similarTags.add(result.bestMatch.target);
                } else {
                    console.log(`No good match for "${tag}", skipping`);
                }
            }
        });
        return Array.from(similarTags);
    };

    const generateMatchedFit = (similarTags, userItems) => {
        console.log("Generating matched fit with similarTags:", similarTags);
        // Similar to GenerateFit: expand tags from items that match similarTags
        let curTags = new Set(similarTags);
        let curItems = userItems.filter(item => item.tags && item.tags.some(tag => similarTags.includes(tag)));
        curItems.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => curTags.add(tag));
            }
        });
        console.log("Expanded curTags after adding related item tags:", Array.from(curTags));

        // Score all items based on curTags, similar to GenerateFit
        const scoredItems = userItems.map(item => {
            let score = 0;
            if (item.tags) {
                item.tags.forEach(tag => {
                    if (curTags.has(tag)) {
                        score += 5;
                    } else {
                        score -= 1;
                    }
                });
            }
            return { ...item, score: score / (item.tags?.length || 1) };
        }).filter(item => item.score > 0.3); // Threshold like in GenerateFit

        console.log("Scored items count:", scoredItems.length);

        // Sort by type and score
        const sortedItems = {
            hats: scoredItems.filter(i => i.type === "Hat").sort((a, b) => b.score - a.score),
            jackets: scoredItems.filter(i => i.type === "Jacket").sort((a, b) => b.score - a.score),
            tops: scoredItems.filter(i => i.type === "Top").sort((a, b) => b.score - a.score),
            bottoms: scoredItems.filter(i => i.type === "Bottoms").sort((a, b) => b.score - a.score),
            shoes: scoredItems.filter(i => i.type === "Shoes").sort((a, b) => b.score - a.score),
            accessories: scoredItems.filter(i => i.type === "Accessory").sort((a, b) => b.score - a.score)
        };

        // Pick the highest scoring item for each category
        const fit = {
            hat: sortedItems.hats[0] || null,
            jacket: sortedItems.jackets[0] || null,
            top: sortedItems.tops[0] || null,
            bottom: sortedItems.bottoms[0] || null,
            shoe: sortedItems.shoes[0] || null,
            accessories: sortedItems.accessories.slice(0, 2) // Up to 2 highest scoring accessories
        };

        console.log("Generated matched fit:", fit);
        return fit;
    };

    useEffect(() => {
        console.log("Item tags or user items updated, attempting to match fit...");
        console.log(itemTags);
        console.log(userItems);
        console.log(fitcode);
        if (itemTags.length > 0 && userItems.length > 0 && fitcode) {
            matchFits();
        }
    }, [itemTags, userItems, fitcode]);

    const matchFits = async () => {
        try {
            const originalFit = await getFitFromCode(fitcode);
            setOriginalFit(originalFit);
            const fitTags = [];
            Object.values(originalFit).forEach(item => {
                if (item && item.tags) {
                    if (Array.isArray(item.tags)) {
                        fitTags.push(...item.tags);
                    }
                }
            });
            const uniqueFitTags = [...new Set(fitTags)];
            console.log("Tags from the outfit to be matched with:", uniqueFitTags);

            const similarTags = findSimilarTags(uniqueFitTags);
            console.log("Similar tags found:", similarTags);

            // Generate 5 different fits
            const fits = [];
            for (let i = 0; i < 5; i++) {
                // Shuffle userItems for variety
                const shuffledItems = [...userItems].sort(() => Math.random() - 0.5);
                fits.push(generateMatchedFit(similarTags, shuffledItems));
            }
            setMatchedFits(fits);
        } catch (error) {
            console.error("Error matching fit:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <p>Loading matched fit...</p>;
    }

    if (!auth.currentUser) {
        return <p>Please log in to match fits with your closet.</p>;
    }

    if (!matchedFits.length) {
        return <p>No matching fits found.</p>;
    }

    return (
        <div>
            {userItems.length > 0 && (
                <div>
                    <h2>Original & Matched Outfit Ideas</h2>
                    <button onClick={matchFits} className="rerollButton">Reroll Outfits</button>
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
                        <div style={{ width: "200px", border: "2px solid #007bff", padding: "10px", borderRadius: "8px", background: "#f0f8ff" }}>
                            <h3>Original Outfit</h3>
                            <DisplayFit fit={originalFit} />
                        </div>
                        {matchedFits.map((fit, idx) => (
                            <div key={idx} style={{ width: "160px", border: "1px solid #ccc", padding: "10px", borderRadius: "8px", background: "#fff" }}>
                                <h3>Idea {idx + 1}</h3>
                                <DisplayFit fit={fit} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchFit;