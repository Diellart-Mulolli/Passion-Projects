$(window).on("load", function () {
    const gameBoard = $("#game-board");
    createSuperBoard(gameBoard);

    gameBoard.on("click", ".super-cell", function () {
        clickLogic();
    });
});    

// Preload click sound and expose globally
globalThis.click = new Audio('./audio/pop.mp3');
globalThis.click.preload = 'auto';
globalThis.click.load();
globalThis.click.volume = 0.8;

function clickLogic() {
    let currentPlayer = 'X';
    $(".cell.empty").on("click", function (e) {
        e.preventDefault();
        if (!$(this).hasClass('empty')) return; // Ignore if cell is not empty
        const cell = $(this);
        setMove(cell, currentPlayer);
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        const cellAttr = cell.attr('data-cell')
        const superCell = cell.closest('.super-cell').attr('data-super-cell');
        console.log(`superCell: ${superCell} | cell: ${cellAttr}`);
    });
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
}

function setMove (cell, player) {
    cell.text(player);
    cell.css('transition', 'color 0.3s, font-size 0.3s');
    cell.css('color', player === 'X' ? 'red' : 'blue');
    cell.css('font-size', '3rem');
    cell.removeClass('empty');
    cell.addClass(player === 'X' ? 'x-move' : 'o-move');
    
    // play preloaded global audio safely (reset so repeated clicks play)
    if (globalThis.click) {
        try {
            globalThis.click.currentTime = 0;
            globalThis.click.play();
        } catch (err) {
            // play can be blocked by browser autoplay policy; ignore errors
        }
    }
}