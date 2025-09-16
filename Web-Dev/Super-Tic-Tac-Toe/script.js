$(window).on("load", function () {
    const gameBoard = $("#game-board");
    createSuperBoard(gameBoard);

    gameBoard.on("click", ".super-cell", function () {
        clickLogic();
    });
});    

const gameState = {
    board: Array(3).fill(null).map(() => Array(3).fill(null)), // 3x3 board for super cells
    currentPlayer: 'X',
    superCellWinners: Array(3).fill(null).map(() => Array(3).fill(null)), // Track winners of super cells
    isGameOver: false , 
    restrictToSuperCell: null // e.g. [0, 1] to restrict next move to that super cell
};
globalThis.gameState = gameState;


// const audioFiles = [
//   'pop.mp3',
//   'swoosh.mp3',
//   'defeat.mp3',
//   'draw.mp3',
//   'victory.mp3'
// ];
// globalThis.sounds = {};
// audioFiles.forEach(filename => {
//   const key = filename.replace(/\.[^/.]+$/, '')
//   const src = `./audio/${filename}`;
//   try {
//     const a = new Audio(src);
//     a.preload = 'auto';
//     a.load();
//     a.volume = 0.5; 
//     globalThis.sounds[key] = a;
//   } catch (err) {}
// });
// // keep legacy click alias if pop exists, otherwise fallback to first loaded sound
// globalThis.click = globalThis.sounds.pop || Object.values(globalThis.sounds)[0] || null;
// // safe play helper
// globalThis.playSound = function (name) {
//   const snd = globalThis.sounds && globalThis.sounds[name];
//   if (!snd) return;
//   try {
//     snd.currentTime = 0;
//     snd.play();
//   } catch (err) {
//     console.warn(`Failed to play sound ${name}:`, err);
//   }
// };

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

        // if target super-cell (the one pointed by cellTuple) has no empty cells, clear restriction
        const targetSelector = `.super-cell[data-super-cell="${cellTuple[0]},${cellTuple[1]}"]`;
        const $targetSuper = $(targetSelector);
        if ($targetSuper.length && $targetSuper.find('.cell.empty').length === 0) {
            gameState.restrictToSuperCell = null; // unrestricted next move
        }

        // update highlight for allowed super-cell(s)
        updateAllowedHighlight();

        console.log(`superCell: ${superAttr} | cell: ${cellAttr}`);
    });
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
    cell.text(player);
    cell.css('transition', 'color 0.3s, font-size 0.3s');
    cell.css('color', player === 'X' ? 'red' : 'blue');
    cell.css('font-size', '3rem');
    cell.removeClass('empty');
    cell.addClass(player === 'X' ? 'x-move' : 'o-move');

    // store the tuple inside the corresponding super-cell entry in gameState.board
    const [SR, SC] = superTuple;
    // initialize container for moves in this super-cell if needed
    if (!Array.isArray(gameState.board[SR][SC])) {
        gameState.board[SR][SC] = []; // will hold tuples like [r,c]
    }
    // push the cell tuple (avoid duplicates)
    const existing = gameState.board[SR][SC].some(t => t[0] === cellTuple[0] && t[1] === cellTuple[1]);
    if (!existing) {
        gameState.board[SR][SC].push(cellTuple);
    }

    // play sound if available
    if (globalThis.click) {
        try {
            globalThis.click.currentTime = 0;
            globalThis.click.play();
        } catch (err) {}
    }
}