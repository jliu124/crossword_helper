import { forwardRef, useState, useRef, useEffect } from 'react';

/**
 * CrosswordGrid Component
 * Displays the generated crossword grid
 * - Black cells for unused squares (clickable to add letters)
 * - White cells for letters (editable)
 * - Numbers in top-left corner of word-start cells
 * - Multi-cell selection with shift+click or click+drag
 * - Word suggestions from Datamuse API for selected patterns
 */
const CrosswordGrid = forwardRef(function CrosswordGrid(
  { grid, cellNumbers, showLetters = true, onCellChange, canShift, onShift, pencilMarks = {}, onPencilChange },
  ref
) {
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [pencilMode, setPencilMode] = useState(false);
  // Each direction has array of {pattern, cells, key} objects
  const [wordInfos, setWordInfos] = useState({ across: [], down: [] });
  const [suggestions, setSuggestions] = useState({}); // keyed by pattern
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const gridContainerRef = useRef(null);
  const cellRefs = useRef({});

  // Focus the grid container when cells are selected
  useEffect(() => {
    if (selectedCells.size > 0 && gridContainerRef.current) {
      gridContainerRef.current.focus();
    }
  }, [selectedCells]);

  // Fetch word suggestions when selection changes
  useEffect(() => {
    if (!grid || selectedCells.size < 1) {
      setWordInfos({ across: [], down: [] });
      setSuggestions({});
      return;
    }

    const patternInfo = getPatternsForBothDirections();

    // Filter to only valid patterns (has known letter and unknown)
    const validAcross = patternInfo.across.filter(info => {
      if (!info.pattern || info.pattern.length < 2) return false;
      return /[A-Z]/.test(info.pattern) && /\?/.test(info.pattern);
    });

    const validDown = patternInfo.down.filter(info => {
      if (!info.pattern || info.pattern.length < 2) return false;
      return /[A-Z]/.test(info.pattern) && /\?/.test(info.pattern);
    });

    // Build cells to fill for each pattern
    const processedAcross = validAcross.map(info => ({
      ...info,
      cellsToFill: info.allCells
        .map((cell, i) => ({ row: cell.row, col: cell.col, wordIndex: i, isSelected: cell.isSelected }))
        .filter(cell => cell.isSelected)
    }));

    const processedDown = validDown.map(info => ({
      ...info,
      cellsToFill: info.allCells
        .map((cell, i) => ({ row: cell.row, col: cell.col, wordIndex: i, isSelected: cell.isSelected }))
        .filter(cell => cell.isSelected)
    }));

    setWordInfos({ across: processedAcross, down: processedDown });

    // Collect all unique patterns to fetch
    const allPatterns = [...validAcross, ...validDown].map(info => info.pattern);
    const uniquePatterns = [...new Set(allPatterns)];

    if (uniquePatterns.length === 0) {
      setSuggestions({});
      return;
    }

    const fetchSuggestionsForPattern = async (pattern) => {
      try {
        const response = await fetch(
          `https://api.datamuse.com/words?sp=${pattern.toLowerCase()}&max=100`
        );
        const data = await response.json();
        const patternLength = pattern.length;
        return data
          .map(item => {
            const word = item.word.toUpperCase();
            const lettersOnly = word.replace(/[^A-Z]/g, '');
            return { original: word, lettersOnly };
          })
          .filter(item => item.lettersOnly.length === patternLength)
          .map(item => item.lettersOnly);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        return [];
      }
    };

    const fetchAllSuggestions = async () => {
      setIsLoadingSuggestions(true);
      const results = await Promise.all(
        uniquePatterns.map(async pattern => ({
          pattern,
          suggestions: await fetchSuggestionsForPattern(pattern)
        }))
      );
      const suggestionsMap = {};
      results.forEach(({ pattern, suggestions }) => {
        suggestionsMap[pattern] = suggestions;
      });
      setSuggestions(suggestionsMap);
      setIsLoadingSuggestions(false);
    };

    const debounceTimer = setTimeout(fetchAllSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedCells, grid]);

  // Get pattern info for a single cell in a specific direction
  const getPatternForCellInDirection = (row, col, isHorizontal) => {
    const height = grid.length;
    const width = grid[0].length;
    const selectedSet = selectedCells;

    // Helper: check if a cell is part of the word (filled OR selected)
    const isPartOfWord = (r, c) => {
      if (r < 0 || r >= height || c < 0 || c >= width) return false;
      return grid[r][c] !== null || selectedSet.has(`${r}-${c}`);
    };

    const cells = [];

    if (isHorizontal) {
      // Find the start of the word (go left until we hit a cell that's not part of word)
      let startCol = col;
      while (startCol > 0 && isPartOfWord(row, startCol - 1)) {
        startCol--;
      }
      // Find the end of the word (go right until we hit a cell that's not part of word)
      let endCol = col;
      while (endCol < width - 1 && isPartOfWord(row, endCol + 1)) {
        endCol++;
      }
      // Build the word from start to end
      for (let c = startCol; c <= endCol; c++) {
        const key = `${row}-${c}`;
        cells.push({
          row,
          col: c,
          letter: grid[row][c],
          isSelected: selectedSet.has(key)
        });
      }
    } else {
      // Find the start of the word (go up until we hit a cell that's not part of word)
      let startRow = row;
      while (startRow > 0 && isPartOfWord(startRow - 1, col)) {
        startRow--;
      }
      // Find the end of the word (go down until we hit a cell that's not part of word)
      let endRow = row;
      while (endRow < height - 1 && isPartOfWord(endRow + 1, col)) {
        endRow++;
      }
      // Build the word from start to end
      for (let r = startRow; r <= endRow; r++) {
        const key = `${r}-${col}`;
        cells.push({
          row: r,
          col,
          letter: grid[r][col],
          isSelected: selectedSet.has(key)
        });
      }
    }

    if (cells.length < 2) return null;

    const pattern = cells.map(c => c.letter || '?').join('');
    return { pattern, allCells: cells };
  };

  // Get patterns for both directions based on selected cells
  const getPatternsForBothDirections = () => {
    if (selectedCells.size < 1 || !grid) return { across: [], down: [] };

    const cells = Array.from(selectedCells).map(key => {
      const [row, col] = key.split('-').map(Number);
      return { row, col };
    });

    // For across: get unique rows and find pattern for each
    const uniqueRows = [...new Set(cells.map(c => c.row))];
    const acrossPatterns = [];
    const seenAcrossPatterns = new Set();

    for (const row of uniqueRows) {
      const cellInRow = cells.find(c => c.row === row);
      const info = getPatternForCellInDirection(row, cellInRow.col, true);
      if (info && !seenAcrossPatterns.has(info.pattern)) {
        seenAcrossPatterns.add(info.pattern);
        acrossPatterns.push({
          pattern: info.pattern,
          allCells: info.allCells,
          key: `across-${row}`
        });
      }
    }

    // For down: get unique columns and find pattern for each
    const uniqueCols = [...new Set(cells.map(c => c.col))];
    const downPatterns = [];
    const seenDownPatterns = new Set();

    for (const col of uniqueCols) {
      const cellInCol = cells.find(c => c.col === col);
      const info = getPatternForCellInDirection(cellInCol.row, col, false);
      if (info && !seenDownPatterns.has(info.pattern)) {
        seenDownPatterns.add(info.pattern);
        downPatterns.push({
          pattern: info.pattern,
          allCells: info.allCells,
          key: `down-${col}`
        });
      }
    }

    return { across: acrossPatterns, down: downPatterns };
  };

  // Fill selected cells with a suggestion
  const fillSuggestion = (word, wordInfo) => {
    const cells = wordInfo.cellsToFill;
    if (!cells || cells.length === 0) return;

    // Build all changes at once to avoid React batching issues
    const changes = cells
      .filter(cell => cell.wordIndex < word.length)
      .map(cell => ({
        row: cell.row,
        col: cell.col,
        letter: word[cell.wordIndex]
      }));

    if (changes.length > 0) {
      onCellChange?.(changes);
    }

    setWordInfos({ across: [], down: [] });
    setSuggestions({});
  };

  if (!grid || grid.length === 0) {
    return (
      <div className="crossword-grid-empty">
        <p>Generate a crossword to see it here</p>
      </div>
    );
  }

  const height = grid.length;
  const width = grid[0].length;

  const cellKey = (row, col) => `${row}-${col}`;

  const handleMouseDown = (e, rowIndex, colIndex) => {
    e.preventDefault();
    const key = cellKey(rowIndex, colIndex);

    if (e.shiftKey && selectedCells.size > 0) {
      // Shift+click: select range from last selected to current
      const lastSelected = Array.from(selectedCells).pop();
      if (lastSelected) {
        const [lastRow, lastCol] = lastSelected.split('-').map(Number);
        const newSelection = new Set(selectedCells);

        const minRow = Math.min(lastRow, rowIndex);
        const maxRow = Math.max(lastRow, rowIndex);
        const minCol = Math.min(lastCol, colIndex);
        const maxCol = Math.max(lastCol, colIndex);

        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            newSelection.add(cellKey(r, c));
          }
        }
        setSelectedCells(newSelection);
      }
    } else {
      // Regular click: start new selection
      setSelectedCells(new Set([key]));
      setIsDragging(true);
      setDragStart({ row: rowIndex, col: colIndex });
    }
  };

  const handleMouseEnter = (e, rowIndex, colIndex) => {
    if (isDragging && dragStart) {
      // Select rectangular region from drag start to current
      const newSelection = new Set();
      const minRow = Math.min(dragStart.row, rowIndex);
      const maxRow = Math.max(dragStart.row, rowIndex);
      const minCol = Math.min(dragStart.col, colIndex);
      const maxCol = Math.max(dragStart.col, colIndex);

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(cellKey(r, c));
        }
      }
      setSelectedCells(newSelection);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleKeyDown = (e) => {
    if (selectedCells.size === 0) return;

    const letter = e.key.toUpperCase();

    // Arrow key navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();

      // Get the "anchor" cell (last selected, or first if shift-extending)
      const selectedArray = Array.from(selectedCells);
      const lastKey = selectedArray[selectedArray.length - 1];
      const [row, col] = lastKey.split('-').map(Number);

      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(height - 1, row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(width - 1, col + 1);
          break;
      }

      const newKey = cellKey(newRow, newCol);

      if (e.shiftKey) {
        // Extend selection
        const newSelection = new Set(selectedCells);
        newSelection.add(newKey);
        setSelectedCells(newSelection);
      } else {
        // Move to new cell
        setSelectedCells(new Set([newKey]));
      }
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      selectedCells.forEach((key) => {
        const [row, col] = key.split('-').map(Number);
        const currentPencil = pencilMarks[key] || '';

        if (pencilMode && currentPencil.length > 0) {
          // In pencil mode, remove last letter one at a time
          const newMarks = currentPencil.slice(0, -1);
          onPencilChange?.(row, col, newMarks || null);
        } else {
          // In regular mode or no pencil marks, clear everything
          onCellChange?.(row, col, null);
          onPencilChange?.(row, col, null);
        }
      });
    } else if (e.key === 'Escape') {
      setSelectedCells(new Set());
      setSuggestions({});
    } else if (/^[A-Z]$/.test(letter)) {
      e.preventDefault();
      // Set letter in all selected cells
      selectedCells.forEach((key) => {
        const [row, col] = key.split('-').map(Number);
        if (pencilMode) {
          // In pencil mode, toggle the letter in pencil marks
          const currentMarks = pencilMarks[key] || '';
          const newMarks = currentMarks.includes(letter)
            ? currentMarks.replace(letter, '')
            : currentMarks + letter;
          onPencilChange?.(row, col, newMarks || null);
          onCellChange?.(row, col, null);
        } else {
          // In regular mode, set regular letter and clear pencil marks
          onCellChange?.(row, col, letter);
          onPencilChange?.(row, col, null);
        }
      });
    }
  };

  const handleBlur = (e) => {
    // Only deselect if focus is leaving the grid entirely
    const relatedTarget = e.relatedTarget;
    const suggestionsEl = document.querySelector('.word-suggestions');
    if (
      !relatedTarget ||
      (!gridContainerRef.current?.contains(relatedTarget) && !suggestionsEl?.contains(relatedTarget))
    ) {
      setSelectedCells(new Set());
      setSuggestions({});
      setWordInfos({ across: [], down: [] });
    }
  };

  // Shift button component
  const ShiftButton = ({ direction, toEdge, label }) => {
    const disabled = !canShift?.(direction);
    return (
      <button
        className={`shift-btn shift-${direction}${toEdge ? '-edge' : ''}`}
        onClick={() => onShift?.(direction, toEdge)}
        disabled={disabled}
        title={`Shift ${toEdge ? 'all the way ' : ''}${direction}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="crossword-grid-container">
      <div className="grid-toolbar">
        <p className="grid-hint">
          Click to select, Shift+click or drag to select multiple. Type to fill, Backspace to clear.
        </p>
        <button
          className={`pencil-mode-btn ${pencilMode ? 'active' : ''}`}
          onClick={() => setPencilMode(!pencilMode)}
          title={pencilMode ? 'Turn off pencil mode' : 'Turn on pencil mode'}
        >
          {pencilMode ? 'Pencil Mode On' : 'Pencil Mode Off'}
        </button>
      </div>

      {/* Grid with shift controls */}
      <div className="grid-with-controls">
        {/* Top controls */}
        <div className="shift-controls shift-controls-top">
          <ShiftButton direction="up" toEdge={true} label="⇈" />
          <ShiftButton direction="up" toEdge={false} label="↑" />
        </div>

        {/* Middle row: left controls, grid, right controls */}
        <div className="grid-middle-row">
          {/* Left controls */}
          <div className="shift-controls shift-controls-left">
            <ShiftButton direction="left" toEdge={true} label="⇇" />
            <ShiftButton direction="left" toEdge={false} label="←" />
          </div>

          {/* The grid */}
          <div
            ref={(el) => {
              gridContainerRef.current = el;
              if (typeof ref === 'function') ref(el);
              else if (ref) ref.current = el;
            }}
            className="crossword-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${width}, 1fr)`,
              gridTemplateRows: `repeat(${height}, 1fr)`,
            }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellNum = cellNumbers?.[rowIndex]?.[colIndex];
                const key = cellKey(rowIndex, colIndex);
                const pencilMark = pencilMarks[key] || '';
                const hasRegularLetter = cell !== null;
                const hasPencilMark = pencilMark.length > 0;
                const isBlack = !hasRegularLetter && !hasPencilMark;
                const isSelected = selectedCells.has(key);
                // Sort pencil marks alphabetically for consistent display
                const sortedPencilMarks = pencilMark.split('').sort().join('');

                return (
                  <div
                    key={key}
                    ref={(el) => { cellRefs.current[key] = el; }}
                    className={`grid-cell ${isBlack ? 'black' : 'white'} ${isSelected ? 'selected' : ''} editable`}
                    onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                    onMouseEnter={(e) => handleMouseEnter(e, rowIndex, colIndex)}
                  >
                    {cellNum && <span className="cell-number">{cellNum}</span>}
                    {showLetters && hasRegularLetter && (
                      <span className="cell-letter">{cell}</span>
                    )}
                    {showLetters && !hasRegularLetter && hasPencilMark && (
                      <div className="pencil-marks">
                        {sortedPencilMarks.split('').map((letter, i) => (
                          <span key={i} className="pencil-letter">{letter}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right controls */}
          <div className="shift-controls shift-controls-right">
            <ShiftButton direction="right" toEdge={false} label="→" />
            <ShiftButton direction="right" toEdge={true} label="⇉" />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="shift-controls shift-controls-bottom">
          <ShiftButton direction="down" toEdge={false} label="↓" />
          <ShiftButton direction="down" toEdge={true} label="⇊" />
        </div>
      </div>

      {/* Word suggestions panel */}
      {(wordInfos.across.length > 0 || wordInfos.down.length > 0 || isLoadingSuggestions) && (
        <div className="word-suggestions">
          {isLoadingSuggestions ? (
            <div className="suggestions-loading">Loading suggestions...</div>
          ) : (
            <>
              {/* Across suggestions */}
              {wordInfos.across.length > 0 && (
                <div className="suggestions-direction">
                  <div className="suggestions-header"><strong>Across:</strong></div>
                  {wordInfos.across.map((info) => (
                    <div key={info.key} className="suggestions-pattern-group">
                      <div className="pattern-label">{info.pattern}</div>
                      {suggestions[info.pattern]?.length > 0 ? (
                        <div className="suggestions-list">
                          {suggestions[info.pattern].map((word, i) => (
                            <button
                              key={i}
                              className="suggestion-btn"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                fillSuggestion(word, info);
                              }}
                              tabIndex={0}
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="suggestions-empty">No suggestions found</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Down suggestions */}
              {wordInfos.down.length > 0 && (
                <div className="suggestions-direction">
                  <div className="suggestions-header"><strong>Down:</strong></div>
                  {wordInfos.down.map((info) => (
                    <div key={info.key} className="suggestions-pattern-group">
                      <div className="pattern-label">{info.pattern}</div>
                      {suggestions[info.pattern]?.length > 0 ? (
                        <div className="suggestions-list">
                          {suggestions[info.pattern].map((word, i) => (
                            <button
                              key={i}
                              className="suggestion-btn"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                fillSuggestion(word, info);
                              }}
                              tabIndex={0}
                            >
                              {word}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="suggestions-empty">No suggestions found</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default CrosswordGrid;
