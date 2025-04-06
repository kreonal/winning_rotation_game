const app = document.getElementById('app');

// Empty array to be filled with rankers
const rankers = [];

let state = {
  screen: 'topic',
  playerName: '',
  selectedTopic: '',
  topics: ['Kanye Songs'],
  players: [],
  currentTurnIndex: 0,
  draftPhaseStep: 0, // 0 = pick phase
  items: [],
  picksPerPlayer: 5,
  draftComplete: false,
  viewingRotations: false,
  showConfirmPick: false,
  pickPendingIndex: null,
  narration: '',
  revealStep: 0, // To track which song we're revealing (0 to 4)
  rankings: [],   // Store rankings here
  playerScores: {} // Store scores for each player
};

const ITEM_POOL = [
  'Runaway', 'Power', 'Through the Wire', 'Gold Digger',
  'All Falls Down', 'Flashing Lights', 'Monster', 'Blame Game',
  'Devil in a New Dress', 'Stronger', 'Can\'t Tell Me Nothing',
  'Touch the Sky', 'Jesus Walks', 'Slow Jamz', 'Gorgeous',
  'Dark Fantasy', 'So Appalled', 'Hey Mama', 'Diamonds from Sierra Leone',
  'Good Life', 'Heartless', 'Love Lockdown', 'Lost in the World', 'All of the Lights'
];

// Simulated rankers
function generateRandomWeights() {
  const randomImpact = Math.random();
  const randomQuality = Math.random();
  const randomPopularity = 1 - (randomImpact + randomQuality);
  
  if (randomPopularity < 0) {
    return generateRandomWeights();
  }

  return { popularity: randomPopularity, impact: randomImpact, quality: randomQuality };
}

// Initialize items array
const items = [];

// Generate rankers with random preferences (regenerated each game)
function generateRankers() {
  const rankers = [];

  for (let i = 0; i < 25; i++) {
    let weights;
    
    if (i < 13) { // Ensure over half favor popularity
      // Create popularity-focused rankers with some variation
      const popularityWeight = Math.random() * 0.3 + 0.5; // 0.5-0.8
      const remainingWeight = 1 - popularityWeight;
      const impactWeight = remainingWeight * Math.random();
      const qualityWeight = remainingWeight - impactWeight;
      
      weights = { 
        popularity: popularityWeight, 
        impact: impactWeight, 
        quality: qualityWeight 
      };
    } else {
      // Other rankers have more varied preferences
      weights = generateRandomWeights();
    }

    rankers.push({
      name: `Ranker ${i + 1}`,
      weights: weights
    });
  }

  return rankers;
}

// Regenerate rankers for each game session
function regenerateRankers() {
  // Clear existing rankers array
  rankers.length = 0;
  
  // Generate new rankers
  const newRankers = generateRankers();
  
  // Add them to the rankers array
  newRankers.forEach(ranker => {
    rankers.push(ranker);
  });
}

//init
function initDraft() {
    // Set up the opponents
    const opponents = ['Alfred', 'RZA'];
  
    // Set up players with the player and opponents
    state.players = [state.playerName, ...opponents].map(name => ({
      name,
      rotation: []
    }));
  
    // Create an array of items (songs) to draft from
    state.items = ITEM_POOL.map(name => ({ name, picked: false }));
  
    // Set up the turn order based on snake draft
    state.turnOrder = [];
    for (let i = 0; i < state.picksPerPlayer; i++) {
      const round = (i % 2 === 0) ? [0, 1, 2] : [2, 1, 0]; // Snake draft logic
      state.turnOrder.push(...round);
    }
  
    // Reset the current turn index
    state.currentTurnIndex = 0;
    
    // Randomize song attributes for this game session
    randomizeSongAttributes();
  
    // Set the screen to 'draft' phase
    state.screen = 'draft';
    
    // Reset any existing rankings and scores
    state.rankings = [];
    state.playerScores = {};
    
    // Call render to update the UI
    render();
}

// Create randomized song attributes for each game
function randomizeSongAttributes() {
    // Clear existing items
    items.length = 0;
    
    // Create new randomized attributes for each song
    ITEM_POOL.forEach(name => {
        // Base values with some randomization
        const basePopularity = Math.floor(Math.random() * 3) + 5; // 5-7 base
        const baseImpact = Math.floor(Math.random() * 3) + 5;     // 5-7 base
        const baseQuality = Math.floor(Math.random() * 3) + 5;    // 5-7 base
        
        // Add some random variation (±1)
        const popularity = Math.max(1, Math.min(10, basePopularity + (Math.random() > 0.5 ? 1 : -1)));
        const impact = Math.max(1, Math.min(10, baseImpact + (Math.random() > 0.5 ? 1 : -1)));
        const quality = Math.max(1, Math.min(10, baseQuality + (Math.random() > 0.5 ? 1 : -1)));
        
        items.push({ name, popularity, impact, quality });
    });
}

// Scoring engine
function getRankerScores() {
    // For each ranker, calculate their top 5 songs based on their preferences
    const rankerVotes = rankers.map(ranker => {
        // Calculate a score for each song based on the ranker's weights
        const songScores = items.map(item => {
            // Base score from attributes and weights
            const baseScore = (item.popularity * ranker.weights.popularity) + 
                              (item.impact * ranker.weights.impact) + 
                              (item.quality * ranker.weights.quality);
            
            // Add small random factor (±10%) to create variety between sessions
            const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
            const score = baseScore * randomFactor;
            
            return { name: item.name, score: score };
        });
        
        // Sort by score and take top 5
        songScores.sort((a, b) => b.score - a.score);
        return songScores.slice(0, 5);
    });
    
    return rankerVotes;
}

function calculatePoints() {
    const rankerVotes = getRankerScores();
    
    // Initialize points for each song
    const points = {};
    ITEM_POOL.forEach(name => {
        points[name] = 0;
    });
    
    // Count votes for each song based on ranker rankings
    rankerVotes.forEach(topFive => {
        // Award points based on position (5 points for 1st, 4 for 2nd, etc.)
        topFive.forEach((vote, index) => {
            points[vote.name] = (points[vote.name] || 0) + (5 - index);
        });
    });
    
    // Convert to array and sort by points
    const pointsArray = Object.entries(points).map(([name, points]) => ({
        name,
        points
    })).sort((a, b) => b.points - a.points);
    
    // Take the top 5 consensus picks
    const consensusTop5 = pointsArray.slice(0, 5);
    
    // Assign point values for players (5 points for 1st, 4 for 2nd, etc.)
    const finalPointValues = [5, 4, 3, 2, 1]; // 5 points for 1st, 1 point for 5th
    const consensusWithPoints = consensusTop5.map((item, index) => ({
        name: item.name,
        points: finalPointValues[index], // 5 points for 1st, 4 for 2nd, etc.
        rank: index + 1 // 1st, 2nd, 3rd, etc.
    }));
    
    // Reset player scores
    state.players.forEach(player => {
        state.playerScores[player.name] = 0;
    });
    
    // Store the consensus rankings in reverse order (5th to 1st) for revealing
    state.rankings = [...consensusWithPoints].reverse();
    
    return consensusWithPoints;
}

// Starting the survey
window.startSurvey = function () {
  // Reset all player scores to 0 before starting survey
  state.players.forEach(player => {
    state.playerScores[player.name] = 0;
  });
  
  state.rankings = [];        // Clear any previous rankings
  state.screen = 'scoring';   // Set to scoring phase (individual reveals)
  state.revealStep = 0;       // Start with the first song (5th place)
  render();                   // Update the UI - scoring will calculate points
};

// Initial setup when page loads
function initialize() {
  // Fill the rankers array
  regenerateRankers();
  
  // Initialize items array with randomized attributes
  randomizeSongAttributes();
  
  // Render the initial screen
  render();
}

// Initial render to start the game
initialize();

// Handle game states
function render() {
  if (state.screen === 'topic') return renderTopicSelection();
  if (state.screen === 'rotation') return renderRotationView();
  if (state.screen === 'name') return renderNameEntry();
  if (state.screen === 'draft') return renderDraftPhase();
  if (state.screen === 'surveyResults') return renderSurveyResults();
  if (state.screen === 'scoring') return renderScoring();
}

function renderTopicSelection() {
  app.innerHTML = `
    <div class="screen">
      <h1>Select a Topic</h1>
      <div class="grid">
        ${state.topics.map(topic => `
          <div class="topic-card" onclick="selectTopic('${topic}')">
            ${topic}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderNameEntry() {
  app.innerHTML = `
    <div class="screen">
      <h1>Enter Your Name</h1>
      <input type="text" id="nameInput" placeholder="Your name" />
      <button class="button" onclick="submitName()">Continue</button>
    </div>
  `;
}

function renderDraftPhase() {
  const currentPlayerIndex = state.turnOrder[state.currentTurnIndex];
  const currentPlayer = state.players[currentPlayerIndex];
  const isUserTurn = currentPlayerIndex === 0;

  let content = `
    <div class="screen">
      <h1>Draft Phase</h1>
      <p>Round ${Math.floor(state.currentTurnIndex / 3) + 1} of ${state.picksPerPlayer}</p>
      ${state.narration ? `<div class="host-message">${state.narration}</div>` : ''}
      <button class="button secondary" onclick="toggleView()">
        ${state.viewingRotations ? 'Back to Draft Board' : 'View Rotations'}
      </button>
  `;

  if (state.viewingRotations) {
    content += renderRotationView();
  } else if (isUserTurn && state.showConfirmPick && state.pickPendingIndex !== null) {
    const item = state.items[state.pickPendingIndex];
    content += `
      <p>Are you sure you want to draft <strong>${item.name}</strong>?</p>
      <button class="button" onclick="confirmPick()">Confirm</button>
      <button class="button secondary" onclick="cancelPick()">Cancel</button>
    `;
  } else if (isUserTurn) {
    content += `<p>It's your turn to pick!</p><div class="grid">`;
    state.items.forEach((item, i) => {
      const isPicked = item.picked;
      content += `
        <div class="topic-card ${isPicked ? 'picked' : ''}" 
             ${!isPicked ? `onclick="promptPick(${i})"` : ''}>
          ${item.name}
        </div>
      `;
    });
    content += `</div>`;
  } else {
    content += `
      <p>It's ${currentPlayer.name}'s turn to pick!</p>
      <button class="button" onclick="handleCpuTurn()">Next</button>
    `;
  }

  content += `</div>`;
  app.innerHTML = content;
}

function renderRotationView() {
  let view = `<div class="screen">
    <h1>Player Rotations</h1>
    <div class="rotation-view">`;
  
  state.players.forEach(player => {
    view += `<div class="player-rotation"><h3>${player.name}'s Rotation</h3><ol>`;
    for (let i = 0; i < state.picksPerPlayer; i++) {
      const pick = player.rotation[i];
      view += `<li class="${pick ? '' : 'empty'}">${pick || '–'}</li>`;
    }
    view += `</ol></div>`;
  });
  
  view += `</div>
    <button class="button" onclick="goBackToDraft()">Back to Draft</button>
  </div>`;
  
  return view;
}

function renderSurveyResults() {
  // Need to handle case where we go directly to results
  if (!state.rankings.length) {
    calculatePoints();
  }
  
  // Get consensus rankings in correct order (1st to 5th)
  const topSongs = [...state.rankings].reverse();

  let content = `
    <div class="screen">
      <h1>Final Survey Results</h1>
      <p>Here's the consensus top 5 from our 25 rankers:</p>
      <ol>
  `;
  
  // Display top 5 songs from 1st to 5th
  topSongs.forEach((item) => {
    content += `<li><strong>${item.name}</strong> (${item.points} points awarded)</li>`;
  });
  
  content += `</ol>
      <h2>Final Scores:</h2>
      <ul>
  `;
  
  // Get player rankings based on scores
  const playerRankings = Object.entries(state.playerScores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);
  
  // Display the final scores for each player
  playerRankings.forEach(player => {
    content += `<li>${player.name}: ${player.score} points</li>`;
  });
  
  // Only show winner if someone has points
  if (playerRankings.length > 0 && playerRankings[0].score > 0) {
    content += `<h2>Winner: ${playerRankings[0].name}!</h2>`;
  } else {
    content += `<h2>No winner this time!</h2>`;
  }
  
  content += `<button class="button" onclick="goToMainMenu()">Play Again</button>
    </div>`;
  
  app.innerHTML = content;
}

function renderScoring() {
    // On first render, calculate the rankings
    if (state.revealStep === 0 && !state.rankings.length) {
        calculatePoints(); // This will set state.rankings with the consensus top 5 in reverse order (5th to 1st)
    }
    
    // Get the current item being revealed (5th to 1st)
    const currentItem = state.rankings[state.revealStep];
    
    // Find which player(s) have this song in their rotation
    const playersWithSong = state.players.filter(player => 
        player.rotation.includes(currentItem.name)
    );
    
    // Determine the rank (5th, 4th, 3rd, 2nd, 1st)
    const rank = 5 - state.revealStep;
    
    let content = `
      <div class="screen">
        <h1>Survey Results</h1>
        <p>Here's what our 25 rankers decided:</p>
        <p><strong>${getRankText(rank)} Ranked Song:</strong> ${currentItem.name}</p>
    `;
    
    // If someone had the song, they get points
    if (playersWithSong.length > 0) {
        playersWithSong.forEach(player => {
            state.playerScores[player.name] = (state.playerScores[player.name] || 0) + currentItem.points;
            content += `<p>${player.name} had this in their rotation! They get ${currentItem.points} points.</p>`;
        });
    } else {
        content += `<p>Nobody had this in their rotation! No points awarded.</p>`;
    }
    
    content += `
        <h2>Current Scoreboard:</h2>
        <ul>
    `;
    
    // Display the current total score for each player
    Object.entries(state.playerScores)
        .sort((a, b) => b[1] - a[1]) // Sort by score high to low
        .forEach(([playerName, score]) => {
            content += `<li>${playerName}: ${score} points</li>`;
        });
    
    content += `
        </ul>
    `;
    
    // Show the "Next" button for the next song, or "Final Results" when all songs have been revealed
    if (state.revealStep < 4) {
        content += `<button class="button" onclick="nextReveal()">Next</button>`;
    } else {
        content += `<button class="button" onclick="showFinalResults()">Show Final Results</button>`;
    }
    
    content += '</div>';
    app.innerHTML = content;
}

window.selectTopic = function (topic) {
  state.selectedTopic = topic;
  state.screen = 'name';
  render();
};

window.submitName = function () {
  const nameInput = document.getElementById('nameInput');
  state.playerName = nameInput.value || 'Player';
  initDraft();
};

window.promptPick = function (index) {
  state.showConfirmPick = true;
  state.pickPendingIndex = index;
  render();
};

window.confirmPick = function () {
  const item = state.items[state.pickPendingIndex];
  item.picked = true;
  state.players[0].rotation.push(item.name);
  state.showConfirmPick = false;
  state.pickPendingIndex = null;
  advanceTurnWithNarration(0, item.name);
};

window.cancelPick = function () {
  state.showConfirmPick = false;
  state.pickPendingIndex = null;
  render();
};

window.handleCpuTurn = function () {
    if (state.draftComplete) {
        console.log("Draft is complete. No more turns for CPU.");
        return; // Exit the function if the draft is complete
    }

    // Proceed with CPU turn logic
    const currentPlayerIndex = state.turnOrder[state.currentTurnIndex];
    const cpu = state.players[currentPlayerIndex];
    const availableItems = state.items.filter(i => !i.picked);

    if (availableItems.length === 0) {
        console.error('No available items left for CPU to pick!');
        return; // Exit the function if no items are left
    }

    // Pick an item for the CPU
    const picked = availableItems[Math.floor(Math.random() * availableItems.length)];
    picked.picked = true;
    cpu.rotation.push(picked.name);

    // Advance to the next turn with narration
    advanceTurnWithNarration(currentPlayerIndex, picked.name);
};

function advanceTurnWithNarration(playerIndex, itemName) {
  const player = state.players[playerIndex];
  const randPhrases = [
    `${player.name} just picked ${itemName}.`,
    `Nice pickup by ${player.name} — they grabbed ${itemName}.`,
    `${player.name} snags ${itemName} off the board.`,
    `Big move! ${player.name} takes ${itemName}.`
  ];

  const msg = randPhrases[Math.floor(Math.random() * randPhrases.length)];
  const nextTurnIndex = state.currentTurnIndex + 1;
  const isBackToBack = nextTurnIndex < state.turnOrder.length && 
                        state.turnOrder[nextTurnIndex] === playerIndex;

  if (isBackToBack) {
    const backToBackLines = [
      `They're picking back to back here.`,
      `And they're right back on the clock.`,
      `Double dipping with another pick...`,
      `They're sticking around for the next one too.`
    ];
    state.narration = `${msg} ${backToBackLines[Math.floor(Math.random() * backToBackLines.length)]}`;
  } else {
    state.narration = msg;
  }

  // Move turn forward BEFORE rendering
  state.currentTurnIndex++;

  // Check if all players have completed their rotations (picked their songs)
  const allPlayersComplete = state.players.every(player => 
    player.rotation.length >= state.picksPerPlayer
  );

  // Consolidated check: If draft is complete, switch to scoring phase
  if (state.currentTurnIndex >= state.turnOrder.length || allPlayersComplete) {
    state.draftComplete = true;
    
    // Add a "Start Survey" button after draft completion
    let content = `
      <div class="screen">
        <h1>Draft Complete!</h1>
        <p>All players have completed their rotations.</p>
        <button class="button" onclick="startSurvey()">Start Survey</button>
        <button class="button secondary" onclick="toggleView()">View Final Rotations</button>
      </div>
    `;
    app.innerHTML = content;
    return;  // Exit function to prevent further turns
  }

  render();
}

function goToMainMenu() {
    // Reset the game state
    state = {
      screen: 'topic',
      playerName: '',
      selectedTopic: '',
      topics: ['Kanye Songs'],
      players: [],
      currentTurnIndex: 0,
      draftPhaseStep: 0,
      items: [],
      picksPerPlayer: 5,
      draftComplete: false,
      viewingRotations: false,
      showConfirmPick: false,
      pickPendingIndex: null,
      narration: '',
      revealStep: 0,
      rankings: [],
      playerScores: {}
    };
    
    // Regenerate rankers for a fresh game
    regenerateRankers();
    
    render();
}

window.nextReveal = function() {
    state.revealStep++;
    render();
}

window.showFinalResults = function() {
    state.screen = 'surveyResults';
    render();
}

window.toggleView = function () {
    state.viewingRotations = !state.viewingRotations;
    render();
};

window.goBackToDraft = function() {
  state.screen = 'draft';
  state.viewingRotations = false;
  render();
}

function getRankText(rank) {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`; // For 4th, 5th, etc.
}