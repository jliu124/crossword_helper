/**
 * Crossword Generator Algorithm
 *
 * Approach:
 * 1. Sort words by length (longest first - they constrain the grid most)
 * 2. Place the first word horizontally, centered
 * 3. For each remaining word, find valid intersections and choose the best
 * 4. If a word can't be placed, skip it and report to user
 */

/**
 * Creates an empty grid filled with null values
 */
function createEmptyGrid(width, height) {
  return Array(height).fill(null).map(() => Array(width).fill(null));
}

/**
 * Checks if a word placement is valid
 */
function isValidPlacement(grid, word, row, col, isHorizontal) {
  const width = grid[0].length;
  const height = grid.length;

  // Check bounds
  if (isHorizontal) {
    if (col < 0 || col + word.length > width) return false;
    if (row < 0 || row >= height) return false;
  } else {
    if (row < 0 || row + word.length > height) return false;
    if (col < 0 || col >= width) return false;
  }

  // Check for cell before word (should be empty or boundary)
  if (isHorizontal) {
    if (col > 0 && grid[row][col - 1] !== null) return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== null) return false;
  }

  // Check for cell after word (should be empty or boundary)
  if (isHorizontal) {
    if (col + word.length < width && grid[row][col + word.length] !== null) return false;
  } else {
    if (row + word.length < height && grid[row + word.length][col] !== null) return false;
  }

  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;

    const currentCell = grid[r][c];

    if (currentCell !== null) {
      // Cell is occupied - must match the letter
      if (currentCell !== word[i]) {
        return false;
      }
      hasIntersection = true;
    } else {
      // Cell is empty - check for adjacent parallel words
      if (isHorizontal) {
        // Check cells above and below
        const above = r > 0 ? grid[r - 1][c] : null;
        const below = r < height - 1 ? grid[r + 1][c] : null;
        if (above !== null || below !== null) {
          return false;
        }
      } else {
        // Check cells left and right
        const left = c > 0 ? grid[r][c - 1] : null;
        const right = c < width - 1 ? grid[r][c + 1] : null;
        if (left !== null || right !== null) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Places a word on the grid
 */
function placeWord(grid, word, row, col, isHorizontal) {
  const newGrid = grid.map(r => [...r]);

  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;
    newGrid[r][c] = word[i];
  }

  return newGrid;
}

/**
 * Finds all valid placements for a word on the grid
 */
function findValidPlacements(grid, word, placements) {
  const validPlacements = [];
  const width = grid[0].length;
  const height = grid.length;

  // If this is the first word, place it horizontally centered
  if (placements.length === 0) {
    const row = Math.floor(height / 2);
    const col = Math.floor((width - word.length) / 2);
    if (isValidPlacement(grid, word, row, col, true)) {
      validPlacements.push({ row, col, isHorizontal: true, intersections: 0 });
    }
    return validPlacements;
  }

  // Find intersections with placed words
  for (const placement of placements) {
    const placedWord = placement.word;

    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < placedWord.length; j++) {
        if (word[i] === placedWord[j]) {
          // Found a matching letter - try to place perpendicular
          let row, col;
          const isHorizontal = !placement.isHorizontal;

          if (isHorizontal) {
            // Place horizontally intersecting a vertical word
            row = placement.row + j;
            col = placement.col - i;
          } else {
            // Place vertically intersecting a horizontal word
            row = placement.row - i;
            col = placement.col + j;
          }

          if (isValidPlacement(grid, word, row, col, isHorizontal)) {
            // Count intersections for scoring
            let intersections = 0;
            for (let k = 0; k < word.length; k++) {
              const r = isHorizontal ? row : row + k;
              const c = isHorizontal ? col + k : col;
              if (grid[r][c] !== null) {
                intersections++;
              }
            }

            // Calculate distance from center for scoring
            const centerRow = height / 2;
            const centerCol = width / 2;
            const wordCenterRow = isHorizontal ? row : row + word.length / 2;
            const wordCenterCol = isHorizontal ? col + word.length / 2 : col;
            const distanceFromCenter = Math.abs(wordCenterRow - centerRow) + Math.abs(wordCenterCol - centerCol);

            validPlacements.push({
              row,
              col,
              isHorizontal,
              intersections,
              distanceFromCenter
            });
          }
        }
      }
    }
  }

  return validPlacements;
}

/**
 * Scores a placement (higher is better)
 */
function scorePlacement(placement) {
  // Prefer more intersections and more central positions
  return placement.intersections * 100 - placement.distanceFromCenter;
}

/**
 * Generates a crossword from a list of words
 * @param {string[]} words - List of words to place
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Object} - { grid, placements, unplacedWords }
 */
export function generateCrossword(words, width, height) {
  // Clean and sort words by length (longest first)
  const sortedWords = [...words]
    .map(w => w.toUpperCase().trim())
    .filter(w => w.length > 0)
    .sort((a, b) => b.length - a.length);

  let grid = createEmptyGrid(width, height);
  const placements = [];
  let unplacedWords = [];

  // First pass: try to place all words in order
  for (const word of sortedWords) {
    const validPlacements = findValidPlacements(grid, word, placements);

    if (validPlacements.length === 0) {
      unplacedWords.push(word);
      continue;
    }

    // Sort by score and pick the best
    validPlacements.sort((a, b) => scorePlacement(b) - scorePlacement(a));
    const best = validPlacements[0];

    grid = placeWord(grid, word, best.row, best.col, best.isHorizontal);
    placements.push({
      word,
      row: best.row,
      col: best.col,
      isHorizontal: best.isHorizontal
    });
  }

  // Additional passes: retry unplaced words since more words are now on the grid
  // Keep trying until no more words can be placed
  let madeProgress = true;
  while (madeProgress && unplacedWords.length > 0) {
    madeProgress = false;
    const stillUnplaced = [];

    for (const word of unplacedWords) {
      const validPlacements = findValidPlacements(grid, word, placements);

      if (validPlacements.length === 0) {
        stillUnplaced.push(word);
        continue;
      }

      // Sort by score and pick the best
      validPlacements.sort((a, b) => scorePlacement(b) - scorePlacement(a));
      const best = validPlacements[0];

      grid = placeWord(grid, word, best.row, best.col, best.isHorizontal);
      placements.push({
        word,
        row: best.row,
        col: best.col,
        isHorizontal: best.isHorizontal
      });
      madeProgress = true;
    }

    unplacedWords = stillUnplaced;
  }

  return { grid, placements, unplacedWords };
}

export default generateCrossword;
