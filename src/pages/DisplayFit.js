import React, { useState, useEffect } from 'react';
import { arrayUnion, arrayRemove, updateDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth, provider} from "../firebase-config";
import { useNavigate } from "react-router-dom";

const DisplayFit = ({ curFit, removeFit, width, curUser }) => {
    const [isFav, setIsFav] = useState(false);
    const [isCurUser, setIsCurUser] = useState(curUser);
    const [onMobile, setOnMobile] = useState(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      });
    const [displayFitCode, setDisplayFitCode] = useState("");
      
    useEffect(() => {
        console.log(isCurUser);
    }, [isCurUser])

    const setFav = async () => {
        let fitToUpload = {
            hat: curFit.hat,
            jacket: curFit.jacket,
            top: curFit.top,
            bottom: curFit.bottom,
            shoe: curFit.shoe,
            accessories: curFit.accessories ? JSON.stringify(curFit.accessories || []) : JSON.stringify([]) 
        }
        if (!isFav) {
            try {
                const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (doc) => {
                    await updateDoc(doc.ref, {
                        favFits: arrayUnion(fitToUpload)
                    });
                    setIsFav(true); // Update the state to reflect the change
                });
                console.log("added fav");
            } catch (error) {
                console.error("Error setting favorite status: ", error);
            }
        } else {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                favFits: arrayRemove(fitToUpload)
            });
            setIsFav(false);
            console.log("removed fav");
            removeFit(curFit);
        }
    };

    
    let navigate = useNavigate();

    const viewFit = () => {
        console.log(displayFitCode);
        navigate("/" + displayFitCode);
    }

    const compFits = (fit1, fit2) => {
        fit1.accessories = JSON.parse(fit1.accessories || []);
        const keys1 = Object.keys(fit1);
        const keys2 = Object.keys(fit2);
        let c = 0;
    
        if (keys1.length !== keys2.length) {
            return false;
        }
            
    
        for (let i = 0; i < keys1.length; i++) {
            let curKey = keys1[i];
            if(curKey === "accessories" && fit1.accessories.length > 0 && fit2.accessories.length > 0){
                    for(let j = 0; j < fit1[curKey].length; j++){
                        
                        try{
                            if(fit1[curKey][j].title !== fit2[curKey][j].title){
                                return false;
                            }
                        }
                        catch(error){
                            console.log(error);
                        }
                }
            }
            else{
                if (fit1[curKey].title !== fit2[curKey].title) {
                    return false;
                }
            }
        }
    
        return true;
    };
    

    useEffect(() => {
        try {
            const genFitCode = async () => {
                let fitCode = "";
                console.log("curFit:", curFit);
                let keys = [];
                if (curFit) {
                    keys = Object.keys(curFit);
                }

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
                    }
                    else if (key === "accessories" && Array.isArray(item) && item.length === 0) {

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

                setDisplayFitCode(fitCode);
                console.log("Generated fitCode:", fitCode);
            };


            genFitCode();

            const checkIfFavorite = async () => {
                try {
                    const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
                    const querySnapshot = await getDocs(q);
                    let favorite = false;
                    querySnapshot.forEach((doc) => {
                        const favFits = doc.data().favFits || [];
                        favFits.forEach((fit) => {
                            if (compFits(fit, curFit)) {
                                favorite = true;
                            }
                        });
                    });
                    setIsFav(favorite);
                } catch (error) {
                    console.error("Error checking favorite status: ", error);
                }
            };

            // Only call checkIfFavorite if curFit changes
            checkIfFavorite();
        }
        catch (error) {
            console.log(error);
        }
    }, [curFit]);

    return (
            <div className='fitContainerWStar' style={{flexDirection: onMobile ? "row" : "column"}}>
                {curFit !== null ? (
                    <>
                        <div className={`fitContainer ${onMobile && 'mobile'}`} onClick={viewFit}>
                            {curFit.hat && curFit.hat.id !== "001" && 
                                <div className='hatPic fitImgContainer'>
                                    <img key={curFit.hat.id} src={curFit.hat.imgURL} alt="hat" className='fitImg' style={{ zIndex: '2' }} />
                                </div>
                            }
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
                                        if(acc.id !== "002"){
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
                                        }
                                        else{
                                            return <div style={{ width: "50%", height: "auto" }}></div>;
                                        }
                                    })}
                                </div>
                            )}
                            {curFit.bottom && (
                                <div className='bottomPic fitImgContainer'>
                                    <img key={curFit.bottom.id} src={curFit.bottom.imgURL} alt="bottom" className='fitImg' style={{ zIndex: '4'}} />
                                </div>
                            )}
                            {curFit.shoe && (
                                <div className='shoePic fitImgContainer'>
                                    <img key={curFit.shoe.id} src={curFit.shoe.imgURL} alt="shoe" className='fitImg' style={{ zIndex: '5'}} />
                                </div>
                            )}
                        </div>
                        <div className='favStar' onClick={setFav} style={{paddingLeft: onMobile ? "20px" : "0px"}}>
                            {isCurUser &&
                                <>
                                    {(isFav ? "★" : "☆")}
                                </>
                            }
                        </div>
                    </>
                ) : (
                    <div>Loading...</div>
                )}
            </div>
    );
};

export default DisplayFit;
