$(window).on("load", function () {
    const gameBoard = $("#game-board");
    createSuperBoard(gameBoard);
    animateTitle();
    

    gameBoard.on("click", ".super-cell", function () {
        clickLogic();
    });
});    

function animateTitle() {
    const title = "Super-Tic-Tac-Toe";
    const charArray = [...title];
    for (let i = 0; i < charArray.length; i++) {
        const span = $("<span>").text(charArray[i]);
        if (i % 2 === 0) {
            span.css("color", "#ef4444");
            span.addClass("span0"); 
        }else {
            span.css("color", "#2563eb");
            span.addClass("span1"); 
        }
        // span.css("animation-delay", `${i * 0.1}s`);
        $("#title").append(span);
    }
}    

const gameState = {
    board: Array(3).fill(null).map(() => Array(3).fill(null)), // 3x3 board for super cells
    currentPlayer: 'X',
    superCellWinners: Array(3).fill(null).map(() => Array(3).fill(null)), // Track winners of super cells
    isGameOver: false , 
    restrictToSuperCell: null // e.g. [0, 1] to restrict next move to that super cell
};
globalThis.gameState = gameState;

// preload audio files and expose globally
const audioFiles = [
  'pop.mp3',
  'swoosh.mp3',
  'defeat.mp3',
  'draw.mp3',
  'victory.mp3'
];
globalThis.sounds = {};
audioFiles.forEach(filename => {
  const key = filename.replace(/\.[^/.]+$/, ''); // e.g. "pop"
  const src = `./audio/${filename}`;
  try {
    const a = new Audio(src);
    a.preload = 'auto';
    a.load();
    a.volume = 0.6;
    globalThis.sounds[key] = a;
  } catch (err) {
    console.warn('Audio load failed', src, err);
  }
});
// legacy alias and safe play helper
globalThis.click = globalThis.sounds.pop || Object.values(globalThis.sounds)[0] || null;
globalThis.playSound = function (name) {
  const snd = globalThis.sounds && globalThis.sounds[name];
  if (!snd) return;
  try {
    snd.currentTime = 0;
    snd.play();
  } catch (err) {
    // autoplay policy may block; ignore
  }
};

function clickLogic() {
    // ensure we don't bind multiple handlers
    $(".cell.empty").off("click").on("click", function (e) {
        e.preventDefault();
        const cell = $(this);
        if (!cell.hasClass('empty')) return; // ignore non-empty (safety)

        const cellAttr = cell.attr('data-cell'); // "r,c"
        const superAttr = cell.closest('.super-cell').attr('data-super-cell'); // "R,C"
        const cellTuple = cellAttr.split(',').map(Number); // [r, c]
        const superTuple = superAttr.split(',').map(Number); // [R, C]

        // disallow clicks in a super-cell that has already been won
        if (gameState.superCellWinners[superTuple[0]][superTuple[1]]) {
            console.log('That super-cell is already won.');
            return;
        }

        // validate against restrictToSuperCell (first move unrestricted when null)
        const restrict = gameState.restrictToSuperCell;
        if (restrict && (restrict[0] !== superTuple[0] || restrict[1] !== superTuple[1])) {
            console.log('Move not allowed. Must play in super-cell', restrict);
            return;
        }

        // perform move and update state
        setMove(cell, gameState.currentPlayer, superTuple, cellTuple);

        // toggle current player in global state (next player)
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

        // restrict next move to the small-cell's coordinates (tuple)
        gameState.restrictToSuperCell = cellTuple;

        // if target super-cell (the one pointed by cellTuple) has no empty cells or is already won, clear restriction
        const targetSelector = `.super-cell[data-super-cell="${cellTuple[0]},${cellTuple[1]}"]`;
        const $targetSuper = $(targetSelector);
        if ($targetSuper.length && ($targetSuper.find('.cell.empty').length === 0 || gameState.superCellWinners[cellTuple[0]][cellTuple[1]])) {
            gameState.restrictToSuperCell = null; // unrestricted next move
        }

        // update highlight for allowed super-cell(s)
        updateAllowedHighlight();

        console.log(`superCell: ${superAttr} | cell: ${cellAttr}`);
    });
}

// ensure a 3x3 matrix exists for a super-cell in gameState.board
function ensureSuperMatrix(SR, SC) {
    if (!Array.isArray(gameState.board[SR][SC]) || !Array.isArray(gameState.board[SR][SC][0])) {
        gameState.board[SR][SC] = Array(3).fill(null).map(() => Array(3).fill(null));
    }
}

// read sub-board state from DOM into a 3x3 matrix of 'X' | 'O' | null
function getSubBoardMatrix(superTuple) {
    const [SR, SC] = superTuple;
    const mat = Array(3).fill(null).map(() => Array(3).fill(null));
    const $super = $(`.super-cell[data-super-cell="${SR},${SC}"]`);
    $super.find('.cell').each(function () {
        const $c = $(this);
        const attr = $c.attr('data-cell');
        if (!attr) return;
        const [r, cidx] = attr.split(',').map(Number);
        const txt = $c.text().trim();
        if (txt === 'X' || $c.hasClass('x-move')) mat[r][cidx] = 'X';
        else if (txt === 'O' || $c.hasClass('o-move') || txt === '◯') mat[r][cidx] = 'O';
    });
    return mat;
}

// check a super-cell for a winner and handle win (flip, record, set back text)
function checkAndHandleSuperWin(superTuple) {
    const [SR, SC] = superTuple;
    // already handled?
    if (gameState.superCellWinners[SR][SC]) return;

    const mat = getSubBoardMatrix(superTuple);
    const winner = calculateWinner(mat);
    const $super = $(`.super-cell[data-super-cell="${SR},${SC}"]`);
    const $back = $super.find('.back');

    if (winner) {
        // record winner
        gameState.superCellWinners[SR][SC] = winner;

        // set back text and class
        if ($back.length) {
            const symbol = winner === 'X' ? 'X' : '◯';
            $back.html(symbol);
        }
        $super.addClass(winner === 'X' ? 'won-x' : 'won-o');

        // play swoosh and flip
        if (globalThis.playSound) try { globalThis.playSound('swoosh'); } catch(e) {}
        rotateSubBoard($super);

    } else {
        // check draw: no nulls left
        const isFull = mat.flat().every(v => v === 'X' || v === 'O');
        if (isFull) {
            // mark draw in state
            gameState.superCellWinners[SR][SC] = 'D';

            // style back for draw and set text
            if ($back.length) {
                $back.html('=');
            }
            $super.addClass('draw');

            // play swoosh and flip
            if (globalThis.playSound) try { globalThis.playSound('swoosh'); } catch(e) {}
            rotateSubBoard($super);

            // clear restriction if it pointed here
            if (gameState.restrictToSuperCell && gameState.restrictToSuperCell[0] === SR && gameState.restrictToSuperCell[1] === SC) {
                gameState.restrictToSuperCell = null;
            }
        }
    }

    // if restriction was pointing to this now-won/drawn super-cell, clear it
    if (gameState.restrictToSuperCell && (gameState.superCellWinners[SR][SC])) {
        gameState.restrictToSuperCell = null;
    }

    // refresh allowed highlight state
    updateAllowedHighlight();

    // call this after any super-cell result to evaluate overall game
    checkOverallGameResult();
}

// helpers to manage allowed highlight
function clearAllowedHighlights() {
    $(".super-cell.allowed-x, .super-cell.allowed-o").removeClass("allowed-x allowed-o");
}

function updateAllowedHighlight() {
    clearAllowedHighlights();
    const restrict = gameState.restrictToSuperCell;
    if (!restrict) return; // no restriction -> no single highlighted super-cell
    const [r, c] = restrict;
    const selector = `.super-cell[data-super-cell="${r},${c}"]`;
    const cls = gameState.currentPlayer === 'X' ? 'allowed-x' : 'allowed-o';
    const $el = $(selector);
    if ($el.length) {
        $el.addClass(cls);
    }
}

// call updateAllowedHighlight after board creation
function createSuperBoard(gameBoard) {
    gameBoard.empty(); // Clear previous content

    for (let i = 0; i < 9; i++) {
        const superCell = $("<div>")
            .addClass("super-cell")
            .attr("data-super-cell", `${Math.floor(i / 3)},${i % 3}`);
        const subBoard = $("<div>")
            .addClass("sub-board empty")
            .attr("data-sub-board", `${Math.floor(i / 3)},${i % 3}`);
        const back = $("<div>")
            .addClass("back empty")
            .text("Empty")
            .attr("sub-board-back", `${Math.floor(i / 3)},${i % 3}`);

        for (let j = 0; j < 9; j++) {
            const cell = $("<div>")
                .addClass("cell empty")
                .attr("data-cell", `${Math.floor(j / 3)},${j % 3}`);
            subBoard.append(cell);
        }
        superCell.append(subBoard);
        superCell.append(back);
        gameBoard.append(superCell);
    }

    // ensure highlight reflects initial state
    updateAllowedHighlight();
}

function calculateWinner(board) {
    const winningCombinations = [
        // Rows
        [[0, 0], [0, 1], [0, 2]],
        [[1, 0], [1, 1], [1, 2]],
        [[2, 0], [2, 1], [2, 2]],
        // Columns
        [[0, 0], [1, 0], [2, 0]],
        [[0, 1], [1, 1], [2, 1]],
        [[0, 2], [1, 2], [2, 2]],
        // Diagonals
        [[0, 0], [1, 1], [2, 2]],
        [[0, 2], [1, 1], [2, 0]],
    ];
    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
            return board[a[0]][a[1]];
        }
    }
    return null;
}

function rotateSubBoard(superCell) {
    superCell.toggleClass('rotated');
}   

function setMove(cell, player, superTuple, cellTuple) {
    // update UI
    const color = player === 'X' ? '#ef4444' : '#2563eb'; // match highlight colors
    const symbol = player === 'X' ? 'X' : 'O'; // normal X (better contrast) and hollow O
    cell.text(symbol);
    cell.css('transition', 'color 0.3s, font-size 0.3s');
    cell.css('color', color);
    cell.css('font-size', '3rem');
    cell.removeClass('empty');
    cell.addClass(player === 'X' ? 'x-move' : 'o-move');

    // store the move inside the corresponding super-cell entry in gameState.board as a 3x3 matrix
    const [SR, SC] = superTuple;
    ensureSuperMatrix(SR, SC);
    gameState.board[SR][SC][cellTuple[0]][cellTuple[1]] = player;

    // play sound if available
    if (globalThis.click) {
        try {
            globalThis.click.currentTime = 0;
            globalThis.click.play();
        } catch (err) {}
    }

    // after making the move, check if this super-cell was won
    checkAndHandleSuperWin(superTuple);
}

// return 'X' / 'O' if either has 3-in-a-row among superCellWinners, else null
function calculateSuperWinner() {
    const board = gameState.superCellWinners;
    const winningCombinations = [
        // Rows
        [[0,0],[0,1],[0,2]],
        [[1,0],[1,1],[1,2]],
        [[2,0],[2,1],[2,2]],
        // Cols
        [[0,0],[1,0],[2,0]],
        [[0,1],[1,1],[2,1]],
        [[0,2],[1,2],[2,2]],
        // Diags
        [[0,0],[1,1],[2,2]],
        [[0,2],[1,1],[2,0]]
    ];
    for (const combo of winningCombinations) {
        const [a,b,c] = combo;
        const va = board[a[0]][a[1]];
        const vb = board[b[0]][b[1]];
        const vc = board[c[0]][c[1]];
        if ((va === 'X' || va === 'O') && va === vb && va === vc) return va;
    }
    return null;
}

// improved overall game check: first check ordered 3-in-row, otherwise when all super-cells decided
function checkOverallGameResult() {
    if (gameState.isGameOver) return;

    const $board = $('#game-board');

    // 1) check ordered 3-in-a-row across super cells
    const lineWinner = calculateSuperWinner();
    if (lineWinner === 'X') {
        $board.addClass('flipped game-won-x').removeClass('game-won-o game-draw');
        if (globalThis.playSound) try { globalThis.playSound('victory'); } catch (e) {}
        endGame('X-line-win');
        return;
    }
    if (lineWinner === 'O') {
        $board.addClass('flipped game-won-o').removeClass('game-won-x game-draw');
        if (globalThis.playSound) try { globalThis.playSound('defeat'); } catch (e) {}
        endGame('O-line-win');
        return;
    }

    // 2) if no ordered winner, when all super-cells are decided -> compare counts (ignore 'D')
    const flat = gameState.superCellWinners.flat();
    const decidedCount = flat.filter(v => v !== null).length;
    if (decidedCount === 9) {
        const xCount = flat.filter(v => v === 'X').length;
        const oCount = flat.filter(v => v === 'O').length;

        if (xCount === oCount) {
            $board.addClass('flipped game-draw').removeClass('game-won-x game-won-o');
            if (globalThis.playSound) try { globalThis.playSound('draw'); } catch (e) {}
            endGame('draw-count-equal');
            return;
        }
        if (xCount > oCount) {
            $board.addClass('flipped game-won-x').removeClass('game-won-o game-draw');
            if (globalThis.playSound) try { globalThis.playSound('victory'); } catch (e) {}
            endGame('x-more-supercells');
            return;
        } else {
            $board.addClass('flipped game-won-o').removeClass('game-won-x game-draw');
            if (globalThis.playSound) try { globalThis.playSound('defeat'); } catch (e) {}
            endGame('o-more-supercells');
            return;
        }
    }

    // otherwise no overall result yet
}

function endGame(resultLabel) {
  // mark finished, unbind handlers and visually disable cells
  gameState.isGameOver = true;
  // remove delegated handlers on the board
  $("#game-board").off("click", ".cell");
  $("#game-board").off("click", ".super-cell");

  // add a class so CSS can make cells unclickable
  $("#game-board").addClass("game-over");

  // log final game state
  console.log('Game finished:', resultLabel, gameState);
}