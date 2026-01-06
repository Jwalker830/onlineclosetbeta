import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs } from "firebase/firestore";
import { updateStatsLogic } from './UpdateStats';
import DisplayFit from './DisplayFit';

const FavFits = ({ isAuth }) => {
    const [favFits, setFavFits] = useState([]);
    const [codes, setCodes] = useState([]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                getFits();
            }
        });    
        return () => unsubscribe();
    }, []);

    const genFitCode = async (curFit) => {
        if (!curFit) return;
        let fitCode = "";
        console.log("curFit:", curFit);
        let keys = Object.keys(curFit);

        keys.forEach((key) => {
            const item = curFit[key];

            if (key === "accessories" && Array.isArray(item) && item.length > 0) {
                fitCode += "--";
                item.forEach((obj) => {
                    if (obj.id) {
                        if (obj.id.length < 10) {
                            fitCode += ("0000000" + obj.id);
                        } else {
                            fitCode += obj.id;
                        }
                    } else {
                        console.error(`Missing id in Accessories object:`, obj);
                    }
                });
                fitCode += "--";
            } else if (key === "accessories" && Array.isArray(item) && item.length === 0) {
                fitCode += "----";
            }

            if (item && item.id && key !== "accessories") {
                if (item.id.length < 10) {
                    fitCode += ("0000000" + item.id);
                } else {
                    fitCode += item.id;
                }
            } else {
                console.error(`Invalid or missing 'id' for key '${key}':`, item);
            }
        });

        console.log("Generated fitCode:", fitCode);
        return (fitCode);
    };

    const getFits = async () => {
        try {
            if (!auth.currentUser) {
                console.error("User is not loaded");
                return;
            }

            updateStatsLogic(auth.currentUser.uid);

            const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);
            const fitSet = new Set();
    
            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                await Promise.all(userData.favFits.map(async (fit) => {
                    try {
                        fitSet.add(await getFitFromCode(fit));
                    } catch (error) {
                        console.error('Error:', error);
                    }
                }));
            }));

            let fits = Array.from(fitSet);
            let fitsWithCodes = await Promise.all(fits.map(async f => ({ ...f, code: await genFitCode(f) })));
            setFavFits(fitsWithCodes);

        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };    

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

    const handleRemoveFit = (fit) => {
        setFavFits((prevItems) => prevItems.filter((f) => f.code !== fit.code));
    }

    return (
        <div>
            {favFits.length > 0 ? (
                <div className='favFitsContainer'>
                    {favFits.map((fit) => (
                        <DisplayFit key={fit.code} removeFit={handleRemoveFit} fit={fit} curUser={true}/>
                    ))}
                </div>
            ) : (
                <>
                    <h2>No favorite outfits...</h2>
                </>
            )}
        </div>
    );
};

export default FavFits;
