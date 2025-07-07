﻿// GeneratePackingList.jsx
import React, { useState, useEffect } from "react";
import GetUserItems from "./GetUserItems";
import GetUserPrefs from "./GetUserPrefs";
import { auth } from "../firebase-config";

/* ---------- helper copied from GenerateFit --------------------------- */
const sortPrefItems = items => ({
    hats: items.filter(i => i.type === "Hat"),
    jackets: items.filter(i => i.type === "Jacket"),
    tops: items.filter(i => i.type === "Top"),
    bottoms: items.filter(i => i.type === "Bottoms"),
    shoes: items.filter(i => i.type === "Shoes"),
    accessories: items.filter(i => i.type === "Accessory")
});

// same helper your randomizeFit uses
const getRandomItems = (array, amt) => {
    if (!array || array.length === 0) return [];
    const picked = new Set();

    if (amt === 0) {                       // honour the “002” rule
        const item002 = array.find(i => i.id === "002");
        if (item002) picked.add(item002);
        return [...picked];
    }

    while (picked.size < amt && picked.size < array.length) {
        picked.add(array[Math.floor(Math.random() * array.length)]);
    }
    return [...picked];
};

const typeKey = t => {
    switch (t) {
        case "Hat": return "hats";
        case "Jacket": return "jackets";
        case "Top": return "tops";
        case "Bottoms": return "bottoms";
        case "Shoes": return "shoes";
        default: return "accessories";
    }
};
/* -------------------------------------------------------------------- */

function GeneratePackingList() {
    /* Firebase data ----------------------------------------------------- */
    const [displayedItems, setDisplayedItems] = useState([]);
    const [userPrefs, setUserPrefs] = useState({
        love: [], like: [], enjoy: [], dislike: [], hate: []
    });
    const [loading, setLoading] = useState(true);

    /* UI state ---------------------------------------------------------- */
    const [locked, setLocked] = useState({});   // {itemId:true}
    const [anchor, setAnchor] = useState(null); // random seed
    const [days, setDays] = useState(1);
    const [minimal, setMinimal] = useState(false);
    const [packingList, setPackingList] = useState(null);

    /* stop the loading screen when the closet arrives ------------------ */
    useEffect(() => { if (displayedItems.length) setLoading(false); },
        [displayedItems]);

    /* toggle lock ------------------------------------------------------- */
    const toggleLock = item => {
        setLocked(prev => {
            const next = { ...prev };
            if (next[item.id]) delete next[item.id];
            else next[item.id] = true;
            return next;
        });
    };

    /* minimal mode table ------------------------------------------------ */
    const MIN_TABLE = {
        1: { tops: 1, bottoms: 1, jackets: 1, shoes: 1, hats: 0, accessories: 1 },
        2: { tops: 2, bottoms: 1, jackets: 1, shoes: 1, hats: 0, accessories: 2 },
        3: { tops: 2, bottoms: 2, jackets: 1, shoes: 1, hats: 0, accessories: 3 },
        4: { tops: 3, bottoms: 2, jackets: 1, shoes: 2, hats: 0, accessories: 3 },
        5: { tops: 3, bottoms: 2, jackets: 1, shoes: 2, hats: 0, accessories: 4 },
        6: { tops: 4, bottoms: 2, jackets: 2, shoes: 2, hats: 0, accessories: 4 },
        7: { tops: 4, bottoms: 3, jackets: 2, shoes: 2, hats: 0, accessories: 5 },
        8: { tops: 5, bottoms: 3, jackets: 2, shoes: 3, hats: 0, accessories: 5 },
        9: { tops: 5, bottoms: 3, jackets: 2, shoes: 3, hats: 0, accessories: 6 },
        10: { tops: 6, bottoms: 3, jackets: 2, shoes: 3, hats: 0, accessories: 6 }
    };

    /* --------------------- main algorithm ----------------------------- */
    const generatePackingList = () => {
        /* -------- how many of each type do we need? -------- */
        const need = minimal
            ? MIN_TABLE[Math.min(days, 10)]
            : {
                tops: days, bottoms: days, jackets: days,
                shoes: 1, hats: days, accessories: days
            };

        /* -------- treat every locked item as a base item --- */
        let baseItemsList = displayedItems.filter(it => locked[it.id]);  // <- new array

        if (baseItemsList.length === 0) {
            const [randItem] = getRandomItems(displayedItems, 1); // destructure first elem
            if (randItem) baseItemsList.push(randItem);
        }

        /* -------- build the same tag-pools as randomizeFit - */
        let curTags = new Set();
        baseItemsList.forEach(it => it.tags?.forEach(t => curTags.add(t)));

        const curPrefs = [...userPrefs.love, ...userPrefs.like];
        const curHates = [...userPrefs.hate, ...userPrefs.dislike];

        // expand liked pairs
        curTags.forEach(tag =>
            curPrefs.forEach(([a, b]) => {
                if (a === tag) curTags.add(b);
                if (b === tag) curTags.add(a);
            })
        );

        // remove disliked counterparts
        const dislikeTags = new Set();
        curTags.forEach(tag =>
            curHates.forEach(([a, b]) => {
                if (a === tag) { dislikeTags.add(b); curTags.delete(b); }
                if (b === tag) { dislikeTags.add(a); curTags.delete(a); }
            })
        );

        /* -------- score every item exactly as before ------- */
        const candidatePool = [];
        displayedItems.forEach(item => {
            let score = 0;
            item.tags?.forEach(tag => {
                if (dislikeTags.has(tag)) score -= 2;
                else if (curTags.has(tag)) score += 5;
                else score -= 1;
            });

            if ((score / (item.tags?.length || 1)) > 0.3) {
                candidatePool.push(item);
            }
        });

        const sorted = sortPrefItems(candidatePool);

        /* -------- build the packing-list object ------------ */
        const list = {
            hats: [], jackets: [], tops: [],
            bottoms: [], shoes: [], accessories: []
        };

        // copy locked items first
        baseItemsList.forEach(it => {
            const k = typeKey(it.type);
            if (!list[k].some(x => x.id === it.id)) list[k].push(it);
        });

        // helper to top-up each category
        const fill = (catArr, catPool, amt) => {
            if (catArr.length >= amt) return;
            const extra = getRandomItems(catPool, amt - catArr.length);
            extra.forEach(it => {
                if (!catArr.some(x => x.id === it.id)) catArr.push(it);
            });
        };

        fill(list.hats, sorted.hats, need.hats ?? 0);
        fill(list.jackets, sorted.jackets, need.jackets ?? 0);
        fill(list.tops, sorted.tops, need.tops ?? 0);
        fill(list.bottoms, sorted.bottoms, need.bottoms ?? 0);
        fill(list.shoes, sorted.shoes, need.shoes ?? 0);
        fill(list.accessories, sorted.accessories, need.accessories ?? 0);

        // pack “as many as exist” if the closet is still short
        // (the fill() helper already stops when the pool is empty)

        setPackingList(list);
    };

    /* helper: DB type → object key ------------------------------------- */
    const keyForType = type => {
        switch (type) {
            case "Hat": return "hats";
            case "Jacket": return "jackets";
            case "Top": return "tops";
            case "Bottoms": return "bottoms";
            case "Shoes": return "shoes";
            default: return "accessories";
        }
    };

    /* item-scoring helper ---------------------------------------------- */
    const pickBestItem = (
        candidates, alreadyChosen, prefs, likedTags = new Set()) => {

        let best = candidates[0], bestScore = -Infinity;

        candidates.forEach(it => {
            if (alreadyChosen.some(ch => ch.id === it.id)) return;

            let score = 0;

            // boost items that share tags with the anchor
            it.tags?.forEach(tag => { if (likedTags.has(tag)) score += 5; });

            // user preferences
            it.tags?.forEach(tag => {
                if ([...prefs.love, ...prefs.like].some(pair => pair.includes(tag)))
                    score += 3;
                if ([...prefs.hate, ...prefs.dislike].some(pair => pair.includes(tag)))
                    score -= 3;
            });

            if (score > bestScore) { best = it; bestScore = score; }
        });
        return best;
    };

    /* --------------------------- render ------------------------------- */
    if (loading) {
        return (
            <>
                <p>Loading…</p>
                <GetUserItems id={auth.currentUser.uid} setItemList={setDisplayedItems} />
                <GetUserPrefs id={auth.currentUser.uid} setPrefs={setUserPrefs} />
            </>
        );
    }

    const renderPackingList = () => (
        <div className="generatorContainer">
            <h2>Your packing list</h2>
            {Object.entries(packingList).map(([cat, arr]) => (
                <div key={cat}>
                    <div className="rowDisplay">
                        {arr.map(it => (
                            <div key={it.id} className="itemContainer">
                                <img src={it.imgURL}
                                    alt={it.title}
                                    className="closetItemImg" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const sortedForDisplay = sortPrefItems(displayedItems);

    // place it above the return (inside the component)
    const renderArticleDisplay = (catName, arr) => (
        <div className="articleDisplay scroll-container" key={catName}>
            {arr.length ? (
                arr.map(item => (
                    <div
                        key={item.id}
                        className="itemContainer"
                        onClick={() => toggleLock(item)}
                    >
                        <img
                            src={item.imgURL}
                            alt={catName}
                            className="closetItemImg"
                            style={{ opacity: locked[item.id] ? 0.4 : 1 }}
                        />
                        {locked[item.id] && <span className="lockIcon">🔒</span>}
                    </div>
                ))
            ) : (
                <p style={{ fontSize: 12, margin: 0 }}>no&nbsp;{catName}</p>
            )}
        </div>
    );

    return (
        <div className="packingPage">        {/* NEW FLEX WRAPPER */}
            {/* ---------------- LEFT COLUMN ---------------- */}
            <div className="leftPanel">
                {/* controls */}
                <div className="controlsBox">
                    <label>
                        Days:&nbsp;
                        <input type="number" min="1" value={days}
                            onChange={e => setDays(Number(e.target.value))} />
                    </label>
                    &nbsp;&nbsp;
                    <label>
                        <input type="checkbox" checked={minimal}
                            onChange={e => setMinimal(e.target.checked)} /> Minimal
                    </label>
                    &nbsp;&nbsp;
                    <button onClick={generatePackingList}>
                        Generate packing list
                    </button>
                </div>

                {/* result */}
                {packingList && renderPackingList()}
            </div>
            {/* --------------- RIGHT COLUMN --------------- */}
            <div className="rightPanel scroll-container">
                {renderArticleDisplay("hats", sortedForDisplay.hats)}
                {renderArticleDisplay("jackets", sortedForDisplay.jackets)}
                {renderArticleDisplay("tops", sortedForDisplay.tops)}
                {renderArticleDisplay("bottoms", sortedForDisplay.bottoms)}
                {renderArticleDisplay("shoes", sortedForDisplay.shoes)}
                {renderArticleDisplay("accessories", sortedForDisplay.accessories)}
            </div>
        </div>
    );
}

export default GeneratePackingList;