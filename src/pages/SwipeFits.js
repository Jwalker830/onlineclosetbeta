import React, { useState, useEffect, useCallback } from 'react';
import GetUserItems from './GetUserItems';
import GetUserPrefs from './GetUserPrefs';
import { updateDoc, doc } from 'firebase/firestore';
import { db, auth } from "../firebase-config";
import DisplayFit from './DisplayFit';

const SwipeFits = ({ isAuth }) => {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [curFit, setCurFit] = useState(null);
  const [sorted, setSorted] = useState({
    hatList: [],
    jacketList: [],
    topList: [],
    bottomList: [],
    shoeList: [],
    accessoryList: [],
  });
  const [fitTags, setFitTags] = useState([]);
  const [combos, setCombos] = useState([]);
  const [comboPrefs, setComboPrefs] = useState({});
  const [slideDirection, setSlideDirection] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [onMobile, setOnMobile] = useState(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  // Map: pairKey(tagA,tagB) -> index in combos array
  const [comboIndex, setComboIndex] = useState(() => new Map());

  // Always represent a pair in sorted order so (a,b) === (b,a)
  const pairKey = (a, b) => JSON.stringify([a, b].sort());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Fetch items on user authentication
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (displayedItems.length > 0) {
      const sortedItems = sortItemList(displayedItems);
      setSorted(sortedItems);
      pickOutfit(sortedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedItems]);

  useEffect(() => {
    if (onMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, [onMobile]);

  const bucketForRatio = (ratio) => {
    if (ratio < -1) return "hate";
    if (ratio < 0) return "dislike";
    if (ratio < 0.8) return "enjoy";
    if (ratio < 1.8) return "like";
    return "love";
  };

  // Remove a pair from all buckets (canonical compare)
  const removePairFromBuckets = (prefs, key) => {
    const out = { ...prefs };
    for (const k of ["love", "like", "enjoy", "dislike", "hate"]) {
      out[k] = (out[k] || []).filter(c => pairKey(c[0], c[1]) !== key);
    }
    return out;
  };

  // Build a lookup map from comboPrefs: pairKey -> [score, n]
  const buildScoreMapFromPrefs = (prefs) => {
    const map = new Map();
    for (const bucket of ["love", "like", "enjoy", "dislike", "hate"]) {
      for (const c of (prefs?.[bucket] || [])) {
        if (!c || c.length < 4) continue;
        const key = pairKey(c[0], c[1]);
        map.set(key, [c[2], c[3]]);
      }
    }
    return map;
  };

  const updateComboPrefs = async (updatedComboPrefs) => {
    setComboPrefs(updatedComboPrefs);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        combos: JSON.stringify(updatedComboPrefs)
      });
    } catch (error) {
      console.error("Error updating combo preferences:", error);
    }
  };

  // Re-bucket only the pairs touched by this swipe.
  // IMPORTANT: pass indexMap so we can bucket newly-added pairs immediately.
  const updateCombosTouched = (newCombos, touchedKeys, indexMap) => {
    let nextPrefs = {
      love: comboPrefs.love || [],
      like: comboPrefs.like || [],
      enjoy: comboPrefs.enjoy || [],
      dislike: comboPrefs.dislike || [],
      hate: comboPrefs.hate || [],
    };

    touchedKeys.forEach((key) => {
      const idx = indexMap.get(key);
      if (idx === undefined) return;

      const combo = newCombos[idx]; // [a,b,score,n]
      const n = combo[3] || 1;
      const ratio = combo[2] / n;

      nextPrefs = removePairFromBuckets(nextPrefs, key);

      const bucket = bucketForRatio(ratio);
      nextPrefs[bucket] = [...nextPrefs[bucket], combo];
    });

    updateComboPrefs(nextPrefs);
  };

  const scoreTags = useCallback((amt) => {
    const newCombos = combos.map(c => [...c]);
    const touchedKeys = new Set();

    // Local working copy so additions are visible immediately
    const workingIndexMap = new Map(comboIndex);

    for (let i = 0; i < fitTags.length; i++) {
      for (let j = i + 1; j < fitTags.length; j++) {
        const a = fitTags[i];
        const b = fitTags[j];
        if (a === b) continue;

        const key = pairKey(a, b);
        touchedKeys.add(key);

        const idx = workingIndexMap.get(key);
        if (idx !== undefined) {
          newCombos[idx][2] += amt; // score
          newCombos[idx][3] += 1;   // appearances
        } else {
          const [x, y] = [a, b].sort();
          const newIdx = newCombos.length;
          newCombos.push([x, y, amt, 1]);
          workingIndexMap.set(key, newIdx);
        }
      }
    }

    setCombos(newCombos);
    setComboIndex(workingIndexMap);

    // Only update prefs for touched pairs
    updateCombosTouched(newCombos, touchedKeys, workingIndexMap);

    setIsTransitioning(true);
    setTimeout(() => {
      pickOutfit(sorted);
      setSlideDirection(null);
      setIsTransitioning(false);
    }, 500);
  }, [combos, comboIndex, fitTags, comboPrefs, sorted]);

  useEffect(() => {
    let direction = "";
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          direction = "up";
          scoreTags(1);
          break;
        case 'ArrowDown':
          direction = "down";
          scoreTags(-1);
          break;
        case 'ArrowLeft':
          direction = "left";
          scoreTags(-2);
          break;
        case 'ArrowRight':
          direction = "right";
          scoreTags(2);
          break;
        default:
          direction = null;
          break;
      }
      setSlideDirection(direction);
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event) => {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;

      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (diffX === 0 || diffY === 0) return;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
          direction = "right";
          scoreTags(2);
        } else {
          direction = "left";
          scoreTags(-2);
        }
      } else {
        if (diffY > 0) {
          direction = "down";
          scoreTags(-1);
        } else {
          direction = "up";
          scoreTags(1);
        }
      }

      setSlideDirection(direction);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scoreTags]);

  const updateItemList = (newItemList) => {
    setDisplayedItems(newItemList);
  };

  const sortItemList = (items) => {
    const sortedItems = {
      hatList: [],
      jacketList: [],
      topList: [],
      bottomList: [],
      shoeList: [],
      accessoryList: [],
    };

    items.forEach(item => {
      switch (item.type) {
        case "Hat":
          sortedItems.hatList.push(item);
          break;
        case "Jacket":
          sortedItems.jacketList.push(item);
          break;
        case "Top":
          sortedItems.topList.push(item);
          break;
        case "Bottoms":
          sortedItems.bottomList.push(item);
          break;
        case "Shoes":
          sortedItems.shoeList.push(item);
          break;
        case "Accessory":
          sortedItems.accessoryList.push(item);
          break;
        default:
          break;
      }
    });

    // Build lookup of existing learned scores so we don't wipe prefs
    const scoreMap = buildScoreMapFromPrefs(comboPrefs);

    // Store ONLY canonical pair keys in the set
    const comboSet = new Set();
    for (const key of scoreMap.keys()) comboSet.add(key);

    // Add all possible pairs from items (canonical)
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) { // avoid dup/self
        const tagsI = items[i].tags || [];
        const tagsJ = items[j].tags || [];
        for (let a = 0; a < tagsI.length; a++) {
          for (let b = 0; b < tagsJ.length; b++) {
            if (tagsI[a] === tagsJ[b]) continue;
            comboSet.add(pairKey(tagsI[a], tagsJ[b]));
          }
        }
      }
    }

    // Build combos array, preserving score/n when known
    const comboArr = Array.from(comboSet).map((keyStr) => {
      const [a, b] = JSON.parse(keyStr);
      const existing = scoreMap.get(keyStr);
      if (existing) {
        const [score, n] = existing;
        return [a, b, score, n];
      }
      return [a, b, 0, 0];
    });

    // Build index map
    const indexMap = new Map();
    comboArr.forEach((c, idx) => indexMap.set(pairKey(c[0], c[1]), idx));

    setCombos(comboArr);
    setComboIndex(indexMap);

    return sortedItems;
  };

  const pickOutfit = (sortedItems) => {
    const getRandomItems = (array, amt) => {
      if (array.length === 0) return null;
      let returnItems = new Set();
      if (amt === 0) {
        const item002 = array.filter(item => item.id === "002");
        if (item002.length > 0) {
          returnItems.add(item002[0]);
        }
        return Array.from(returnItems);
      }
      if (amt === 1) {
        return array[Math.floor(Math.random() * array.length)];
      }
      while (returnItems.size < amt) {
        returnItems.add(array[Math.floor(Math.random() * array.length)]);
      }
      return Array.from(returnItems);
    };

    const outfit = {
      hat: getRandomItems(sortedItems.hatList, 1),
      jacket: getRandomItems(sortedItems.jacketList, 1),
      top: getRandomItems(sortedItems.topList, 1),
      bottom: getRandomItems(sortedItems.bottomList, 1),
      shoe: getRandomItems(sortedItems.shoeList, 1),
      accessories: getRandomItems(sortedItems.accessoryList, Math.floor(Math.random() * 3)) || []
    };

    let accessoryTags = new Set();

    if (Array.isArray(outfit.accessories)) {
      outfit.accessories.forEach(accessory => {
        if (accessory && accessory.tags) {
          if (Array.isArray(accessory.tags)) {
            accessory.tags.forEach(tag => accessoryTags.add(tag));
          } else if (typeof accessory.tags === 'object') {
            Object.keys(accessory.tags).forEach(tag => accessoryTags.add(tag));
          }
        }
      });
    } else {
      if (outfit.accessories && typeof outfit.accessories === 'object' && outfit.accessories.tags) {
        Object.keys(outfit.accessories.tags).forEach(tag => accessoryTags.add(tag));
      }
    }

    let fitTagsList = [
      ...(outfit.hat ? outfit.hat.tags : []),
      ...(outfit.jacket ? outfit.jacket.tags : []),
      ...(outfit.top ? outfit.top.tags : []),
      ...(outfit.bottom ? outfit.bottom.tags : []),
      ...(outfit.shoe ? outfit.shoe.tags : []),
      ...(Array.from(accessoryTags))
    ];

    setFitTags(fitTagsList);
    setCurFit(outfit);
  };

  const updateComboList = (newPrefsObj) => {
    setComboPrefs(newPrefsObj);
  };

  const handleRemoveFit = (fit) => {
    // TODO
  };

  return (
    <div>
      <GetUserItems setItemList={updateItemList} id={auth.currentUser.uid} />
      <GetUserPrefs setPrefs={updateComboList} id={auth.currentUser.uid} />

      <div className="swipeFitIndicators" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: onMobile ? '100vw' : '60vw',
        margin: 'auto',
        marginBottom: '10px',
        position: 'relative',
        height: '60px',
        fontFamily: 'Verdana, Geneva, Tahoma, sans-serif',
        fontSize: onMobile ? '18px' : '22px',
        zIndex: 2
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '32px', color: 'red' }}>←</span>
          <span style={{ marginTop: '-8px' }}>Bad</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '32px', color: 'orange' }}>↓</span>
          <span style={{ marginTop: '-8px' }}>OK</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '32px', color: 'green' }}>↑</span>
          <span style={{ marginTop: '-8px' }}>Good</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '32px', color: 'blue' }}>→</span>
          <span style={{ marginTop: '-8px' }}>Great</span>
        </div>
      </div>

      <div className='swipeFitContainer' style={{
        transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.77,0,0.175,1)' : 'transform 0.3s ease-in-out',
        transform: slideDirection ?
          (slideDirection === 'left' ? 'translateX(-100vw)' :
            slideDirection === 'right' ? 'translateX(100vw)' :
              slideDirection === 'up' ? 'translateY(-100vh)' :
                'translateY(100vh)'
          ) : 'translate(0, 0)',
        boxShadow: isTransitioning ? '0 8px 32px rgba(0,0,0,0.18)' : '',
        background: isTransitioning ? 'var(--color4)' : '',
        borderRadius: '16px',
        width: onMobile ? '90vw' : '40vw',
        margin: 'auto',
        minHeight: onMobile ? '350px' : '400px',
        maxWidth: '600px',
        position: 'relative',
        zIndex: 1
      }}>
        {curFit && (
          <DisplayFit
            fit={curFit}
            removeFit={handleRemoveFit}
            width={onMobile ? "120px" : "150px"}
            curUser={true}
          />
        )}
      </div>
    </div>
  );
};

export default SwipeFits;
