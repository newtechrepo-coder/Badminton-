// DOM Elements
const loginPage = document.getElementById('login-page');
const registrationPage = document.getElementById('registration-page');
const fixturesPage = document.getElementById('fixtures-page');
const adminDashboard = document.getElementById('admin-dashboard');

const adminLoginBtn = document.getElementById('admin-login-btn');
const backToHomeBtn = document.getElementById('back-to-home');
const loginForm = document.getElementById('login-form');
const adminLogoutBtn = document.getElementById('admin-logout');

const registrationForm = document.getElementById('registration-form');
const registerBtn = document.getElementById('register-btn');
const registrationStatus = document.getElementById('registration-status');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Player lists
const singlesList = document.getElementById('singles-list');
const doublesList = document.getElementById('doubles-list');
const allPlayersList = document.getElementById('all-players-list');

// Admin controls
const toggleRegistrationBtn = document.getElementById('toggle-registration');
const regStatusSpan = document.getElementById('reg-status');
const removePlayerBtn = document.getElementById('remove-player');
const searchPlayerInput = document.getElementById('search-player');
const generateFixturesBtn = document.getElementById('generate-fixtures');
const resetFixturesBtn = document.getElementById('reset-fixtures');
const fixtureGenerationStatus = document.getElementById('fixture-generation-status');

// Doubles pairing
const player1Select = document.getElementById('player1-select');
const player2Select = document.getElementById('player2-select');
const pairPlayersBtn = document.getElementById('pair-players');
const doublesPairsList = document.getElementById('doubles-pairs-list');

// Fixtures containers
const singlesFixtures = document.getElementById('singles-fixtures');
const doublesFixtures = document.getElementById('doubles-fixtures');
const adminSinglesFixtures = document.getElementById('admin-singles-fixtures');
const adminDoublesFixtures = document.getElementById('admin-doubles-fixtures');

// State variables
let isAdmin = false;
let registrationOpen = true;
let players = [];
let doublesPairs = [];
let fixtures = {
    singles: {},
    doubles: {}
};

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Test Firestore access first
    const isAccessible = await testFirestoreAccess();
    if (!isAccessible) {
        registrationStatus.innerHTML = '<div class="status-message error">Unable to connect to database. Please check your internet connection or contact the administrator.</div>';
        registerBtn.disabled = true;
        registerBtn.textContent = 'Unavailable';
    }

    // Check authentication state
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            isAdmin = true;
            showAdminDashboard();
            await loadAllData();
        } else {
            isAdmin = false;
            if (!loginPage.classList.contains('hidden')) {
                showRegistrationPage();
            }
        }
    });

    // Load initial data
    await loadRegistrationStatus();
    await loadPlayers();
    await loadFixtures();

    // Set up event listeners
    setupEventListeners();
    setupTabListeners();
});

// Test Firestore connectivity
async function testFirestoreAccess() {
    try {
        // Try to read from settings collection
        const settingsDoc = await firebaseDb.collection('settings').doc('registration').get();
        console.log('Firestore read test successful');
        
        // If document doesn't exist, create it
        if (!settingsDoc.exists) {
            await firebaseDb.collection('settings').doc('registration').set({
                isOpen: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Registration settings initialized');
        }
        
        return true;
    } catch (error) {
        console.error('Firestore access test failed:', error);
        return false;
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Admin login button
    adminLoginBtn.addEventListener('click', () => {
        showLoginPage();
    });

    // Back to home button
    backToHomeBtn.addEventListener('click', () => {
        showRegistrationPage();
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await firebaseAuth.signInWithEmailAndPassword(email, password);
            // User will be redirected by auth state observer
        } catch (error) {
            showError('Login failed: ' + error.message);
        }
    });

    // Admin logout
    adminLogoutBtn.addEventListener('click', async () => {
        try {
            await firebaseAuth.signOut();
            showRegistrationPage();
        } catch (error) {
            showError('Logout failed: ' + error.message);
        }
    });

    // Player registration
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!registrationOpen) {
            showError('Registration is currently closed.');
            return;
        }

        const name = document.getElementById('player-name').value.trim();
        const email = document.getElementById('player-email').value.trim();
        const singlesChecked = document.getElementById('singles-checkbox').checked;
        const doublesChecked = document.getElementById('doubles-checkbox').checked;

        if (!name || !email) {
            showError('Please fill in all fields.');
            return;
        }

        if (!singlesChecked && !doublesChecked) {
            showError('Please select at least one category.');
            return;
        }

        try {
            await registerPlayer(name, email, singlesChecked, doublesChecked);
            showSuccess('Registration successful!');
            registrationForm.reset();
            await loadPlayers();
        } catch (error) {
            showError('Registration failed: ' + error.message);
        }
    });

    // Toggle registration
    toggleRegistrationBtn.addEventListener('click', async () => {
        registrationOpen = !registrationOpen;
        await updateRegistrationStatus(registrationOpen);
        updateRegistrationUI();
    });

    // Remove player
    removePlayerBtn.addEventListener('click', async () => {
        const selectedItems = allPlayersList.querySelectorAll('li.selected');
        if (selectedItems.length === 0) {
            showError('Please select a player to remove.');
            return;
        }

        if (!confirm('Are you sure you want to remove the selected players?')) {
            return;
        }

        try {
            for (let item of selectedItems) {
                const playerId = item.dataset.id;
                await removePlayer(playerId);
            }
            showSuccess('Player(s) removed successfully.');
            await loadPlayers();
            await loadAllPlayersForAdmin();
        } catch (error) {
            showError('Failed to remove player: ' + error.message);
        }
    });

    // Search player
    searchPlayerInput.addEventListener('input', filterPlayers);

    // Generate fixtures
    generateFixturesBtn.addEventListener('click', async () => {
        if (players.length === 0) {
            showError('No players registered yet.');
            return;
        }

        if (!confirm('This will generate fixtures and close registration. Continue?')) {
            return;
        }

        try {
            await generateTournamentFixtures();
            showSuccess('Fixtures generated successfully!');
            await loadFixtures();
            // Close registration after generating fixtures
            await updateRegistrationStatus(false);
            updateRegistrationUI();
        } catch (error) {
            showError('Failed to generate fixtures: ' + error.message);
        }
    });

    // Reset fixtures
    resetFixturesBtn.addEventListener('click', async () => {
        if (!confirm('This will delete all fixtures. Continue?')) {
            return;
        }

        try {
            await resetAllFixtures();
            showSuccess('Fixtures reset successfully!');
            await loadFixtures();
        } catch (error) {
            showError('Failed to reset fixtures: ' + error.message);
        }
    });

    // Pair players for doubles
    pairPlayersBtn.addEventListener('click', async () => {
        const selectedPlayer1 = Array.from(player1Select.selectedOptions).map(opt => opt.value);
        const selectedPlayer2 = Array.from(player2Select.selectedOptions).map(opt => opt.value);

        if (selectedPlayer1.length !== 1 || selectedPlayer2.length !== 1) {
            showError('Please select exactly one player from each list.');
            return;
        }

        if (selectedPlayer1[0] === selectedPlayer2[0]) {
            showError('Cannot pair a player with themselves.');
            return;
        }

        try {
            await pairDoublesPlayers(selectedPlayer1[0], selectedPlayer2[0]);
            showSuccess('Players paired successfully!');
            await loadDoublesPairs();
            await loadPlayersForPairing();
        } catch (error) {
            showError('Failed to pair players: ' + error.message);
        }
    });
}

// Setup tab functionality
function setupTabListeners() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Get the tab group (find closest parent with tab buttons)
            const tabGroup = btn.closest('.tab-container');
            const tabId = btn.dataset.tab;
            
            // Remove active class from all buttons in this group
            tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Hide all panes in this group
            tabGroup.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Show the corresponding pane
            const pane = document.getElementById(tabId + '-tab') || 
                         tabGroup.querySelector(`[id$="${tabId}-tab"]`);
            if (pane) {
                pane.classList.add('active');
            }
        });
    });
}

// Page Navigation Functions
function showLoginPage() {
    hideAllPages();
    loginPage.classList.remove('hidden');
    document.getElementById('email').focus();
}

function showRegistrationPage() {
    hideAllPages();
    registrationPage.classList.remove('hidden');
}

function showFixturesPage() {
    hideAllPages();
    fixturesPage.classList.remove('hidden');
}

function showAdminDashboard() {
    hideAllPages();
    adminDashboard.classList.remove('hidden');
    loadAllPlayersForAdmin();
    loadDoublesPairs();
    loadPlayersForPairing();
}

function hideAllPages() {
    loginPage.classList.add('hidden');
    registrationPage.classList.add('hidden');
    fixturesPage.classList.add('hidden');
    adminDashboard.classList.add('hidden');
}

// Player Registration Functions
async function registerPlayer(name, email, inSingles, inDoubles) {
    try {
        // Check if player already exists with same email
        const playersSnapshot = await firebaseDb.collection('players')
            .where('email', '==', email)
            .get();
            
        if (!playersSnapshot.empty) {
            // Update existing player's categories
            const existingPlayer = playersSnapshot.docs[0];
            const updatedSingles = existingPlayer.data().inSingles || inSingles;
            const updatedDoubles = existingPlayer.data().inDoubles || inDoubles;
            
            await firebaseDb.collection('players').doc(existingPlayer.id).update({
                inSingles: updatedSingles,
                inDoubles: updatedDoubles,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Create new player
            await firebaseDb.collection('players').add({
                name: name,
                email: email,
                inSingles: inSingles,
                inDoubles: inDoubles,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        // Check if it's a permissions error
        if (error.code === 'permission-denied' || error.message.includes('permission') || error.message.includes('Permission')) {
            throw new Error('Registration is currently unavailable. Please try again later or contact the administrator.');
        } else {
            throw error;
        }
    }
}

// Data Loading Functions
async function loadRegistrationStatus() {
    try {
        const statusDoc = await firebaseDb.collection('settings').doc('registration').get();
        if (statusDoc.exists) {
            registrationOpen = statusDoc.data().isOpen;
        } else {
            // Initialize with default value
            await firebaseDb.collection('settings').doc('registration').set({
                isOpen: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            registrationOpen = true;
        }
        updateRegistrationUI();
    } catch (error) {
        console.error('Error loading registration status:', error);
        // Don't fail completely on permission errors for reading
        if (error.code !== 'permission-denied') {
            registrationOpen = true; // Default to open if there's an error
        }
    }
}

async function loadPlayers() {
    try {
        const snapshot = await firebaseDb.collection('players').get();
        players = [];
        snapshot.forEach(doc => {
            players.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort players by name
        players.sort((a, b) => a.name.localeCompare(b.name));
        
        displayPlayers();
    } catch (error) {
        console.error('Error loading players:', error);
        showError('Failed to load players.');
    }
}

async function loadAllPlayersForAdmin() {
    if (!isAdmin) return;
    
    try {
        allPlayersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name.toUpperCase()} (${player.email}) - ${getPlayerCategories(player)}`;
            li.dataset.id = player.id;
            li.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
            allPlayersList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading players for admin:', error);
    }
}

function displayPlayers() {
    // Clear lists
    singlesList.innerHTML = '';
    doublesList.innerHTML = '';
    
    // Filter and display players
    const singlesPlayers = players.filter(p => p.inSingles);
    const doublesPlayers = players.filter(p => p.inDoubles);
    
    singlesPlayers.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name.toUpperCase();
        singlesList.appendChild(li);
    });
    
    doublesPlayers.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name.toUpperCase();
        doublesList.appendChild(li);
    });
}

async function loadDoublesPairs() {
    if (!isAdmin) return;
    
    try {
        const snapshot = await firebaseDb.collection('doublesPairs').get();
        doublesPairs = [];
        snapshot.forEach(doc => {
            doublesPairs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayDoublesPairs();
    } catch (error) {
        console.error('Error loading doubles pairs:', error);
    }
}

async function loadPlayersForPairing() {
    if (!isAdmin) return;
    
    try {
        // Get players registered for doubles
        const doublesPlayers = players.filter(p => p.inDoubles);
        
        // Get players already in pairs
        const pairedPlayerIds = new Set();
        doublesPairs.forEach(pair => {
            pairedPlayerIds.add(pair.player1Id);
            pairedPlayerIds.add(pair.player2Id);
        });
        
        // Filter unpaired players
        const unpairedPlayers = doublesPlayers.filter(p => !pairedPlayerIds.has(p.id));
        
        // Populate select elements
        player1Select.innerHTML = '';
        player2Select.innerHTML = '';
        
        unpairedPlayers.forEach(player => {
            const option1 = document.createElement('option');
            option1.value = player.id;
            option1.textContent = player.name.toUpperCase();
            player1Select.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = player.id;
            option2.textContent = player.name.toUpperCase();
            player2Select.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading players for pairing:', error);
    }
}

async function loadFixtures() {
    try {
        // Load singles fixtures
        const singlesSnapshot = await firebaseDb.collection('fixtures').doc('singles').get();
        if (singlesSnapshot.exists) {
            fixtures.singles = singlesSnapshot.data();
            displayFixtures('singles', fixtures.singles);
        } else {
            fixtures.singles = {};
            singlesFixtures.innerHTML = '<p>No singles fixtures available yet.</p>';
            adminSinglesFixtures.innerHTML = '<p>No singles fixtures available yet.</p>';
        }
        
        // Load doubles fixtures
        const doublesSnapshot = await firebaseDb.collection('fixtures').doc('doubles').get();
        if (doublesSnapshot.exists) {
            fixtures.doubles = doublesSnapshot.data();
            displayFixtures('doubles', fixtures.doubles);
        } else {
            fixtures.doubles = {};
            doublesFixtures.innerHTML = '<p>No doubles fixtures available yet.</p>';
            adminDoublesFixtures.innerHTML = '<p>No doubles fixtures available yet.</p>';
        }
        
        // Show fixtures page if fixtures exist
        if ((singlesSnapshot.exists && Object.keys(fixtures.singles).length > 0) || 
            (doublesSnapshot.exists && Object.keys(fixtures.doubles).length > 0)) {
            if (!isAdmin) {
                showFixturesPage();
            }
        }
    } catch (error) {
        console.error('Error loading fixtures:', error);
        showError('Failed to load fixtures. Please try again later.');
    }
}

// Helper Functions
function getPlayerCategories(player) {
    const categories = [];
    if (player.inSingles) categories.push('Singles');
    if (player.inDoubles) categories.push('Doubles');
    return categories.join(', ') || 'None';
}

function displayDoublesPairs() {
    doublesPairsList.innerHTML = '';
    
    if (doublesPairs.length === 0) {
        doublesPairsList.innerHTML = '<p>No pairs created yet.</p>';
        return;
    }
    
    doublesPairs.forEach(pair => {
        const player1 = players.find(p => p.id === pair.player1Id);
        const player2 = players.find(p => p.id === pair.player2Id);
        
        const p = document.createElement('p');
        p.textContent = `${(player1?.name || 'UNKNOWN').toUpperCase()} & ${(player2?.name || 'UNKNOWN').toUpperCase()}`;
        doublesPairsList.appendChild(p);
    });
}

function displayFixtures(type, fixtureData) {
    // Display for player view
    const playerContainer = type === 'singles' ? singlesFixtures : doublesFixtures;
    // Display for admin view
    const adminContainer = type === 'singles' ? adminSinglesFixtures : adminDoublesFixtures;
    
    // Clear containers
    playerContainer.innerHTML = '';
    adminContainer.innerHTML = '';
    
    // Check if fixture data is valid
    if (!fixtureData || typeof fixtureData !== 'object') {
        playerContainer.innerHTML = `<p>No ${type} fixtures available yet.</p>`;
        adminContainer.innerHTML = `<p>No ${type} fixtures available yet.</p>`;
        return;
    }
    
    // Define the correct order of rounds
    const roundOrder = [
        'first', 
        'round2', 
        'round3', 
        'round4', 
        'round5', 
        'round6', 
        'round7', 
        'round8', 
        'round16', 
        'quarterfinal', 
        'semifinal', 
        'final'
    ];
    
    // Get all round keys from fixture data
    const roundKeys = Object.keys(fixtureData).filter(key => key !== 'roundOrder');
    
    // If no rounds found, display message
    if (roundKeys.length === 0) {
        playerContainer.innerHTML = `<p>No ${type} fixtures available yet.</p>`;
        adminContainer.innerHTML = `<p>No ${type} fixtures available yet.</p>`;
        return;
    }
    
    // Sort rounds according to predefined order
    const sortedRounds = roundKeys.sort((a, b) => {
        const indexA = roundOrder.indexOf(a);
        const indexB = roundOrder.indexOf(b);
        
        // If round not found in predefined order, put it at the end
        if (indexA === -1 && indexB === -1) {
            return a.localeCompare(b);
        }
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
    });
    
    // Display rounds in sorted order
    sortedRounds.forEach(roundKey => {
        // Skip if this key is not a round (like roundOrder)
        if (!fixtureData[roundKey] || !fixtureData[roundKey].matches) {
            return;
        }
        
        const round = fixtureData[roundKey];
        const roundName = getRoundName(roundKey, round.matches.length);
        
        // Create round container
        const playerRoundDiv = document.createElement('div');
        playerRoundDiv.className = 'round';
        
        const adminRoundDiv = document.createElement('div');
        adminRoundDiv.className = 'round';
        
        // Set round title
        const roundTitle = `<h3>${roundName}</h3>`;
        playerRoundDiv.innerHTML = roundTitle;
        adminRoundDiv.innerHTML = roundTitle;
        
        // Check if matches array exists and is an array
        if (!Array.isArray(round.matches)) {
            console.warn(`Invalid matches data for round ${roundKey}`);
            return;
        }
        
        // Add matches to round
        round.matches.forEach((match, index) => {
            // Ensure match object is valid
            if (!match) {
                match = { player1: null, player2: null, winner: null };
            }
            
            match.matchNumber = index + 1;
            
            // Player view
            const playerMatchDiv = createPlayerMatchElement(match, type);
            playerMatchDiv.dataset.matchNumber = index + 1;
            playerRoundDiv.appendChild(playerMatchDiv);
            
            // Admin view
            const adminMatchDiv = createAdminMatchElement(match, type, roundKey, index);
            adminMatchDiv.dataset.matchNumber = index + 1;
            adminRoundDiv.appendChild(adminMatchDiv);
        });
        
        playerContainer.appendChild(playerRoundDiv);
        adminContainer.appendChild(adminRoundDiv);
    });
}

function createPlayerMatchElement(match, type) {
    const matchDiv = document.createElement('div');
    matchDiv.className = 'match';
    if (match.isBye) matchDiv.classList.add('is-bye');
    
    let html = '';
    
    // Match number
    html += `<div class="match-number">Match ${match.matchNumber || 1}</div>`;
    
    // Handle player1 and player2 display
    const player1Display = match.player1 ? getPlayerDisplayName(match.player1, type).toUpperCase() : '';
    const player2Display = match.player2 ? getPlayerDisplayName(match.player2, type).toUpperCase() : '';
    
    if (match.player1 && match.player2) {
        html += `
            <div class="player">
                <span>${player1Display}</span>
            </div>
            <div class="vs">VS</div>
            <div class="player">
                <span>${player2Display}</span>
            </div>
        `;
    } else if (match.player1) {
        html += `
            <div class="player">
                <span>${player1Display}</span>
            </div>
            <div class="vs">VS</div>
            <div class="player">
                <span>BYE</span>
            </div>
        `;
    } else if (match.player2) {
        html += `
            <div class="player">
                <span>BYE</span>
            </div>
            <div class="vs">VS</div>
            <div class="player">
                <span>${player2Display}</span>
            </div>
        `;
    } else {
        html += '<p>Match to be scheduled</p>';
    }
    
    // Show winner if match is completed
    if (match.winner) {
        const winnerDisplay = getPlayerDisplayName(match.winner, type).toUpperCase();
        html += `<div class="winner">WINNER: ${winnerDisplay}</div>`;
    }
    
    matchDiv.innerHTML = html;
    return matchDiv;
}

function createAdminMatchElement(match, type, roundKey, matchIndex) {
    const matchDiv = document.createElement('div');
    matchDiv.className = 'match';
    matchDiv.dataset.round = roundKey;
    matchDiv.dataset.matchIndex = matchIndex;
    if (match.isBye) matchDiv.classList.add('is-bye');
    
    let html = '';
    
    // Match number
    html += `<div class="match-number">Match ${matchIndex + 1}</div>`;
    
    // Editable player fields for admin
    const player1DisplayName = match.player1 ? getPlayerDisplayName(match.player1, type) : '';
    const player2DisplayName = match.player2 ? getPlayerDisplayName(match.player2, type) : '';
    
    html += `
        <div class="player">
            <input type="text" class="player-input" data-player="1" value="${player1DisplayName.toUpperCase()}" placeholder="PLAYER 1">
        </div>
        <div class="vs">VS</div>
        <div class="player">
            <input type="text" class="player-input" data-player="2" value="${player2DisplayName.toUpperCase()}" placeholder="PLAYER 2">
        </div>
    `;
    
    // Winner selection - now using select dropdown for better UX
    let winnerSelected1 = '';
    let winnerSelected2 = '';
    let winnerSelectedNone = 'selected';
    
    if (match.winner === match.player1) {
        winnerSelected1 = 'selected';
        winnerSelectedNone = '';
    } else if (match.winner === match.player2) {
        winnerSelected2 = 'selected';
        winnerSelectedNone = '';
    }
    
    html += `
        <div class="match-controls">
            <div>
                <label for="winner-${roundKey}-${matchIndex}">Select Winner:</label>
                <select id="winner-${roundKey}-${matchIndex}" class="winner-select">
                    <option value="" ${winnerSelectedNone}>Select Winner</option>
                    <option value="1" ${winnerSelected1}>Player 1 (${player1DisplayName.toUpperCase()})</option>
                    <option value="2" ${winnerSelected2}>Player 2 (${player2DisplayName.toUpperCase()})</option>
                </select>
            </div>
            <button class="btn save-match" data-round="${roundKey}" data-match-index="${matchIndex}">SAVE RESULT</button>
        </div>
    `;
    
    matchDiv.innerHTML = html;
    
    // Add event listener to save button
    const saveBtn = matchDiv.querySelector('.save-match');
    saveBtn.addEventListener('click', async () => {
        await saveMatchResult(type, roundKey, matchIndex, matchDiv);
    });
    
    return matchDiv;
}

function getPlayerDisplayName(player, type) {
    if (!player) return '';
    
    if (type === 'doubles' && player.player1Id && player.player2Id) {
        const player1 = players.find(p => p.id === player.player1Id);
        const player2 = players.find(p => p.id === player.player2Id);
        return `${player1?.name || 'UNKNOWN'} & ${player2?.name || 'UNKNOWN'}`;
    } else if (typeof player === 'string') {
        return player;
    } else if (player && player.name) {
        return player.name;
    }
    
    return 'UNKNOWN PLAYER';
}

function getRoundName(roundKey, matchCount) {
    if (roundKey === 'final') return 'FINAL';
    if (roundKey === 'semifinal') return 'SEMIFINAL';
    if (roundKey === 'quarterfinal') return 'QUARTERFINAL';
    if (roundKey === 'round16') return 'ROUND OF 16';
    if (roundKey === 'first') return 'FIRST ROUND';
    
    if (roundKey.startsWith('round')) {
        const roundNum = parseInt(roundKey.replace('round', ''));
        return `ROUND ${roundNum}`;
    }
    
    return 'FIRST ROUND';
}

// Admin Functions
async function updateRegistrationStatus(isOpen) {
    try {
        await firebaseDb.collection('settings').doc('registration').set({
            isOpen: isOpen,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        registrationOpen = isOpen;
    } catch (error) {
        console.error('Error updating registration status:', error);
        if (error.code === 'permission-denied') {
            throw new Error('You do not have permission to update registration status. Please login as administrator.');
        } else {
            throw error;
        }
    }
}

function updateRegistrationUI() {
    if (isAdmin) {
        toggleRegistrationBtn.textContent = registrationOpen ? 'CLOSE REGISTRATION' : 'OPEN REGISTRATION';
        regStatusSpan.textContent = registrationOpen ? 'OPEN' : 'CLOSED';
        regStatusSpan.style.color = registrationOpen ? 'green' : 'red';
        
        registerBtn.disabled = !registrationOpen;
        registerBtn.textContent = !registrationOpen ? 'REGISTRATION CLOSED' : 'REGISTER';
    } else {
        registerBtn.disabled = !registrationOpen;
        if (!registrationOpen) {
            registrationStatus.textContent = 'REGISTRATION IS NOW CLOSED.';
            registrationStatus.className = 'status-message info';
        } else {
            registrationStatus.textContent = '';
            registrationStatus.className = 'status-message';
        }
    }
}

async function removePlayer(playerId) {
    try {
        await firebaseDb.collection('players').doc(playerId).delete();
        
        // Remove from any doubles pairs
        const pairsSnapshot1 = await firebaseDb.collection('doublesPairs')
            .where('player1Id', '==', playerId)
            .get();
            
        const pairsSnapshot2 = await firebaseDb.collection('doublesPairs')
            .where('player2Id', '==', playerId)
            .get();
            
        const allPairs = [...pairsSnapshot1.docs, ...pairsSnapshot2.docs];
            
        for (const doc of allPairs) {
            await firebaseDb.collection('doublesPairs').doc(doc.id).delete();
        }
    } catch (error) {
        console.error('Remove player error:', error);
        if (error.code === 'permission-denied') {
            throw new Error('You do not have permission to remove players. Please login as administrator.');
        } else {
            throw error;
        }
    }
}

function filterPlayers() {
    const searchTerm = searchPlayerInput.value.toLowerCase();
    const items = allPlayersList.getElementsByTagName('li');
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    }
}

async function pairDoublesPlayers(player1Id, player2Id) {
    try {
        // Check if either player is already paired
        const existingPairs1 = await firebaseDb.collection('doublesPairs')
            .where('player1Id', '==', player1Id)
            .get();
            
        const existingPairs2 = await firebaseDb.collection('doublesPairs')
            .where('player2Id', '==', player1Id)
            .get();
            
        const existingPairs3 = await firebaseDb.collection('doublesPairs')
            .where('player1Id', '==', player2Id)
            .get();
            
        const existingPairs4 = await firebaseDb.collection('doublesPairs')
            .where('player2Id', '==', player2Id)
            .get();
            
        const allExistingPairs = [
            ...existingPairs1.docs, 
            ...existingPairs2.docs, 
            ...existingPairs3.docs, 
            ...existingPairs4.docs
        ];
        
        if (allExistingPairs.length > 0) {
            throw new Error('One or both players are already paired.');
        }
        
        // Create new pair
        await firebaseDb.collection('doublesPairs').add({
            player1Id: player1Id,
            player2Id: player2Id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update player records to ensure they're marked for doubles
        await firebaseDb.collection('players').doc(player1Id).update({
            inDoubles: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await firebaseDb.collection('players').doc(player2Id).update({
            inDoubles: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Pair doubles players error:', error);
        if (error.code === 'permission-denied') {
            throw new Error('You do not have permission to create pairs. Please login as administrator.');
        } else {
            throw error;
        }
    }
}

async function generateTournamentFixtures() {
    // Close registration
    await updateRegistrationStatus(false);
    
    // Generate singles fixtures
    if (players.some(p => p.inSingles)) {
        const singlesPlayers = players.filter(p => p.inSingles);
        const singlesFixture = generateProperKnockoutFixture(singlesPlayers, 'singles');
        await firebaseDb.collection('fixtures').doc('singles').set(singlesFixture);
    }
    
    // Generate doubles fixtures
    if (players.some(p => p.inDoubles)) {
        // Get all doubles pairs (manual + auto-generated)
        let allDoublesPairs = [...doublesPairs];
        
        // Get players in doubles but not yet paired
        const pairedPlayerIds = new Set();
        doublesPairs.forEach(pair => {
            pairedPlayerIds.add(pair.player1Id);
            pairedPlayerIds.add(pair.player2Id);
        });
        
        const unpairedDoublesPlayers = players.filter(p => p.inDoubles && !pairedPlayerIds.has(p.id));
        
        // Randomly pair remaining players
        const tempUnpaired = [...unpairedDoublesPlayers];
        while (tempUnpaired.length >= 2) {
            // Fisher-Yates shuffle for the remaining players
            for (let i = tempUnpaired.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tempUnpaired[i], tempUnpaired[j]] = [tempUnpaired[j], tempUnpaired[i]];
            }
            
            // Take first two players and pair them
            const player1 = tempUnpaired.shift();
            const player2 = tempUnpaired.shift();
            
            allDoublesPairs.push({
                player1Id: player1.id,
                player2Id: player2.id,
                isAutoGenerated: true
            });
        }
        
        const doublesFixture = generateProperKnockoutFixture(allDoublesPairs, 'doubles');
        await firebaseDb.collection('fixtures').doc('doubles').set(doublesFixture);
    }
}

function generateProperKnockoutFixture(participants, type) {
    if (participants.length === 0) {
        return {};
    }
    
    // Create a copy and shuffle participants randomly using Fisher-Yates algorithm
    let shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Calculate the next power of 2 greater than or equal to the number of participants
    let nextPowerOf2 = 1;
    while (nextPowerOf2 < shuffled.length) {
        nextPowerOf2 *= 2;
    }
    
    // Create first round matches
    let matches = [];
    let participantIndex = 0;
    
    // If we need byes (nextPowerOf2 > shuffled.length)
    const byesNeeded = nextPowerOf2 - shuffled.length;
    
    // Assign byes to first 'byesNeeded' participants
    for (let i = 0; i < byesNeeded; i++) {
        matches.push({
            player1: shuffled[participantIndex],
            player2: null,
            winner: null,
            isBye: true,
            matchId: `match_${Date.now()}_${i}`
        });
        participantIndex++;
    }
    
    // Create matches for remaining participants
    while (participantIndex < shuffled.length) {
        if (participantIndex + 1 < shuffled.length) {
            matches.push({
                player1: shuffled[participantIndex],
                player2: shuffled[participantIndex + 1],
                winner: null,
                matchId: `match_${Date.now()}_${participantIndex}`
            });
            participantIndex += 2;
        } else {
            // This should not happen if we calculated byes correctly
            matches.push({
                player1: shuffled[participantIndex],
                player2: null,
                winner: null,
                isBye: true,
                matchId: `match_${Date.now()}_${participantIndex}`
            });
            participantIndex++;
        }
    }
    
    // Create fixture structure
    const fixture = {
        first: {
            matches: matches
        }
    };
    
    // Generate subsequent rounds
    let currentRound = matches;
    let roundCounter = 1;
    
    // Keep track of round names in order
    const roundNames = ['first'];
    
    while (currentRound.length > 1) {
        roundCounter++;
        let nextRoundMatches = [];
        
        // Process current round matches in pairs to create next round slots
        for (let i = 0; i < currentRound.length; i += 2) {
            if (i + 1 < currentRound.length) {
                // Create a match slot for winners of match i and match i+1
                nextRoundMatches.push({
                    player1: null,
                    player2: null,
                    winner: null,
                    matchId: `match_${Date.now()}_round${roundCounter}_${i}`
                });
            } else {
                // If odd number of matches, the last match winner gets a bye
                nextRoundMatches.push({
                    player1: null,
                    player2: null,
                    winner: null,
                    isBye: true,
                    matchId: `match_${Date.now()}_round${roundCounter}_${i}`
                });
            }
        }
        
        // Determine round key based on number of matches in next round
        let roundKey;
        if (nextRoundMatches.length === 1) {
            roundKey = 'final';
        } else if (nextRoundMatches.length === 2) {
            roundKey = 'semifinal';
        } else if (nextRoundMatches.length === 4) {
            roundKey = 'quarterfinal';
        } else if (nextRoundMatches.length === 8) {
            roundKey = 'round16';
        } else {
            roundKey = `round${roundCounter}`;
        }
        
        // Add to fixture
        fixture[roundKey] = {
            matches: nextRoundMatches
        };
        
        // Add to round names array
        roundNames.push(roundKey);
        
        // Update for next iteration
        currentRound = nextRoundMatches;
    }
    
    // Add roundOrder to fixture for consistent display
    fixture.roundOrder = roundNames;
    
    return fixture;
}

async function saveMatchResult(type, roundKey, matchIndex, matchElement) {
    try {
        // Get the fixture document
        const fixtureDoc = await firebaseDb.collection('fixtures').doc(type).get();
        if (!fixtureDoc.exists) {
            throw new Error('Fixture not found');
        }
        
        // Get current fixture data
        const fixtureData = fixtureDoc.data();
        
        // Validate the match exists
        if (!fixtureData[roundKey] || !fixtureData[roundKey].matches || !Array.isArray(fixtureData[roundKey].matches) || matchIndex >= fixtureData[roundKey].matches.length) {
            throw new Error('Match not found');
        }
        
        // Get the match
        const match = fixtureData[roundKey].matches[matchIndex];
        
        // Get player names from inputs
        const player1Input = matchElement.querySelector('.player-input[data-player="1"]');
        const player2Input = matchElement.querySelector('.player-input[data-player="2"]');
        
        // Get winner from select dropdown
        const winnerSelect = matchElement.querySelector('.winner-select');
        const winnerValue = winnerSelect.value;
        
        // Update match with new player names if changed
        if (player1Input.value && player1Input.value !== getPlayerDisplayName(match.player1, type)) {
            match.player1 = player1Input.value;
        }
        
        if (player2Input.value && player2Input.value !== getPlayerDisplayName(match.player2, type)) {
            match.player2 = player2Input.value;
        }
        
        // Set winner
        if (winnerValue === '1') {
            match.winner = match.player1;
        } else if (winnerValue === '2') {
            match.winner = match.player2;
        } else {
            match.winner = null;
        }
        
        // Save updated fixture
        await firebaseDb.collection('fixtures').doc(type).set(fixtureData);
        
        // Propagate winner to next round if this is not the final
        if (roundKey !== 'final') {
            await propagateWinnerToNextRound(type, roundKey, matchIndex, match.winner, fixtureData);
        }
        
        // Show success message
        showSuccess('Match result saved successfully!');
        
        // Update the UI to reflect the saved result immediately
        updateMatchDisplay(matchElement, match, type);
        
    } catch (error) {
        console.error('Save match result error:', error);
        showError('Failed to save match: ' + error.message);
    }
}

function updateMatchDisplay(matchElement, match, type) {
    // Update winner display in the match element
    const winnerSelect = matchElement.querySelector('.winner-select');
    if (winnerSelect) {
        if (match.winner === match.player1) {
            winnerSelect.value = '1';
        } else if (match.winner === match.player2) {
            winnerSelect.value = '2';
        } else {
            winnerSelect.value = '';
        }
    }
    
    // Add visual feedback
    matchElement.style.borderColor = match.winner ? '#28a745' : '#e9ecef';
    matchElement.style.boxShadow = match.winner ? '0 0 0 2px rgba(40, 167, 69, 0.2)' : 'none';
    
    // Add a temporary success indicator
    const successIndicator = document.createElement('div');
    successIndicator.className = 'status-message success';
    successIndicator.textContent = 'Result saved!';
    successIndicator.style.position = 'absolute';
    successIndicator.style.top = '5px';
    successIndicator.style.right = '5px';
    successIndicator.style.padding = '3px 8px';
    successIndicator.style.fontSize = '12px';
    
    // Remove any existing success indicators
    const existingIndicator = matchElement.querySelector('.status-message.success');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    matchElement.style.position = 'relative';
    matchElement.appendChild(successIndicator);
    
    // Remove the success indicator after 3 seconds
    setTimeout(() => {
        if (successIndicator && successIndicator.parentNode === matchElement) {
            successIndicator.remove();
        }
    }, 3000);
}

async function propagateWinnerToNextRound(type, currentRound, matchIndex, winner, fixtureData) {
    try {
        // If no winner, don't propagate
        if (!winner) {
            return;
        }
        
        // Define the correct order of rounds
        const roundOrder = [
            'first', 
            'round2', 
            'round3', 
            'round4', 
            'round5', 
            'round6', 
            'round7', 
            'round8', 
            'round16', 
            'quarterfinal', 
            'semifinal', 
            'final'
        ];
        
        // Find current round index
        const currentRoundIndex = roundOrder.indexOf(currentRound);
        if (currentRoundIndex === -1) {
            return; // Current round not found in order
        }
        
        // Get next round
        const nextRound = roundOrder[currentRoundIndex + 1];
        if (!nextRound || !fixtureData[nextRound]) {
            return; // No next round or next round doesn't exist
        }
        
        // Calculate which match in the next round this winner should go to
        const nextMatchIndex = Math.floor(matchIndex / 2);
        
        // Check if next match exists
        if (!fixtureData[nextRound].matches || nextMatchIndex >= fixtureData[nextRound].matches.length) {
            return; // Next match doesn't exist
        }
        
        // Get the next match
        const nextMatch = fixtureData[nextRound].matches[nextMatchIndex];
        
        // Determine which player slot to fill
        // If it's a bye match, fill player1
        if (nextMatch.isBye) {
            nextMatch.player1 = winner;
        } 
        // If player1 is empty, fill player1
        else if (!nextMatch.player1) {
            nextMatch.player1 = winner;
        } 
        // If player2 is empty, fill player2
        else if (!nextMatch.player2) {
            nextMatch.player2 = winner;
        }
        // If both slots are filled, don't overwrite (this shouldn't happen in a proper bracket)
        
        // Save updated fixture
        await firebaseDb.collection('fixtures').doc(type).set(fixtureData);
        
        // Log the propagation for debugging
        console.log(`Propagated winner from ${currentRound} match ${matchIndex} to ${nextRound} match ${nextMatchIndex}`);
        
    } catch (error) {
        console.error('Error propagating winner:', error);
    }
}

async function resetAllFixtures() {
    try {
        // Delete singles fixtures
        await firebaseDb.collection('fixtures').doc('singles').delete();
        
        // Delete doubles fixtures
        await firebaseDb.collection('fixtures').doc('doubles').delete();
        
        // Reset fixtures object
        fixtures = {
            singles: {},
            doubles: {}
        };
        
        // Clear fixture displays
        singlesFixtures.innerHTML = '<p>No singles fixtures available yet.</p>';
        doublesFixtures.innerHTML = '<p>No doubles fixtures available yet.</p>';
        adminSinglesFixtures.innerHTML = '<p>No singles fixtures available yet.</p>';
        adminDoublesFixtures.innerHTML = '<p>No doubles fixtures available yet.</p>';
        
        showSuccess('Fixtures reset successfully!');
    } catch (error) {
        // If documents don't exist, that's fine
        if (error.code !== 'not-found') {
            console.error('Error resetting fixtures:', error);
            showError('Failed to reset fixtures: ' + error.message);
        } else {
            showSuccess('Fixtures reset successfully!');
        }
    }
}

// UI Helper Functions
function showSuccess(message) {
    showMessage(message, 'success');
}

function showError(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    const elements = [registrationStatus, fixtureGenerationStatus];
    
    elements.forEach(el => {
        if (el) {
            el.textContent = message;
            el.className = `status-message ${type}`;
            setTimeout(() => {
                el.textContent = '';
                el.className = 'status-message';
            }, 5000);
        }
    });
    
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Load all data for admin
async function loadAllData() {
    if (!isAdmin) return;
    
    await loadRegistrationStatus();
    await loadPlayers();
    await loadAllPlayersForAdmin();
    await loadDoublesPairs();
    await loadPlayersForPairing();
    await loadFixtures();
    updateRegistrationUI();
                    }
