/**
 * Crossword Generator Algorithm
 *
 * Approach:
 * 1. Try multiple placement strategies
 * 2. For each strategy, place words and track success
 * 3. Return the result that places the most words
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

  for (let i = 0; i < word.length; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;

    const currentCell = grid[r][c];

    if (currentCell !== null) {
      // Cell is occupied - must match the letter
      if (currentCell !== word[i]) {
        return false;
      }
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
function findValidPlacements(grid, word, placements, isFirstWord = false, firstWordHorizontal = true) {
  const validPlacements = [];
  const width = grid[0].length;
  const height = grid.length;

  // If this is the first word, place it centered
  if (isFirstWord) {
    if (firstWordHorizontal) {
      const row = Math.floor(height / 2);
      const col = Math.floor((width - word.length) / 2);
      if (isValidPlacement(grid, word, row, col, true)) {
        validPlacements.push({ row, col, isHorizontal: true, intersections: 0, distanceFromCenter: 0 });
      }
    } else {
      const row = Math.floor((height - word.length) / 2);
      const col = Math.floor(width / 2);
      if (isValidPlacement(grid, word, row, col, false)) {
        validPlacements.push({ row, col, isHorizontal: false, intersections: 0, distanceFromCenter: 0 });
      }
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

            // Avoid duplicate placements
            const key = `${row},${col},${isHorizontal}`;
            if (!validPlacements.some(p => `${p.row},${p.col},${p.isHorizontal}` === key)) {
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
 * Attempts to place words with a given ordering and first word orientation
 */
function attemptPlacement(words, width, height, firstWordHorizontal) {
  let grid = createEmptyGrid(width, height);
  const placements = [];
  let unplacedWords = [];

  // First pass: try to place all words in order
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isFirstWord = placements.length === 0;
    const validPlacements = findValidPlacements(grid, word, placements, isFirstWord, firstWordHorizontal);

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

  // Additional passes: retry unplaced words
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

/**
 * Shuffles an array (Fisher-Yates)
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates a crossword from a list of words
 * @param {string[]} words - List of words to place
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Object} - { grid, placements, unplacedWords }
 */
export function generateCrossword(words, width, height) {
  // Clean words
  const cleanedWords = [...words]
    .map(w => w.toUpperCase().trim())
    .filter(w => w.length > 0);

  // Sort by length (longest first) as primary ordering
  const sortedByLength = [...cleanedWords].sort((a, b) => b.length - a.length);

  let bestResult = null;

  // Strategy 1: Longest first, horizontal start
  const result1 = attemptPlacement(sortedByLength, width, height, true);
  if (!bestResult || result1.placements.length > bestResult.placements.length) {
    bestResult = result1;
  }

  // If all words placed, return early
  if (bestResult.unplacedWords.length === 0) {
    return bestResult;
  }

  // Strategy 2: Longest first, vertical start
  const result2 = attemptPlacement(sortedByLength, width, height, false);
  if (result2.placements.length > bestResult.placements.length) {
    bestResult = result2;
  }

  if (bestResult.unplacedWords.length === 0) {
    return bestResult;
  }

  // Strategy 3-6: Try different orderings with shuffled words
  // Put shorter words first sometimes - they have more flexibility
  const sortedByLengthAsc = [...cleanedWords].sort((a, b) => a.length - b.length);

  const result3 = attemptPlacement(sortedByLengthAsc, width, height, true);
  if (result3.placements.length > bestResult.placements.length) {
    bestResult = result3;
  }

  const result4 = attemptPlacement(sortedByLengthAsc, width, height, false);
  if (result4.placements.length > bestResult.placements.length) {
    bestResult = result4;
  }

  // Strategy 5-8: Random shuffles
  for (let i = 0; i < 4; i++) {
    const shuffled = shuffle(cleanedWords);
    const resultH = attemptPlacement(shuffled, width, height, true);
    if (resultH.placements.length > bestResult.placements.length) {
      bestResult = resultH;
    }

    if (bestResult.unplacedWords.length === 0) {
      return bestResult;
    }

    const resultV = attemptPlacement(shuffled, width, height, false);
    if (resultV.placements.length > bestResult.placements.length) {
      bestResult = resultV;
    }

    if (bestResult.unplacedWords.length === 0) {
      return bestResult;
    }
  }

  return bestResult;
}

export default generateCrossword;
