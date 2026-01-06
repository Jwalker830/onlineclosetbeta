import React, { useState, useEffect } from 'react';
import { arrayUnion, arrayRemove, updateDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import { useNavigate } from "react-router-dom";

const DisplayFit = ({ fit, fitCode, removeFit, width, curUser }) => {
    const [isFav, setIsFav] = useState(false);
    const [isCurUser, setIsCurUser] = useState(curUser);
    const [onMobile, setOnMobile] = useState(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });
    const [displayFitCode, setDisplayFitCode] = useState("");
    const [curFit, setCurFit] = useState(null);

    let navigate = useNavigate();

    // Fetch the outfit if fitCode is passed or use the fit provided.
    useEffect(() => {
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
                if (curID === "0000000000") curID = "000";
                if (curID === "0000000001") curID = "001";

                const b = query(collection(db, "clothing"), where("id", "==", curID));
                const data = await getDocs(b);
                data.forEach((doc) => {
                    outfit[cats[i]] = doc.data();
                });
            }

            let accs = outfitID.substring(52, outfitID.length - 2);

            for (let i = 0; i < accs.length / 10; i++) {
                let curID = accs.substr(i * 10, 10);
                if (curID === "0000000002") curID = "002";

                const b = query(collection(db, "clothing"), where("id", "==", curID));
                const data = await getDocs(b);
                data.forEach((doc) => {
                    outfit.accessories.push(doc.data());
                });
            }

            return outfit;
        };

        const fetchFit = async () => {
            let finalFit = null;
            if (!fit && fitCode) {
                finalFit = await getFitFromCode(fitCode);
            } else if (fit) {
                finalFit = fit;
            }
            if (finalFit) {
                setCurFit(finalFit);
            }
        };

        fetchFit();
    }, [fit, fitCode]);

    // Generate the displayFitCode after curFit is available
    useEffect(() => {
        const genFitCode = () => {
            if (!curFit) return "";
            let code = "";
            let keys = Object.keys(curFit);
            keys.forEach((key) => {
                const item = curFit[key];
                if (key === "accessories" && Array.isArray(item) && item.length > 0) {
                    code += "--";
                    item.forEach((obj) => {
                        if (obj.id) {
                            code += (obj.id.length < 10 ? "0000000" + obj.id : obj.id);
                        } else {
                            console.error(`Missing id in Accessories object:`, obj);
                        }
                    });
                    code += "--";
                } else if (key === "accessories" && Array.isArray(item) && item.length === 0) {
                    code += "----";
                }
                if (item && item.id && key !== "accessories") {
                    code += (item.id.length < 10 ? "0000000" + item.id : item.id);
                } else if (key !== "accessories") {
                    console.error(`Invalid or missing 'id' for key '${key}':`, item);
                }
            });
            return code;
        };

        if (curFit) {
            const newFitCode = genFitCode();
            setDisplayFitCode(newFitCode);
        }
    }, [curFit]);

    // Separate useEffect to check if the fit is a favorite when displayFitCode updates.
    useEffect(() => {
        const checkIfFavorite = async () => {
            if (!displayFitCode) return;
            try {
                const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
                const querySnapshot = await getDocs(q);
                let favorite = false;
                querySnapshot.forEach((doc) => {
                    const favFits = doc.data().favFits || [];
                    favFits.forEach((fit) => {
                        // Compare using the newly generated displayFitCode
                        if (fit === displayFitCode) {
                            favorite = true;
                        }
                    });
                });
                setIsFav(favorite);
            } catch (error) {
                console.error("Error checking favorite status: ", error);
            }
        };
        checkIfFavorite();
    }, [displayFitCode]);

    const setFav = async () => {
        if (!isFav) {
            try {
                const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (docSnap) => {
                    await updateDoc(docSnap.ref, {
                        favFits: arrayUnion(displayFitCode)
                    });
                    setIsFav(true);
                });
            } catch (error) {
                console.error("Error setting favorite status: ", error);
            }
        } else {
            try {
                setIsFav(false);
                if (removeFit) removeFit(curFit);
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    favFits: arrayRemove(displayFitCode)
                });
            } catch (error) {
                console.error("Error removing favorite status: ", error);
            }
        }
    };

    const viewFit = () => {
        console.log(displayFitCode);
        navigate("/" + displayFitCode);
    };

    return (
        <div className='fitContainerWStar' style={{ flexDirection: onMobile ? "row" : "column" }}>
            {curFit !== null ? (
                <>
                    <div className={`fitContainer ${onMobile && 'mobile'}`} onClick={viewFit}>
                        {curFit.hat && curFit.hat.id !== "001" && (
                            <div className='hatPic fitImgContainer'>
                                <img key={curFit.hat.id} src={curFit.hat.imgURL} alt="hat" className='fitImg' style={{ zIndex: '2' }} />
                            </div>
                        )}
                        {curFit.jacket && curFit.jacket.id !== "000" && (
                            <div className='jacketPic fitImgContainer'>
                                <img key={curFit.jacket.id} src={curFit.jacket.imgURL} alt="jacket" className='fitImg' style={{ zIndex: '1' }} />
                            </div>
                        )}
                        {curFit.top && (
                            <div className='topPic fitImgContainer'>
                                <img key={curFit.top.id} src={curFit.top.imgURL} alt="top" className='fitImg' style={{ zIndex: '3' }} />
                            </div>
                        )}
                        {curFit.accessories && Array.isArray(curFit.accessories) && curFit.accessories.length > 0 && (
                            <div className='accessoryPic'>
                                {curFit.accessories.map((acc, index) => {
                                    if (acc.id !== "002") {
                                        return (
                                            <img
                                                key={acc.id}
                                                src={acc.imgURL}
                                                alt="accessory"
                                                style={{
                                                    zIndex: index + 5,
                                                    transform: `translateX(${50 + (index * 30)}%) translateY(${-20 + (index * 10)}%)`
                                                }}
                                            />
                                        )
                                    } else {
                                        return <div key={index} style={{ width: "50%", height: "auto" }}></div>;
                                    }
                                })}
                            </div>
                        )}
                        {curFit.bottom && (
                            <div className='bottomPic fitImgContainer'>
                                <img key={curFit.bottom.id} src={curFit.bottom.imgURL} alt="bottom" className='fitImg' style={{ zIndex: '4' }} />
                            </div>
                        )}
                        {curFit.shoe && (
                            <div className='shoePic fitImgContainer'>
                                <img key={curFit.shoe.id} src={curFit.shoe.imgURL} alt="shoe" className='fitImg' style={{ zIndex: '5' }} />
                            </div>
                        )}
                    </div>
                    <div className='favStar' onClick={setFav} style={{ paddingLeft: onMobile ? "20px" : "0px" }}>
                        {isCurUser && (isFav ? "★" : "☆")}
                    </div>
                </>
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
};

export default DisplayFit;