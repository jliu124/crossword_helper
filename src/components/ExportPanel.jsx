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
          // Hide regular letters and pencil marks for empty puzzle
          clonedDoc.querySelectorAll('.cell-letter')
            .forEach(el => (el.style.display = 'none'));
          clonedDoc.querySelectorAll('.pencil-marks')
            .forEach(el => (el.style.display = 'none'));
        }
      });

      const filledCanvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        onclone: (clonedDoc) => {
          // Show regular letters and hide pencil marks for answer key
          clonedDoc.querySelectorAll('.cell-letter')
            .forEach(el => (el.style.display = 'block'));
          clonedDoc.querySelectorAll('.pencil-marks')
            .forEach(el => (el.style.display = 'none'));
        }
      });

      const emptyImgData = emptyCanvas.toDataURL('image/png');
      const filledImgData = filledCanvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - 20; // Smaller margins for larger grid
      const maxHeight = pageHeight - 40; // Leave room for title
      const aspect = emptyCanvas.width / emptyCanvas.height;

      let imgWidth = maxWidth;
      let imgHeight = imgWidth / aspect;

      // Scale down if too tall
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspect;
      }

      const imgX = (pageWidth - imgWidth) / 2;

      const PAGE_MARGIN_X = 15;
      const PAGE_MARGIN_Y = 20;
      const PAGE_BOTTOM = 285;
      const COLUMN_GAP = 5;
      const usableWidth = pageWidth - PAGE_MARGIN_X * 2;
      const columnWidth = (usableWidth - COLUMN_GAP * 2) / 3; // Explicitly 3 columns

      const fontSize = 9;
      const titleFontSize = 11;
      const lineHeight = 4;
      const titleLineHeight = 5;

      // Filter out duplicate words, keeping the first occurrence
      const uniqueAcross = acrossWords?.filter((item, index, self) =>
        index === self.findIndex(w => w.word === item.word)
      ) || [];

      const uniqueDown = downWords?.filter((item, index, self) =>
        index === self.findIndex(w => w.word === item.word)
      ) || [];

      // Build clue items for a section
      const buildClueItems = (words, title, renderText) => {
        const items = [];
        if (words.length) {
          items.push({ type: 'title', text: title });
          words.forEach(item => items.push({ type: 'clue', text: renderText(item) }));
        }
        return items;
      };

      // Build combined clue items for both across and down
      const buildAllClues = (acrossRenderText, downRenderText) => {
        return [
          ...buildClueItems(uniqueAcross, 'Across', acrossRenderText),
          ...buildClueItems(uniqueDown, 'Down', downRenderText)
        ];
      };

      // Get height of an item
      const getItemHeight = (item) => {
        const isTitle = item.type === 'title';
        pdf.setFontSize(isTitle ? titleFontSize : fontSize);
        const lines = pdf.splitTextToSize(item.text, columnWidth - 4);
        return lines.length * (isTitle ? titleLineHeight : lineHeight) + (isTitle ? 3 : 1);
      };

      // Calculate if all clues fit in 3 columns starting at startY
      const calculateAllCluesHeight = (allItems, startY) => {
        const columnHeights = [0, 0, 0];
        const maxColumnHeight = PAGE_BOTTOM - startY;
        let currentColumn = 0;
        let currentY = 0;

        for (const item of allItems) {
          const itemHeight = getItemHeight(item);

          if (currentY + itemHeight > maxColumnHeight) {
            // Move to next column
            columnHeights[currentColumn] = currentY;
            currentColumn++;
            if (currentColumn >= 3) {
              return { fits: false };
            }
            currentY = 0;
          }
          currentY += itemHeight;
        }
        columnHeights[currentColumn] = currentY;

        return { fits: true, maxHeight: Math.max(...columnHeights) };
      };

      // Render all clues in 3 columns - guarantees all items are rendered
      const renderAllClues = (allItems, startY) => {
        let currentColumn = 0;
        let currentY = startY;
        let pageStartY = startY;

        // Calculate x positions for 3 columns
        const colX = [
          PAGE_MARGIN_X,
          PAGE_MARGIN_X + columnWidth + COLUMN_GAP,
          PAGE_MARGIN_X + (columnWidth + COLUMN_GAP) * 2
        ];

        for (let i = 0; i < allItems.length; i++) {
          const item = allItems[i];
          const isTitle = item.type === 'title';
          const isDownTitle = isTitle && item.text === 'Down';
          const itemHeight = getItemHeight(item);

          // Add extra gap before "Down" section
          const extraGap = isDownTitle ? 6 : 0;

          // Check if need to move to next column or page
          if (currentY + extraGap + itemHeight > PAGE_BOTTOM && currentY > pageStartY) {
            // Only move to next column if we've rendered something in current column
            currentColumn++;
            if (currentColumn >= 3) {
              // All 3 columns used, add new page
              pdf.addPage();
              currentColumn = 0;
              pageStartY = PAGE_MARGIN_Y;
            }
            currentY = pageStartY;
          }

          // Add extra gap before "Down" section
          if (isDownTitle) {
            currentY += extraGap;
          }

          // Render the item
          pdf.setFontSize(isTitle ? titleFontSize : fontSize);
          pdf.setFont(undefined, isTitle ? 'bold' : 'normal');
          const lines = pdf.splitTextToSize(item.text, columnWidth - 4);
          pdf.text(lines, colX[currentColumn], currentY);
          currentY += itemHeight;
        }
      };

      // Check if all clues fit on same page as grid
      const gridEndY = 35 + imgHeight;
      const acrossRenderText = ({ number, word }) => `${number}. ${clues.across[word] || ''}`;
      const downRenderText = ({ number, word }) => `${number}. ${clues.down[word] || ''}`;

      const acrossClues = buildClueItems(uniqueAcross, 'Across', acrossRenderText);
      const downClues = buildClueItems(uniqueDown, 'Down', downRenderText);
      const allClues = [...acrossClues, ...downClues];
      const cluesResult = calculateAllCluesHeight(allClues, gridEndY);

      // Puzzle page
      pdf.setFontSize(18);
      pdf.text(filename, pageWidth / 2, 15, { align: 'center' });
      pdf.addImage(emptyImgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      if (cluesResult.fits) {
        // Render all clues on same page as grid
        renderAllClues(allClues, gridEndY);
      } else {
        // Render Across and Down on separate pages
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Across', pageWidth / 2, 15, { align: 'center' });
        renderAllClues(acrossClues.slice(1), PAGE_MARGIN_Y + 5); // Skip title since it's in header

        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Down', pageWidth / 2, 15, { align: 'center' });
        renderAllClues(downClues.slice(1), PAGE_MARGIN_Y + 5); // Skip title since it's in header
      }

      // Answer Key page
      pdf.addPage();
      pdf.setFontSize(18);
      pdf.text(`${filename} - Answer Key`, pageWidth / 2, 15, { align: 'center' });
      pdf.addImage(filledImgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      const answerAcrossRenderText = ({ number, word }) => `${number}. ${getDisplayName(word)}`;
      const answerDownRenderText = ({ number, word }) => `${number}. ${getDisplayName(word)}`;

      const answerAcrossClues = buildClueItems(uniqueAcross, 'Across', answerAcrossRenderText);
      const answerDownClues = buildClueItems(uniqueDown, 'Down', answerDownRenderText);
      const answerAllClues = [...answerAcrossClues, ...answerDownClues];
      const answerCluesResult = calculateAllCluesHeight(answerAllClues, gridEndY);

      if (answerCluesResult.fits) {
        renderAllClues(answerAllClues, gridEndY);
      } else {
        // Render Across and Down answers on separate pages
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Across Answers', pageWidth / 2, 15, { align: 'center' });
        renderAllClues(answerAcrossClues.slice(1), PAGE_MARGIN_Y + 5);

        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Down Answers', pageWidth / 2, 15, { align: 'center' });
        renderAllClues(answerDownClues.slice(1), PAGE_MARGIN_Y + 5);
      }

      // Open preview in new tab instead of direct download
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
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
