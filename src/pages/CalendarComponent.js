import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase-config";
import { query, collection, where, getDocs, getDoc, updateDoc, doc, arrayRemove,setDoc } from "firebase/firestore";
import DisplayFit from './DisplayFit';
import moment from 'moment';

function CalendarComponent({ year, month, id }) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const totalCells = 42;
    const [fitLog, setFitLog] = useState([]);
    const [curID, setCurID] = useState();
    let navigate = useNavigate();

    useEffect(() => {
        setFitLog([]);
        if (id === null) {
            id = auth.currentUser.uid;
        }
        setCurID(id);
    }, [id]);

    const getLogs = async () => {
        try {
            if (!curID) {
                console.error("User is not loaded");
                return;
            }

            const q = query(collection(db, "feed"), where("user", "==", curID));
            const querySnapshot = await getDocs(q);
            const fitSet = new Set();

            await Promise.all(querySnapshot.docs.map(async (logDoc) => {
                const logData = logDoc.data();
                try {
                    fitSet.add(logData);
                } catch (error) {
                    console.error('Error adding fits:', error);
                }
            }));
            setFitLog(Array.from(fitSet));
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    useEffect(() => {
        getLogs();
    }, [curID]);

    const handleLogButton = (day) => {
        let curDate = new Date(year, month - 1, day);
        localStorage.setItem("logging", true);
        localStorage.setItem("date", curDate.toDateString());
        navigate("/");
    };

    const getFitForDay = (day) => {
        const checkDate = new Date(year, month - 1, day).toDateString();
        return fitLog.find(fit => new Date(fit.loggedFor).toDateString() === checkDate);
    };

    const handleRemoveLog = async (day) => {
        try {
            if (!curID) {
                console.error("User is not loaded");
                return;
            }

            const q = query(
                collection(db, "feed"),
                where("loggedFor", "==", day),
                where("userID", "==", curID)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log("No logs found for the specified day and user.");
                return;
            }

            const batch = db.batch();
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            console.log("Fit removed successfully");
        } catch (error) {
            console.error("Error removing fit:", error);
        }
    };


    return (
        <div className="calendarContainer">
            {Array.from({ length: totalCells }, (_, index) => {
                const day = index - firstDayOfMonth + 1;
                const fit = day > 0 && day <= daysInMonth ? getFitForDay(day) : null;

                return (
                    <div className="calendarDay" key={index}>
                        <div className="dayNumber">{day > 0 && day <= daysInMonth ? day : ""}</div>
                        {fit && day > 0 && day <= daysInMonth ? (
                            <>
                                <DisplayFit fitCode={fit.fitCode} />
                                {auth.currentUser && curID === auth.currentUser.uid &&
                                    <button
                                        className="logButton"
                                        onClick={() => handleRemoveLog(day)}
                                    >
                                        Remove Log
                                    </button>
                                }
                            </>
                        ) : (
                            day > 0 && day <= daysInMonth && auth.currentUser && curID === auth.currentUser.uid &&
                            <button
                                className="logButton"
                                onClick={() => handleLogButton(day)}
                            >
                                Log Outfit
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default CalendarComponent;
