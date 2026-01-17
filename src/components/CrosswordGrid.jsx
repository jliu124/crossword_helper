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
  { grid, cellNumbers, showLetters = true, onCellChange, canShift, onShift },
  ref
) {
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
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
    if (!grid || selectedCells.size < 2) {
      setSuggestions([]);
      return;
    }

    const pattern = getPatternFromSelection();
    if (!pattern) {
      setSuggestions([]);
      return;
    }

    // Only fetch if there's at least one known letter and one unknown
    const hasKnown = /[A-Z]/.test(pattern);
    const hasUnknown = /\?/.test(pattern);
    if (!hasKnown || !hasUnknown) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(
          `https://api.datamuse.com/words?sp=${pattern.toLowerCase()}&max=30`
        );
        const data = await response.json();

        // Filter and clean suggestions - only count letters
        const patternLength = pattern.length;
        const cleaned = data
          .map(item => {
            const word = item.word.toUpperCase();
            const lettersOnly = word.replace(/[^A-Z]/g, ''); // Remove non-letters
            return { original: word, lettersOnly };
          })
          .filter(item => item.lettersOnly.length === patternLength)
          .slice(0, 10)
          .map(item => item.lettersOnly); // Use letters-only version

        setSuggestions(cleaned);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setSuggestions([]);
      }
      setIsLoadingSuggestions(false);
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedCells, grid]);

  // Get pattern string from selected cells (if they form a line)
  const getPatternFromSelection = () => {
    if (selectedCells.size < 2) return null;

    const cells = Array.from(selectedCells).map(key => {
      const [row, col] = key.split('-').map(Number);
      return { row, col, letter: grid[row]?.[col] };
    });

    // Sort cells to determine if they form a horizontal or vertical line
    const rows = [...new Set(cells.map(c => c.row))];
    const cols = [...new Set(cells.map(c => c.col))];

    let sortedCells;
    if (rows.length === 1) {
      // Horizontal line
      sortedCells = cells.sort((a, b) => a.col - b.col);
      // Check if consecutive
      for (let i = 1; i < sortedCells.length; i++) {
        if (sortedCells[i].col !== sortedCells[i-1].col + 1) return null;
      }
    } else if (cols.length === 1) {
      // Vertical line
      sortedCells = cells.sort((a, b) => a.row - b.row);
      // Check if consecutive
      for (let i = 1; i < sortedCells.length; i++) {
        if (sortedCells[i].row !== sortedCells[i-1].row + 1) return null;
      }
    } else {
      // Not a straight line
      return null;
    }

    // Build pattern: letters for filled cells, ? for empty
    return sortedCells.map(c => c.letter || '?').join('');
  };

  // Get ordered cells for filling in a suggestion
  const getOrderedSelectedCells = () => {
    const cells = Array.from(selectedCells).map(key => {
      const [row, col] = key.split('-').map(Number);
      return { row, col, key };
    });

    const rows = [...new Set(cells.map(c => c.row))];
    const cols = [...new Set(cells.map(c => c.col))];

    if (rows.length === 1) {
      return cells.sort((a, b) => a.col - b.col);
    } else if (cols.length === 1) {
      return cells.sort((a, b) => a.row - b.row);
    }
    return cells;
  };

  // Fill selected cells with a suggestion
  const fillSuggestion = (word) => {
    const orderedCells = getOrderedSelectedCells();
    if (orderedCells.length !== word.length) return;

    orderedCells.forEach((cell, i) => {
      onCellChange?.(cell.row, cell.col, word[i]);
    });
    setSuggestions([]);
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
      // Clear all selected cells
      selectedCells.forEach((key) => {
        const [row, col] = key.split('-').map(Number);
        onCellChange?.(row, col, null);
      });
    } else if (e.key === 'Escape') {
      setSelectedCells(new Set());
      setSuggestions([]);
    } else if (/^[A-Z]$/.test(letter)) {
      e.preventDefault();
      // Set letter in all selected cells
      selectedCells.forEach((key) => {
        const [row, col] = key.split('-').map(Number);
        onCellChange?.(row, col, letter);
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
      setSuggestions([]);
    }
  };

  const pattern = getPatternFromSelection();

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
      <p className="grid-hint">
        Click to select, Shift+click or drag to select multiple. Type to fill, Backspace to clear.
      </p>

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
                const isBlack = cell === null;
                const key = cellKey(rowIndex, colIndex);
                const isSelected = selectedCells.has(key);

                return (
                  <div
                    key={key}
                    ref={(el) => { cellRefs.current[key] = el; }}
                    className={`grid-cell ${isBlack ? 'black' : 'white'} ${isSelected ? 'selected' : ''} editable`}
                    onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                    onMouseEnter={(e) => handleMouseEnter(e, rowIndex, colIndex)}
                  >
                    {cellNum && <span className="cell-number">{cellNum}</span>}
                    {!isBlack && showLetters && <span className="cell-letter">{cell}</span>}
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
      {(suggestions.length > 0 || isLoadingSuggestions || pattern) && (
        <div className="word-suggestions">
          <div className="suggestions-header">
            <strong>Pattern:</strong> {pattern || '—'}
          </div>
          {isLoadingSuggestions ? (
            <div className="suggestions-loading">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <div className="suggestions-list">
              {suggestions.map((word, i) => (
                <button
                  key={i}
                  className="suggestion-btn"
                  onClick={() => fillSuggestion(word)}
                  tabIndex={0}
                >
                  {word}
                </button>
              ))}
            </div>
          ) : pattern && /[A-Z]/.test(pattern) && /\?/.test(pattern) ? (
            <div className="suggestions-empty">No suggestions found</div>
          ) : pattern ? (
            <div className="suggestions-empty">Select cells with at least one letter</div>
          ) : null}
        </div>
      )}
    </div>
  );
});

export default CrosswordGrid;
