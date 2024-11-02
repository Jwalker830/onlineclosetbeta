import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs, getDoc, updateDoc, doc, arrayRemove } from "firebase/firestore";
import DisplayFit from './DisplayFit';
import moment from 'moment';

function CalendarComponent({ month, id }) {
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    const [daysArray, setDaysArray] = useState([]);
    const [fitLog, setFitLog] = useState([]);
    const [curID, setCurID] = useState();
    let navigate = useNavigate();

    useEffect(() => {
        setFitLog([]);
        if(id === null){
            id = auth.currentUser.uid;
        }
        setCurID(id);
    }, [id])

    useEffect(() => {
        const tempArray = [];
        for (let i = 1; i <= daysInMonth; i++) {
            tempArray.push(i);
        }
        setDaysArray(tempArray);
    }, [daysInMonth, month]);

    const getLogs = async () => {
        try {
            if (!curID) {
                console.error("User is not loaded");
                return;
            }
    
            const q = query(collection(db, "users"), where("id", "==", curID));
            const querySnapshot = await getDocs(q);
            const fitSet = new Set();
    
            await Promise.all(querySnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                await Promise.all(userData.fitLog.map(async (fit) => {
                    try {
                        let parsedFit = JSON.parse(fit.slice(fit.indexOf('{')));
                        const date = fit.slice(0, fit.indexOf('{'));
                        fitSet.add({
                            date: new Date(date),
                            ...parsedFit
                        });
                    } catch (error) {
                        console.error('Error parsing accessories:', error);
                    }
                }));
            }));
            setFitLog(Array.from(fitSet));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    useEffect(() => {
        console.log(curID);
        
        getLogs();
    }, [curID]);

    const handleLogButton = (day) => {
        let curDate = new Date(year, month - 1, day);
        localStorage.setItem("logging", true);
        localStorage.setItem("date", curDate);
        navigate("/");
    }

    const getFitForDay = (day) => {
        const checkDate = new Date(year, month - 1, day).toDateString();
        return fitLog.find(fit => new Date(fit.date).toDateString() === checkDate);
    }

    const handleRemoveLog = async (day) => {
        try {
            if (!curID) {
                console.error("User is not loaded");
                return;
            }
    
            const fitDate = new Date(year, month - 1, day).toString();
    
            const userDocRef = doc(db, "users", curID);
            const userDocSnapshot = await getDoc(userDocRef);
            
            if (!userDocSnapshot.exists()) {
                console.error("User document does not exist");
                return;
            }
    
            const userData = userDocSnapshot.data();
            const fitLog = userData.fitLog || [];
    
            const fitToRemove = fitLog.find(fit => {
                const [storedDate, jsonFit] = fit.split('{', 2);
                return storedDate.trim() === fitDate;
            });
    
            if (!fitToRemove) {
                console.error("Fit not found for the given day");
                return;
            }
    
            await updateDoc(userDocRef, {
                fitLog: arrayRemove(fitToRemove)
            });

            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                actions: arrayRemove({ user: auth.currentUser.uid, type: "fit", content: fitToRemove, time: moment().format('YYYY-MM-DD HH:mm:ss') })
            });

            console.log(fitLog);
            console.log(fitToRemove);

            getLogs(); //find a different solution for this
    
            console.log("Fit removed successfully");
        } catch (error) {
            console.error("Error removing fit:", error);
        }
    };    
    

    return (
        <div className="calendarContainer">
            {daysArray.length > 0 && daysArray.map(day => {
                const fit = getFitForDay(day);
                return (
                    <div className="calendarDay" key={day}>
                        <div className="dayNumber">{day}</div>
                        {fit ?
                            <>
                                <DisplayFit curFit={fit} />
                                <>
                                {auth.currentUser && curID === auth.currentUser.uid &&
                                    <button 
                                        className="logButton" 
                                        onClick={() => handleRemoveLog(day)}
                                    >
                                        Remove Log
                                    </button>
                                }
                                </>
                            </>
                        :
                            <>
                            {auth.currentUser && curID === auth.currentUser.uid &&
                                <button 
                                    className="logButton" 
                                    onClick={() => handleLogButton(day)}
                                >
                                    Log Outfit
                                </button>
                            }
                            </>
                        }
                    </div>
                );
            })}
        </div>
    );
}

export default CalendarComponent;