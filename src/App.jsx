import { useState, useRef } from 'react';
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

  // Ref for grid export
  const gridRef = useRef(null);

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

  // Handle clue change
  const handleClueChange = (direction, number, value) => {
    setClues((prev) => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [number]: value
      }
    }));
  };

  // Handle cell change (manual editing)
  const handleCellChange = (row, col, letter) => {
    const newGrid = grid.map((r, rowIndex) =>
      r.map((cell, colIndex) => {
        if (rowIndex === row && colIndex === col) {
          return letter;
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

  // Load from JSON
  const handleLoad = (data) => {
    setGridWidth(data.gridWidth);
    setGridHeight(data.gridHeight);
    setWords(data.words);
    setDisplayNames(data.displayNames || {});
    setPlacements(data.placements);
    setClues(data.clues || { across: {}, down: {} });

    // Regenerate grid from placements
    const result = generateCrossword(data.words, data.gridWidth, data.gridHeight);
    setGrid(result.grid);
    setUnplacedWords(result.unplacedWords);

    // Generate numbering
    const numbering = generateNumbering(result.grid);
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
          />

          <ClueEditor
            acrossWords={acrossWords}
            downWords={downWords}
            clues={clues}
            displayNames={displayNames}
            onClueChange={handleClueChange}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
