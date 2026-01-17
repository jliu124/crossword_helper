import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * ExportPanel Component
 */
function ExportPanel({
  gridRef,
  grid,
  gridWidth,
  gridHeight,
  displayNames,
  clues,
  acrossWords,
  downWords,
  onLoad,
  disabled
}) {
  const getDisplayName = (word) => displayNames?.[word] || word;

  // === HELPER: Rebuild placements from the grid ===
  // Note: Grid cells are plain strings (e.g., "A") or null for black squares
  const getPlacementsFromGrid = () => {
    const placementsList = [];
    const height = grid.length;
    const width = grid[0].length;

    // Across
    for (let r = 0; r < height; r++) {
      let c = 0;
      while (c < width) {
        const cell = grid[r][c];
        if (cell !== null) {
          const startCol = c;
          let word = '';
          while (c < width && grid[r][c] !== null) {
            word += grid[r][c];
            c++;
          }
          if (word.length > 1) {
            placementsList.push({
              word,
              row: r,
              col: startCol,
              isHorizontal: true
            });
          }
        } else {
          c++;
        }
      }
    }

    // Down
    for (let c = 0; c < width; c++) {
      let r = 0;
      while (r < height) {
        const cell = grid[r][c];
        if (cell !== null) {
          const startRow = r;
          let word = '';
          while (r < height && grid[r][c] !== null) {
            word += grid[r][c];
            r++;
          }
          if (word.length > 1) {
            placementsList.push({
              word,
              row: startRow,
              col: c,
              isHorizontal: false
            });
          }
        } else {
          r++;
        }
      }
    }

    return placementsList;
  };

  // === SAVE JSON ===
  const handleSave = () => {
    const filename = prompt('Enter filename:', 'crossword');
    if (!filename) return;

    const allWords = new Set();
    acrossWords?.forEach(({ word }) => allWords.add(word));
    downWords?.forEach(({ word }) => allWords.add(word));

    const updatedPlacements = getPlacementsFromGrid();

    // Update displayNames: just use the word itself
    const updatedDisplayNames = { ...displayNames };
    allWords.forEach((word) => {
      if (!updatedDisplayNames[word]) {
        updatedDisplayNames[word] = word;
      }
    });

    // Update clues: add empty strings for new words if missing
    const updatedClues = {
      across: { ...clues.across },
      down: { ...clues.down }
    };
    acrossWords?.forEach(({ word }) => {
      if (!updatedClues.across[word]) updatedClues.across[word] = '';
    });
    downWords?.forEach(({ word }) => {
      if (!updatedClues.down[word]) updatedClues.down[word] = '';
    });

    const data = {
      gridWidth,
      gridHeight,
      words: Array.from(allWords),
      displayNames: updatedDisplayNames,
      placements: updatedPlacements,
      clues: updatedClues
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // === LOAD JSON ===
  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onLoad(data);
        } catch (err) {
          alert('Failed to load file: Invalid JSON format');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  // === EXPORT WORDS TEXT FILE ===
  const handleExportWords = () => {
    const allWords = new Set();
    acrossWords?.forEach(({ word }) => allWords.add(getDisplayName(word)));
    downWords?.forEach(({ word }) => allWords.add(getDisplayName(word)));

    if (allWords.size === 0) {
      alert('No words to export');
      return;
    }

    const filename = prompt('Enter filename:', 'wordlist');
    if (!filename) return;

    const text = Array.from(allWords).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // === EXPORT PDF ===
  const handleExportPDF = async () => {
    if (!gridRef?.current) {
      alert('No crossword grid to export');
      return;
    }

    const filename = prompt('Enter filename:', 'crossword');
    if (!filename) return;

    try {
      const emptyCanvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('.cell-letter')
            .forEach(el => (el.style.display = 'none'));
        }
      });

      const filledCanvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const emptyImgData = emptyCanvas.toDataURL('image/png');
      const filledImgData = filledCanvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      const maxWidth = pageWidth - 40;
      const aspect = emptyCanvas.width / emptyCanvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / aspect;
      if (imgHeight > 120) {
        imgHeight = 120;
        imgWidth = imgHeight * aspect;
      }
      const imgX = (pageWidth - imgWidth) / 2;

      const PAGE_MARGIN_X = 20;
      const PAGE_MARGIN_Y = 20;
      const PAGE_BOTTOM = 280;
      const COLUMN_COUNT = 3;
      const COLUMN_GAP = 6;
      const usableWidth = pageWidth - PAGE_MARGIN_X * 2;
      const columnWidth = (usableWidth - COLUMN_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

      const renderClueSection = ({ title, items, startY, renderText }) => {
        let column = 0;
        let x = PAGE_MARGIN_X;
        let y = startY;

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(14);
        pdf.text(title, x, y);
        pdf.setFont(undefined, 'normal');
        y += 7;
        pdf.setFontSize(10);

        for (const item of items) {
          const text = renderText(item);
          const lines = pdf.splitTextToSize(text, columnWidth);
          const blockHeight = lines.length * 5;

          if (y + blockHeight > PAGE_BOTTOM) {
            column++;
            if (column >= COLUMN_COUNT) {
              pdf.addPage();
              column = 0;
            }
            x = PAGE_MARGIN_X + column * (columnWidth + COLUMN_GAP);
            y = PAGE_MARGIN_Y;
          }

          pdf.text(lines, x, y);
          y += blockHeight;
        }

        return y;
      };

      // Puzzle page
      pdf.setFontSize(18);
      pdf.text('Crossword Puzzle', pageWidth / 2, 15, { align: 'center' });
      pdf.addImage(emptyImgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      let yPos = 35 + imgHeight;

      if (acrossWords?.length) {
        yPos = renderClueSection({
          title: 'Across',
          items: acrossWords,
          startY: yPos,
          renderText: ({ number, word }) => `${number}. ${clues.across[word] || ''}`
        });
      }

      yPos += 6;

      if (downWords?.length) {
        yPos = renderClueSection({
          title: 'Down',
          items: downWords,
          startY: yPos,
          renderText: ({ number, word }) => `${number}. ${clues.down[word] || ''}`
        });
      }

      // Answer Key page
      pdf.addPage();
      pdf.setFontSize(18);
      pdf.text('Answer Key', pageWidth / 2, 15, { align: 'center' });
      pdf.addImage(filledImgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      yPos = 35 + imgHeight;

      if (acrossWords?.length) {
        yPos = renderClueSection({
          title: 'Across',
          items: acrossWords,
          startY: yPos,
          renderText: ({ number, word }) => `${number}. ${getDisplayName(word)}`
        });
      }

      yPos += 6;

      if (downWords?.length) {
        yPos = renderClueSection({
          title: 'Down',
          items: downWords,
          startY: yPos,
          renderText: ({ number, word }) => `${number}. ${getDisplayName(word)}`
        });
      }

      pdf.save(`${filename}.pdf`);
    } catch (err) {
      alert('Failed to export PDF: ' + err.message);
    }
  };

  return (
    <div className="export-panel">
      <h3>Save / Export</h3>
      <div className="export-buttons">
        <button onClick={handleSave} disabled={disabled || !grid}>
          Save to JSON
        </button>
        <button onClick={handleLoad}>
          Load from JSON
        </button>
        <button onClick={handleExportPDF} disabled={disabled || !grid}>
          Export PDF
        </button>
        <button onClick={handleExportWords} disabled={disabled || !grid}>
          Export Words
        </button>
      </div>
    </div>
  );
}

export default ExportPanel;
