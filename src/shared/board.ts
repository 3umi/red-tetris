type Board = number[][];

export const createBoard = (): Board => {
    const board = [];
    for(let i = 0; i < 20; i++) {
        board.push(Array(10).fill(0));
    }
    return board;
};
