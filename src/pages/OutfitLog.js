import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CalendarComponent from "./CalendarComponent";

function OutfitLog({ profileID }) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    const [monthInd, setMonthInd] = useState(() => {
        const ind = new Date().getMonth();
        return ind;
    });
    const [curProf, setCurProf] = useState()
    const [month, setMonth] = useState();
    let navigate = useNavigate();

    useEffect(() => {
        setCurProf(profileID);
    }, [profileID])

    useEffect(() => {
        setMonth(monthNames[monthInd]);
        console.log(profileID);
    }, [monthInd])

    const handleMonthChange = (change) => {
        setMonthInd(monthInd + change);
    }

    return (
        <div className="outfitLogContainer">
            <div className="monthHeader">
                <h2 onClick={() => {handleMonthChange(-1)}}>◀</h2>
                <h1>{month}</h1>
                <h2 onClick={() => {handleMonthChange(1)}}>▶</h2>
            </div>
            {curProf && <CalendarComponent month={monthInd + 1} id={curProf}/>}
            
        </div>
    );
}

export default OutfitLog;
