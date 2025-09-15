$(window).on("load", function () {
    console.log("Generating Super Tic-Tac-Toe Board");
    const gameBoard = $("#game-board");
    createSuperBoard(gameBoard);
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
        for (let j = 0; j < 9; j++) {
            const cell = $("<div>")
                .addClass("cell")
                .attr("data-cell", `${Math.floor(j / 3)}-${j % 3}`);
            subBoard.append(cell);
        }
        superCell.append(subBoard);
        gameBoard.append(superCell);
    }
}