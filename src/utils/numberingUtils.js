/**
 * Numbering utilities for crossword grids
 *
 * Assigns numbers to cells that start Across or Down words
 * Scans from top-left to bottom-right, row by row
 */

/**
 * Determines if a cell starts an Across word
 */
function startsAcrossWord(grid, row, col) {
  const width = grid[0].length;

  // Cell must have a letter
  if (grid[row][col] === null) return false;

  // Cell to the left must be empty or out of bounds
  if (col > 0 && grid[row][col - 1] !== null) return false;

  // Cell to the right must have a letter (word must be at least 2 letters)
  if (col + 1 >= width || grid[row][col + 1] === null) return false;

  return true;
}

/**
 * Determines if a cell starts a Down word
 */
function startsDownWord(grid, row, col) {
  const height = grid.length;

  // Cell must have a letter
  if (grid[row][col] === null) return false;

  // Cell above must be empty or out of bounds
  if (row > 0 && grid[row - 1][col] !== null) return false;

  // Cell below must have a letter (word must be at least 2 letters)
  if (row + 1 >= height || grid[row + 1][col] === null) return false;

  return true;
}

/**
 * Extracts a word starting at a given position
 */
function extractWord(grid, row, col, isHorizontal) {
  let word = '';
  const width = grid[0].length;
  const height = grid.length;

  if (isHorizontal) {
    for (let c = col; c < width && grid[row][c] !== null; c++) {
      word += grid[row][c];
    }
  } else {
    for (let r = row; r < height && grid[r][col] !== null; r++) {
      word += grid[r][col];
    }
  }

  return word;
}

/**
 * Generates cell numbers and word lists for Across and Down
 * @param {string[][]} grid - The crossword grid
 * @returns {Object} - { cellNumbers, acrossWords, downWords }
 *   - cellNumbers: 2D array of numbers (null for unnumbered cells)
 *   - acrossWords: Array of { number, word, row, col }
 *   - downWords: Array of { number, word, row, col }
 */
export function generateNumbering(grid) {
  if (!grid || grid.length === 0) {
    return { cellNumbers: [], acrossWords: [], downWords: [] };
  }

  const height = grid.length;
  const width = grid[0].length;

  const cellNumbers = Array(height).fill(null).map(() => Array(width).fill(null));
  const acrossWords = [];
  const downWords = [];

  let currentNumber = 1;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const isAcrossStart = startsAcrossWord(grid, row, col);
      const isDownStart = startsDownWord(grid, row, col);

      if (isAcrossStart || isDownStart) {
        cellNumbers[row][col] = currentNumber;

        if (isAcrossStart) {
          const word = extractWord(grid, row, col, true);
          acrossWords.push({
            number: currentNumber,
            word,
            row,
            col
          });
        }

        if (isDownStart) {
          const word = extractWord(grid, row, col, false);
          downWords.push({
            number: currentNumber,
            word,
            row,
            col
          });
        }

        currentNumber++;
      }
    }
  }

  return { cellNumbers, acrossWords, downWords };
}

export default generateNumbering;
