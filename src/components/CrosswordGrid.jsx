import { forwardRef, useState, useRef, useEffect } from 'react';

/**
 * CrosswordGrid Component
 * Displays the generated crossword grid
 * - Black cells for unused squares (clickable to add letters)
 * - White cells for letters (editable)
 * - Numbers in top-left corner of word-start cells
 */
const CrosswordGrid = forwardRef(function CrosswordGrid(
  { grid, cellNumbers, showLetters = true, onCellChange },
  ref
) {
  const [selectedCell, setSelectedCell] = useState(null);
  const cellRefs = useRef({});

  // Focus the selected cell
  useEffect(() => {
    if (selectedCell) {
      const key = `${selectedCell.row}-${selectedCell.col}`;
      const cellEl = cellRefs.current[key];
      if (cellEl) {
        cellEl.focus();
      }
    }
  }, [selectedCell]);

  if (!grid || grid.length === 0) {
    return (
      <div className="crossword-grid-empty">
        <p>Generate a crossword to see it here</p>
      </div>
    );
  }

  const height = grid.length;
  const width = grid[0].length;

  const handleCellClick = (e, rowIndex, colIndex) => {
    e.preventDefault();
    setSelectedCell({ row: rowIndex, col: colIndex });
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    const letter = e.key.toUpperCase();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onCellChange?.(rowIndex, colIndex, null);
    } else if (e.key === 'Escape') {
      setSelectedCell(null);
    } else if (/^[A-Z]$/.test(letter)) {
      e.preventDefault();
      onCellChange?.(rowIndex, colIndex, letter);
    }
  };

  const handleBlur = (e) => {
    // Only deselect if focus is leaving the grid entirely
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !relatedTarget.classList.contains('grid-cell')) {
      setSelectedCell(null);
    }
  };

  return (
    <div className="crossword-grid-container">
      <p className="grid-hint">Click any cell to select, then type a letter (Backspace to clear)</p>
      <div
        ref={ref}
        className="crossword-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cellNumber = cellNumbers?.[rowIndex]?.[colIndex];
            const isBlack = cell === null;
            const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
            const key = `${rowIndex}-${colIndex}`;

            return (
              <div
                key={key}
                ref={(el) => { cellRefs.current[key] = el; }}
                className={`grid-cell ${isBlack ? 'black' : 'white'} ${isSelected ? 'selected' : ''} editable`}
                onClick={(e) => handleCellClick(e, rowIndex, colIndex)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                onBlur={handleBlur}
                tabIndex={0}
              >
                {cellNumber && <span className="cell-number">{cellNumber}</span>}
                {!isBlack && showLetters && <span className="cell-letter">{cell}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default CrosswordGrid;
