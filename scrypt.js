// === ЯНДЕКС SDK ===
let ysdk = null;
let player = null;
let sdkReady = false;

// Инициализация SDK
window.addEventListener('load', function() {
    initYandexSDK();
});

function initYandexSDK() {
    if (typeof YaGames === 'undefined') {
        console.warn('Яндекс SDK не найден, запуск в режиме разработки');
        hideLoading();
        initGame();
        return;
    }

    YaGames.init()
        .then(function(_ysdk) {
            ysdk = _ysdk;
            sdkReady = true;
            console.log('✅ Яндекс SDK инициализирован');
            
            return ysdk.getPlayer();
        })
        .then(function(_player) {
            player = _player;
            console.log('✅ Игрок загружен');
            
            showFullscreenAd(function() {
                hideLoading();
                initGame();
            });
        })
        .catch(function(err) {
            console.error('Ошибка SDK:', err);
            hideLoading();
            initGame();
        });
}


function hideLoading() {
    const loader = document.getElementById('loadingScreen');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// Показать полноэкранную рекламу
function showFullscreenAd(callback) {
    if (!sdkReady || !ysdk) {
        if (callback) callback();
        return;
    }
    
    ysdk.adv.showFullscreenAdv({
        callbacks: {
            onClose: function(wasShown) {
                console.log('Реклама закрыта');
                if (callback) callback();
            },
            onError: function(error) {
                console.error('Ошибка рекламы:', error);
                if (callback) callback();
            }
        }
    });
}

// Показать баннер (sticky)
function showStickyBanner() {
    if (!sdkReady || !ysdk) return;
    
    ysdk.adv.showBannerAdv()
        .then(function() {
            console.log('Баннер показан');
        })
        .catch(function(err) {
            console.error('Ошибка баннера:', err);
        });
}

// Скрыть баннер
function hideStickyBanner() {
    if (!sdkReady || !ysdk) return;
    
    ysdk.adv.hideBannerAdv();
}

// === ИГРА ===
let board = ['', '', '', '', '', '', '', '', ''];
let playerSymbol = 'X';
let bot = 'O';
let gameActive = false;
let difficulty = 'easy';
let gamesPlayed = 0;

// Статистика
let wins = 0;
let losses = 0;
let draws = 0;

// Выигрышные линии
const winLines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
];

// === ИНИЦИАЛИЗАЦИЯ ИГРЫ ===
function initGame() {
    loadStats();
    setupButtons();
    updateStats();
    showStickyBanner(); // Показать баннеры
}

// Загрузка статистики
function loadStats() {
    if (sdkReady && player) {
        // Из облака Яндекса
        player.getData(['wins', 'losses', 'draws'])
            .then(function(data) {
                wins = data.wins || 0;
                losses = data.losses || 0;
                draws = data.draws || 0;
                updateStats();
            })
            .catch(function() {
                loadLocalStats();
            });
    } else {
        loadLocalStats();
    }
}

function loadLocalStats() {
    wins = parseInt(localStorage.getItem('wins')) || 0;
    losses = parseInt(localStorage.getItem('losses')) || 0;
    draws = parseInt(localStorage.getItem('draws')) || 0;
}

// === КНОПКИ ===
function setupButtons() {
    document.getElementById('btnSingle').onclick = function() {
        changeScreen('difficultyScreen');
    };
    
    document.getElementById('btnEasy').onclick = function() {
        startGame('easy');
    };
    
    document.getElementById('btnMedium').onclick = function() {
        startGame('medium');
    };
    
    document.getElementById('btnHard').onclick = function() {
        startGame('hard');
    };
    
    document.getElementById('btnBackDiff').onclick = function() {
        changeScreen('mainMenu');
    };
    
    document.getElementById('btnBackGame').onclick = function() {
        changeScreen('mainMenu');
    };
    
    document.getElementById('btnRestart').onclick = function() {
        restartGame();
    };
    
    document.getElementById('closeGame').onclick = function() {
        if (confirm('Выйти из игры?')) {
            window.close();
        }
    };
    
    // Ячейки
    const cells = document.querySelectorAll('.cell');
    for (let i = 0; i < cells.length; i++) {
        cells[i].onclick = function() {
            cellClick(i);
        };
    }
}

// === СМЕНА ЭКРАНОВ ===
function changeScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    for (let i = 0; i < screens.length; i++) {
        screens[i].classList.remove('active');
    }
    document.getElementById(screenName).classList.add('active');
}

// === СТАРТ ИГРЫ ===
function startGame(diff) {
    difficulty = diff;
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    
    const cells = document.querySelectorAll('.cell');
    for (let i = 0; i < cells.length; i++) {
        cells[i].textContent = '';
        cells[i].className = 'cell';
    }
    
    document.getElementById('turnIndicator').textContent = 'Ваш ход (X)';
    changeScreen('gameScreen');
}

function restartGame() {
    startGame(difficulty);
}

// === КЛИК ПО ЯЧЕЙКЕ ===
function cellClick(index) {
    if (!gameActive || board[index] !== '') return;
    
    makeMove(index, playerSymbol);
    
    if (gameActive) {
        setTimeout(function() {
            botTurn();
        }, 500);
    }
}

// === ХОД ===
function makeMove(index, symbol) {
    board[index] = symbol;
    
    const cell = document.querySelectorAll('.cell')[index];
    cell.textContent = symbol;
    cell.classList.add('taken');
    cell.classList.add(symbol.toLowerCase());
    
    playSound();
    
    const winner = checkWinner();
    
    if (winner) {
        endGame(winner);
    } else if (isBoardFull()) {
        endGame('draw');
    }
}

// === ХОД БОТА ===
function botTurn() {
    if (!gameActive) return;
    
    let move = -1;
    
    if (difficulty === 'easy') {
        move = easyBot();
    } else if (difficulty === 'medium') {
        move = mediumBot();
    } else {
        move = hardBot();
    }
    
    if (move !== -1) {
        makeMove(move, bot);
    }
}

// === ЛЁГКИЙ БОТ ===
function easyBot() {
    const empty = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') empty.push(i);
    }
    return empty[Math.floor(Math.random() * empty.length)];
}

// === СРЕДНИЙ БОТ ===
function mediumBot() {
    // Попытка победить
    for (let i = 0; i < winLines.length; i++) {
        const line = winLines[i];
const a = line[0], b = line[1], c = line[2];
        
        if (board[a] === bot && board[b] === bot && board[c] === '') return c;
        if (board[a] === bot && board[c] === bot && board[b] === '') return b;
        if (board[b] === bot && board[c] === bot && board[a] === '') return a;
    }
    
    // Блокировка игрока
    for (let i = 0; i < winLines.length; i++) {
        const line = winLines[i];
        const a = line[0], b = line[1], c = line[2];
        
        if (board[a] === playerSymbol && board[b] === playerSymbol && board[c] === '') return c;
        if (board[a] === playerSymbol && board[c] === playerSymbol && board[b] === '') return b;
        if (board[b] === playerSymbol && board[c] === playerSymbol && board[a] === '') return a;
    }
    
    return easyBot();
}

// === СЛОЖНЫЙ БОТ ===
function hardBot() {
    let bestScore = -1000;
    let bestMove = -1;
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = bot;
            let score = minimax(false);
            board[i] = '';
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    return bestMove;
}

function minimax(isBot) {
    const winner = checkWinner();
    
    if (winner === bot) return 10;
    if (winner === playerSymbol) return -10;
    if (isBoardFull()) return 0;
    
    if (isBot) {
        let best = -1000;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = bot;
                best = Math.max(best, minimax(false));
                board[i] = '';
            }
        }
        return best;
    } else {
        let best = 1000;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = playerSymbol;
                best = Math.min(best, minimax(true));
                board[i] = '';
            }
        }
        return best;
    }
}

// === ПРОВЕРКА ПОБЕДИТЕЛЯ ===
function checkWinner() {
    for (let i = 0; i < winLines.length; i++) {
        const line = winLines[i];
        const a = board[line[0]];
        const b = board[line[1]];
        const c = board[line[2]];
        
        if (a !== '' && a === b && b === c) {
            highlightWin(line);
            return a;
        }
    }
    return null;
}

function isBoardFull() {
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') return false;
    }
    return true;
}

// === КОНЕЦ ИГРЫ ===
function endGame(result) {
    gameActive = false;
    gamesPlayed++;
    
    const indicator = document.getElementById('turnIndicator');
    
    if (result === playerSymbol) {
        indicator.textContent = '🎉 Вы победили!';
        wins++;
    } else if (result === bot) {
        indicator.textContent = '😞 Вы проиграли';
        losses++;
    } else {
        indicator.textContent = '🤝 Ничья';
        draws++;
    }
    
    saveStats();
    updateStats();
}

function highlightWin(line) {
    const cells = document.querySelectorAll('.cell');
    for (let i = 0; i < line.length; i++) {
        cells[line[i]].classList.add('winner');
    }
}

// === СТАТИСТИКА ===
function saveStats() {
    // Локально
    localStorage.setItem('wins', wins);
    localStorage.setItem('losses', losses);
    localStorage.setItem('draws', draws);
    
    // В облако Яндекса
    if (sdkReady && player) {
        player.setData({
            wins: wins,
            losses: losses,
            draws: draws
        }).catch(function(err) {
            console.error('Ошибка сохранения:', err);
        });
    }
}

function updateStats() {
    document.getElementById('wins').textContent = wins;
    document.getElementById('losses').textContent = losses;
    document.getElementById('draws').textContent = draws;
}


// === ЗВУК ===
function playSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = 600;
        gain.gain.value = 0.1;
        
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {
        // Звук не критичен
    }
}