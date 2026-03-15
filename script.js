const rootStyles = getComputedStyle(document.documentElement);
const accentColor = rootStyles.getPropertyValue('--color-accent');
const textColor = rootStyles.getPropertyValue('--color-text');
const bgColor = rootStyles.getPropertyValue('--color-bg');
const game = document.getElementById('game');

//--------------------------------Render level--------------------------------//
function render(merge = !gameModes.manualMerge, showControls = !(playerRange.start === undefined)) {
  document.getElementById('feedback').textContent = '';
  let info =`🎯 Optimal: ${optimalSteps} steps`;
  if (gameModes.manualMerge) info += `,${optimalMerges} merges`;
  if (displayTarget && (!gameModes.memory || numberOfMoves == 0)) info += `,Target = [${displayList}]`
  document.getElementById('info').textContent = info;
  
  if (merge && showControls) {
    const connected = connect(playerRange, levelList);
    if (connected.start !== playerRange.start || connected.end !== playerRange.end) {
      playerRange = connected;
      numberOfMerges++;
      if (gameModes.manualMerge) document.getElementById('move-count').textContent = `moves used: ${numberOfMoves}, merges used: ${numberOfMerges}`;
    } else if (gameModes.manualMerge) document.getElementById('feedback').textContent = 'nothing to merge!';
  }
  game.innerHTML = '';

  for (let i = 0; i < levelList.length; i++) {
    const div = document.createElement('div');
    div.className = 'box';
    if (linting) div.style.color = levelList[i] === i ? accentColor : '';
    if (gameModes.freeStart && !showControls) {div.classList.add('selectable'); div.onclick = () => {playerRange = { start: i, end: i };render();};
    } else if (i >= playerRange.start && i <= playerRange.end) div.classList.add('player');
    div.textContent = (gameModes.memory && numberOfMoves > 0 && showControls && (i < playerRange.start || playerRange.end < i)) ? '' : displayList[levelList[i]];
    game.appendChild(div);
  }
  if (!usingKeyboard){
    document.getElementById('controls').style.display = showControls ? 'flex' : 'none';
    document.getElementById('connect-button').style.display = gameModes.manualMerge ? 'block' : 'none';
  }
  win = false;
  if (playerRange.start === 0 && playerRange.end === levelList.length - 1) {win = true;showWinModal()};
}


//--------------------------------Controls Settings--------------------------------//
let usingKeyboard = false;
document.addEventListener('keydown', (e) => {
  const anyModalOpen = [...document.querySelectorAll('.modal')].some(modal => getComputedStyle(modal).display !== 'none');
  if (!['ArrowLeft', 'ArrowRight', ' '].includes(e.key) || playerRange.start === undefined || anyModalOpen) return;
  if (!usingKeyboard) {usingKeyboard = true;document.getElementById('controls').style.display = 'none';}
  switch (e.key) {
    case 'ArrowLeft': move('left'); break;
    case 'ArrowRight': move('right'); break;
    case ' ': render(true, true); break;
  }
});

function openModal(id) {document.getElementById(id).style.display = 'flex';}
function closeModal(id) {document.getElementById(id).style.display = 'none';}
function toggleControls() {document.getElementById('controls').style.display = (usingKeyboard = !usingKeyboard) ? 'none' : 'flex';}

//--------------------------------Win Modal Handler--------------------------------//
let win = false;
function showWinModal() {
  if (win){
    const starCount = 1 + (numberOfMoves <= optimalSteps) + ((!gameModes.manualMerge && numberOfMoves < optimalSteps + 3) || (gameModes.manualMerge && numberOfMerges <= optimalMerges));
    document.getElementById('stars').innerHTML = '⭐'.repeat(starCount) + `<span style="font-size: 1.2em;">${'☆'.repeat(3-starCount)}</span>`;
  } else {
    document.getElementById('stars').innerHTML = 'Game is Paused';
  }
  document.getElementById('mode').textContent = Object.keys(gameModes).filter(mode => gameModes[mode]).join('-') || 'normal';
  document.querySelectorAll('.mode-toggle input').forEach(input => input.checked = gameModes[input.dataset.mode]);
  document.getElementById('play-button').onclick = () => {
    document.querySelectorAll('.mode-toggle input').forEach(input => gameModes[input.dataset.mode] = input.checked);
    generateLevel();
  };
  document.getElementById('winModal').style.display = 'flex';
}

function restartGame() {
  document.getElementById('winModal').style.display = 'none';
  document.getElementById('move-count').textContent = ``;
  numberOfMoves = 0,numberOfMerges = 0;
  loadLevel(link.value);
}

//--------------------------------Level designer--------------------------------//
function updatePreview() {
  const targetStr = document.getElementById('edit-target').value;
  const initialStr = document.getElementById('edit-initial').value;
  const playerInput = document.getElementById('edit-start');
  const info = document.getElementById('preview-info');
  const previewBox = document.getElementById('preview-initial');
  const error = document.getElementById('edit-error');
  const manualMerge = document.getElementById('edit-manual').checked;
  const memory = document.getElementById('edit-memory').checked;
  const hideGoal = document.getElementById('edit-hide-goal').checked;
  const showIndices = document.getElementById('edit-show-indices').checked;
  const createGameButton = document.getElementById('createGame-button');
  try {
    const target = targetStr.split(',');
    const initial = initialStr.split(',');
    playerInput.max = initial.length - 1;

    if (target.length !== initial.length) throw new Error("Target and Initial must be the same length.");

    const targetMap = {}, indexMap = new Map();
    target.forEach(ch => targetMap[ch] = (targetMap[ch] || 0) + 1);
    initial.forEach((ch, i) => indexMap.get(ch)?.push(i) || indexMap.set(ch, [i]));
    for (const ch in targetMap) {
      if (targetMap[ch] !== indexMap.get(ch).length) throw new Error("Initial must be a permutation of Target.");
    }

    const player = playerInput.value === '' ? undefined : Number(playerInput.value);
    freeStart = player === undefined;
    if (!freeStart && (isNaN(player) || player < 0 || player >= initial.length)) {
      throw new Error(`Start index must be between 0 and ${initial.length - 1}`);
    }
    if (initialStr === '') return;
    error.textContent = '';

    const level = Array(initial.length);target.forEach((ch, i) => level[indexMap.get(ch).shift()] = i);
    
    const {steps, merges} = !freeStart ? getMinimumStepsToWin(level, player)
    : level.map(i => getMinimumStepsToWin(level, i))
        .reduce((min, curr) => ((curr.steps < min.steps) || (curr.steps === min.steps && curr.merges < min.merges)) ? curr : min);

    info.textContent = `🎯 Optimal: ${steps} steps`;
    if (manualMerge) info.textContent += `, ${merges} merges`;
    if (!hideGoal) info.textContent += `, Target: [${target}]`;

    previewBox.innerHTML = '';
    const indicesList = [...level]
    for (let i = 0; i < initial.length; i++) {
      const div = document.createElement('div');
      div.className = 'box';
      div.textContent = initial[i];
      if (showIndices) div.style.color = level[i] === i ? accentColor : '';
      if (freeStart) div.classList.add('selectable');
      else if (i === player) {div.classList.add('player'); indicesList[i] = `<span style="color:${accentColor}">${indicesList[i]}</span>`}
      previewBox.appendChild(div);
    }
    createGameButton.style.display = 'block';

    createGameButton.onclick = () => {
      if (error.textContent !== '') return;
      gameModes = {freeStart, manualMerge, memory, chaos: false };
      displayTarget = !hideGoal;
      linting = showIndices;
      levelList = level;
      displayList = target;
      playerRange = { start: player, end: player } ;
      optimalSteps = steps;
      optimalMerges = merges;
      createLink()
      render()
      closeModal('editModal')
    }
    centerPlayerBox(document.querySelector('.box-row .player'))

  } catch (e) {
    createGameButton.style.display = 'none';
    error.textContent = e.message;
    info.textContent = '';
    previewBox.innerHTML = '';
  }
}

function centerPlayerBox(player) {
  if (!player) return centerBoxRow();
  player.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center'
  });
}
function centerBoxRow() {
  const preview = document.querySelector('.preview');
  const row = document.querySelector('.box-row');
  if (!preview || !row) return;

  const rowWidth = row.scrollWidth;
  const previewWidth = preview.clientWidth;

  const scrollLeft = (rowWidth - previewWidth) / 2;

  preview.scrollTo({
    left: scrollLeft,
    behavior: 'smooth',
  });
  preview.style.padding = '0.5rem'
}


//--------------------------------Sharing Handler--------------------------------//
const link = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn')
function createLink() {
  copyBtn.textContent = 'copy';
  copyBtn.style.color = bgColor;
  link.value = `${location.href.split('?')[0]}?level=${packLevelData()}`;
}

function copyShareLink() {
  navigator.clipboard.writeText(link.value);
  copyBtn.textContent = 'copied';
  copyBtn.style.color = textColor;
  document.getElementById('shareModal-CloseBtn').addEventListener('click', () => {copyBtn.textContent = 'copy';copyBtn.style.color = bgColor;},{once: true})
}

function loadLevel(url = location) {
  const param = new URL(url).searchParams.get('level');
  if (!param) return generateLevel();

  try {
    unpackLevelData(param)
    createLink();
    render();
    game.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  } catch (e) {
    alert("Failed to load level:\n" + e.message);
    location.replace(location.href.split('?')[0]);
  }
}


//--------------------------------Starting Config LoadLevel, logo, title--------------------------------//
loadLevel()

let logo = document.querySelector("link[rel~='icon']");
if (!logo) {
  logo = document.createElement('link');
  logo.rel = 'icon';
  document.head.appendChild(logo);
}
logo.href = URL.createObjectURL(new Blob([`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50" font-family="monospace" fill="${accentColor}">1D</text>
  </svg>`], { type: 'image/svg+xml' }));