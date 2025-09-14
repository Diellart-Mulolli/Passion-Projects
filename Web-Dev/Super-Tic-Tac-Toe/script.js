$(window).on("load", function () {
    console.log("Generating Super Tic-Tac-Toe Board");
    const gameBoard = $("#game-board");
    generateSuperBoard(gameBoard);
});

function generateSuperBoard(gameBoard) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const superCell = $("<div>")
                .addClass("super-cell")
                .attr("data-super-cell", `${i}-${j}`);
            const subBoard = $("<div>")
                .addClass("sub-board")
                .attr("data-sub-board", `${i}-${j}`);
            generateSubBoard(subBoard);
            superCell.append(subBoard);
            gameBoard.append(superCell);
        }
    }
}

function generateSubBoard(subBoard) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const cell = $("<div>")
                .addClass("cell")
                .attr("data-cell", `${i}-${j}`);
            subBoard.append(cell);
        }
    }
}