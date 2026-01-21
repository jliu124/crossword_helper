import { useState, useRef, useEffect } from 'react';
import WordInput from './components/WordInput';
import GridSettings from './components/GridSettings';
import CrosswordGrid from './components/CrosswordGrid';
import ClueEditor from './components/ClueEditor';
import ExportPanel from './components/ExportPanel';
import { generateCrossword } from './utils/crosswordGenerator';
import { generateNumbering } from './utils/numberingUtils';

function App() {
  // Grid settings
  const [gridWidth, setGridWidth] = useState(15);
  const [gridHeight, setGridHeight] = useState(15);

  // Crossword state
  const [grid, setGrid] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [words, setWords] = useState([]);
  const [displayNames, setDisplayNames] = useState({}); // Maps processed word -> original with spaces
  const [cellNumbers, setCellNumbers] = useState([]);
  const [acrossWords, setAcrossWords] = useState([]);
  const [downWords, setDownWords] = useState([]);
  const [unplacedWords, setUnplacedWords] = useState([]);

  // Clues
  const [clues, setClues] = useState({ across: {}, down: {} });

  // Show letters toggle
  const [showLetters, setShowLetters] = useState(true);

  // Pencil marks (tentative letters)
  const [pencilMarks, setPencilMarks] = useState({});

  // Ref for grid export
  const gridRef = useRef(null);

  // Clean up clues when words are deleted from the grid
  useEffect(() => {
    const currentAcrossWords = new Set(acrossWords.map(w => w.word));
    const currentDownWords = new Set(downWords.map(w => w.word));

    setClues(prev => {
      const newAcross = {};
      const newDown = {};

      // Only keep clues for words that still exist
      Object.keys(prev.across).forEach(word => {
        if (currentAcrossWords.has(word)) {
          newAcross[word] = prev.across[word];
        }
      });

      Object.keys(prev.down).forEach(word => {
        if (currentDownWords.has(word)) {
          newDown[word] = prev.down[word];
        }
      });

      return { across: newAcross, down: newDown };
    });
  }, [acrossWords, downWords]);

  // Generate crossword
  const handleGenerate = (inputWords, inputDisplayNames) => {
    const result = generateCrossword(inputWords, gridWidth, gridHeight);

    setGrid(result.grid);
    setPlacements(result.placements);
    setWords(inputWords);
    setDisplayNames(inputDisplayNames || {});
    setUnplacedWords(result.unplacedWords);

    // Generate numbering
    const numbering = generateNumbering(result.grid);
    setCellNumbers(numbering.cellNumbers);
    setAcrossWords(numbering.acrossWords);
    setDownWords(numbering.downWords);

    // Reset clues
    setClues({ across: {}, down: {} });
  };

  // Handle clue change (keyed by word, not number, so clues follow words when renumbered)
  const handleClueChange = (direction, word, value) => {
    setClues((prev) => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [word]: value
      }
    }));
  };

  // Handle display name change
  const handleDisplayNameChange = (word, newDisplayName) => {
    setDisplayNames((prev) => ({
      ...prev,
      [word]: newDisplayName
    }));
  };

  // Handle cell change (manual editing)
  // Can accept a single cell (row, col, letter) or multiple cells (array of {row, col, letter})
  const handleCellChange = (rowOrChanges, col, letter) => {
    let changes;
    if (Array.isArray(rowOrChanges)) {
      changes = rowOrChanges;
    } else {
      changes = [{ row: rowOrChanges, col, letter }];
    }

    const newGrid = grid.map((r, rowIndex) =>
      r.map((cell, colIndex) => {
        const change = changes.find(c => c.row === rowIndex && c.col === colIndex);
        if (change) {
          return change.letter;
        }
        return cell;
      })
    );

    setGrid(newGrid);

    // Regenerate numbering based on new grid
    const numbering = generateNumbering(newGrid);
    setCellNumbers(numbering.cellNumbers);
    setAcrossWords(numbering.acrossWords);
    setDownWords(numbering.downWords);
  };

  // Handle pencil mark change
  const handlePencilChange = (row, col, letter) => {
    const key = `${row}-${col}`;
    setPencilMarks(prev => {
      const updated = { ...prev };
      if (letter === null) {
        delete updated[key];
      } else {
        updated[key] = letter;
      }
      return updated;
    });
  };

  // Check if grid can be shifted in a direction
  const canShift = (direction) => {
    if (!grid) return false;
    const height = grid.length;
    const width = grid[0].length;

    switch (direction) {
      case 'up':
        // Can't shift up if any filled cell is in top row
        return !grid[0].some(cell => cell !== null);
      case 'down':
        // Can't shift down if any filled cell is in bottom row
        return !grid[height - 1].some(cell => cell !== null);
      case 'left':
        // Can't shift left if any filled cell is in leftmost column
        return !grid.some(row => row[0] !== null);
      case 'right':
        // Can't shift right if any filled cell is in rightmost column
        return !grid.some(row => row[width - 1] !== null);
      default:
        return false;
    }
  };

  // Shift all filled cells in a direction
  const shiftGrid = (direction, toEdge = false) => {
    if (!grid) return;

    let newGrid = grid.map(row => [...row]);
    const height = newGrid.length;
    const width = newGrid[0].length;

    const shiftOnce = (dir) => {
      const shifted = newGrid.map(row => [...row]);

      switch (dir) {
        case 'up':
          for (let r = 0; r < height - 1; r++) {
            for (let c = 0; c < width; c++) {
              shifted[r][c] = newGrid[r + 1][c];
            }
          }
          for (let c = 0; c < width; c++) {
            shifted[height - 1][c] = null;
          }
          break;
        case 'down':
          for (let r = height - 1; r > 0; r--) {
            for (let c = 0; c < width; c++) {
              shifted[r][c] = newGrid[r - 1][c];
            }
          }
          for (let c = 0; c < width; c++) {
            shifted[0][c] = null;
          }
          break;
        case 'left':
          for (let r = 0; r < height; r++) {
            for (let c = 0; c < width - 1; c++) {
              shifted[r][c] = newGrid[r][c + 1];
            }
            shifted[r][width - 1] = null;
          }
          break;
        case 'right':
          for (let r = 0; r < height; r++) {
            for (let c = width - 1; c > 0; c--) {
              shifted[r][c] = newGrid[r][c - 1];
            }
            shifted[r][0] = null;
          }
          break;
      }
      return shifted;
    };

    const canShiftGrid = (g, dir) => {
      switch (dir) {
        case 'up':
          return !g[0].some(cell => cell !== null);
        case 'down':
          return !g[height - 1].some(cell => cell !== null);
        case 'left':
          return !g.some(row => row[0] !== null);
        case 'right':
          return !g.some(row => row[width - 1] !== null);
        default:
          return false;
      }
    };

    if (toEdge) {
      // Shift until we can't anymore
      while (canShiftGrid(newGrid, direction)) {
        newGrid = shiftOnce(direction);
      }
    } else {
      // Single shift
      if (canShiftGrid(newGrid, direction)) {
        newGrid = shiftOnce(direction);
      }
    }

    setGrid(newGrid);

    // Regenerate numbering
    const numbering = generateNumbering(newGrid);
    setCellNumbers(numbering.cellNumbers);
    setAcrossWords(numbering.acrossWords);
    setDownWords(numbering.downWords);
  };

  // Load from JSON
  const handleLoad = (data) => {
    setGridWidth(data.gridWidth);
    setGridHeight(data.gridHeight);
    setWords(data.words);
    setDisplayNames(data.displayNames || {});
    setPlacements(data.placements);
    setClues(data.clues || { across: {}, down: {} });

    // Reconstruct grid from saved placements
    const loadedGrid = Array(data.gridHeight)
      .fill(null)
      .map(() => Array(data.gridWidth).fill(null));

    for (const placement of data.placements) {
      const { word, row, col, isHorizontal } = placement;
      for (let i = 0; i < word.length; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        if (r < data.gridHeight && c < data.gridWidth) {
          loadedGrid[r][c] = word[i];
        }
      }
    }

    setGrid(loadedGrid);
    setUnplacedWords([]);

    // Generate numbering
    const numbering = generateNumbering(loadedGrid);
    setCellNumbers(numbering.cellNumbers);
    setAcrossWords(numbering.acrossWords);
    setDownWords(numbering.downWords);
  };

  // Reset crossword
  const handleReset = () => {
    setGrid(null);
    setPlacements([]);
    setWords([]);
    setDisplayNames({});
    setCellNumbers([]);
    setAcrossWords([]);
    setDownWords([]);
    setUnplacedWords([]);
    setClues({ across: {}, down: {} });
    setPencilMarks({});
  };

  return (
    <div className="app">
      <header>
        <h1>Crossword Helper</h1>
        <p>Create crossword puzzles from your word list</p>
      </header>

      <main>
        <div className="sidebar">
          <GridSettings
            width={gridWidth}
            height={gridHeight}
            onWidthChange={setGridWidth}
            onHeightChange={setGridHeight}
            disabled={grid !== null}
          />

          <WordInput onGenerate={handleGenerate} disabled={grid !== null} />

          {grid && (
            <button className="reset-button" onClick={handleReset}>
              Reset / New Crossword
            </button>
          )}

          <ExportPanel
            gridRef={gridRef}
            grid={grid}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            words={words}
            displayNames={displayNames}
            placements={placements}
            clues={clues}
            acrossWords={acrossWords}
            downWords={downWords}
            onLoad={handleLoad}
            disabled={!grid}
          />
        </div>

        <div className="content">
          {unplacedWords.length > 0 && (
            <div className="warning">
              <strong>Warning:</strong> The following words could not be placed:{' '}
              {unplacedWords.join(', ')}
            </div>
          )}

          {grid && (
            <div className="grid-controls">
              <label>
                <input
                  type="checkbox"
                  checked={showLetters}
                  onChange={(e) => setShowLetters(e.target.checked)}
                />
                Show letters (uncheck for solving view)
              </label>
            </div>
          )}

          <CrosswordGrid
            ref={gridRef}
            grid={grid}
            cellNumbers={cellNumbers}
            showLetters={showLetters}
            onCellChange={handleCellChange}
            canShift={canShift}
            onShift={shiftGrid}
            pencilMarks={pencilMarks}
            onPencilChange={handlePencilChange}
          />

          <ClueEditor
            acrossWords={acrossWords}
            downWords={downWords}
            clues={clues}
            displayNames={displayNames}
            onClueChange={handleClueChange}
            onDisplayNameChange={handleDisplayNameChange}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
