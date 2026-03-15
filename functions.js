const listSize = 10;
const threshold_difficulty = 15;
let gameModes = { freeStart: false, manualMerge: false, memory: false, chaos: false };
let displayTarget = true;
let linting = false;
let levelList = [];
let displayList = [];
let playerRange = { start: undefined, end: undefined };
let optimalSteps = null;
let optimalMerges = null;
let numberOfMoves = null;
let numberOfMerges = null;

//--------------------------------Level Generator--------------------------------//
function generateLevel() {
  document.getElementById('winModal').style.display = 'none';
  document.getElementById('move-count').textContent = ``;
  numberOfMoves = 0,numberOfMerges = 0;
  linting = false;
  displayList = gameModes.chaos ? [...Array(listSize).keys()].sort(() => Math.random() - 0.5) : [...Array(listSize).keys()].sort();

  while (true) {
    const candidateList = [...displayList].sort(() => Math.random() - 0.5);
    const invalid = (i,steps) => (i > 0 && candidateList[i - 1] === candidateList[i] - 1) || (i < listSize - 1 && candidateList[i + 1] === candidateList[i] + 1) || (steps < threshold_difficulty);
    
    if (gameModes.freeStart){
      let minSteps = Infinity,minMerges = Infinity;
      for (let i = 0; i < listSize; i++) {
        const {steps,merges} = getMinimumStepsToWin(candidateList, i);
        if (invalid(i,steps)) break;
        if (steps < minSteps || (steps === minSteps && merges < minMerges)) {minSteps = steps; minMerges = merges}
        if (i < listSize-1) continue;
        levelList = candidateList;
        playerRange = { start: undefined, end: undefined}
        optimalSteps = minSteps,optimalMerges = minMerges;
        createLink();
        return render(false,false);
      }
    } else {
      for (let i = 0; i < listSize; i++) {
        const {steps,merges} = getMinimumStepsToWin(candidateList, i);
        if (invalid(i,steps)) continue;
        levelList = candidateList;
        playerRange = { start: i, end: i}
        optimalSteps = steps,optimalMerges = merges;
        createLink();
        return render();
      }
    }
  }
}


//--------------------------------Move the player--------------------------------//
const moveRight = ({start,end}, list) => {
  const newList = [...list];
  for (let i = end; i >= start; i--) [newList[i], newList[i + 1]] = [newList[i + 1], newList[i]];
  return newList;
};

const moveLeft = ({start,end}, list) => {
  const newList = [...list];
  for (let i = start; i <= end; i++) [newList[i - 1], newList[i]] = [newList[i], newList[i - 1]];
  return newList;
};

function move(direction) {
  if (direction === 'right' && playerRange.end < levelList.length - 1) {levelList = moveRight(playerRange,levelList);playerRange.start++,playerRange.end++;}
  else if (direction === 'left' && playerRange.start > 0) {levelList = moveLeft(playerRange,levelList);playerRange.start--,playerRange.end--;}
  else {document.getElementById('feedback').textContent = `already on the extreme ${direction}`;return};
  numberOfMoves++
  document.getElementById('move-count').textContent = gameModes.manualMerge ? `moves used: ${numberOfMoves}, merges used: ${numberOfMerges}` : `moves used: ${numberOfMoves}`;
  render();
}


//--------------------------------connect also usable when finding optimal steps/merges--------------------------------//
function connect(range,list) {
  let { start, end } = range;
  while (end < list.length - 1 && list[end + 1] === list[end] + 1) end++;
  while (start > 0 && list[start - 1] === list[start] - 1) start--;
  return { start, end };
}


//--------------------------------Finding Optimal steps && merges--------------------------------//

function getMinimumStepsToWin(initialList, startIndex) {
  const visited = new Set();
  const queue = [{ list: initialList, start: startIndex, end: startIndex, steps: 0 , merges: 0 }];

  while (queue.length > 0) {
    const { list, start, end, steps, merges } = queue.shift();
    if (start === 0 && end === list.length - 1) return {steps,merges};
    
    const key = list.join(',') + `|${start},${end}`;
    if (visited.has(key)) continue;
    visited.add(key);

    queue.push({ list, ...connect({ start: start, end: end }, list), steps, merges: merges + 1 } );
    if (start > 0) queue.push({ list: moveLeft({start,end},list), start: start - 1, end: end - 1, steps: steps + 1 ,merges});
    if (end < list.length - 1) queue.push({ list: moveRight({start,end},list), start: start + 1, end: end + 1, steps: steps + 1 ,merges});
  }
  return { steps: Infinity, merges: Infinity };
}



//--------------------------------Encode-Decode Leveldata--------------------------------//
const flagChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-";
function packLevelData() {
  const flag = flagChars[parseInt([
    gameModes.freeStart,
    gameModes.manualMerge,
    gameModes.memory,
    gameModes.chaos,
    displayTarget,
    linting
  ].map(Number).join(''), 2)];
  const levelData = [flag, levelList, displayList, optimalSteps, optimalMerges, playerRange.start];
  return btoa(JSON.stringify(levelData));
}

function unpackLevelData(packedData) {
  let flag, player;
  [flag, levelList, displayList, optimalSteps, optimalMerges, player] = JSON.parse(atob(packedData));
  
  const idx = flagChars.indexOf(flag);
  if (idx === -1) throw new Error('Invalid modes')
  const bits = idx.toString(2).padStart(6, '0').split('').map(x => Boolean(Number(x)));

  gameModes = {freeStart: bits[0],manualMerge: bits[1],memory: bits[2],chaos: bits[3]};
  displayTarget = bits[4];
  linting = bits[5];
  playerRange = gameModes.freeStart ? {start:undefined, end:undefined} : {start:player, end:player}
}