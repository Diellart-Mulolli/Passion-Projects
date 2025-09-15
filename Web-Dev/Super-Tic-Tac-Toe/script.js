$(window).on("load", function () {
    console.log("Generating Super Tic-Tac-Toe Board");
    const gameBoard = $("#game-board");
    createSuperBoard(gameBoard);
    let currentPlayer = 'X';

    gameBoard.on("click", ".cell.empty", function () {
        const cell = $(this);
        setMove(cell, currentPlayer);
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    });
});

function createSuperBoard(gameBoard) {
    gameBoard.empty(); // Clear previous content

    for (let i = 0; i < 9; i++) {
        const superCell = $("<div>")
            .addClass("super-cell")
            .attr("data-super-cell", `${Math.floor(i / 3)}-${i % 3}`);
        const subBoard = $("<div>")
            .addClass("sub-board")
            .attr("data-sub-board", `${Math.floor(i / 3)}-${i % 3}`);
        const back = $("<div>")
            .addClass("back")
            .text("Back")
            
            .attr("sub-board-back", `${Math.floor(i / 3)}-${i % 3}`);

        for (let j = 0; j < 9; j++) {
            const cell = $("<div>")
                .addClass("cell empty")
                .attr("data-cell", `${Math.floor(j / 3)}-${j % 3}`);
            subBoard.append(cell);
        }
        superCell.append(subBoard);
        superCell.append(back);
        gameBoard.append(superCell);
    }
}

function setMove (cell, player) {
    if (cell.text() !== '') {
        console.error("Cell is already occupied.");
        return;
    }else{
        cell.text(player);
        cell.css('color', player === 'X' ? 'red' : 'blue');
        cell.removeClass('empty');
        cell.addClass(player === 'X' ? 'x-move' : 'o-move');
    }
}
