import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * ExportPanel Component
 * Save/load/export buttons for the crossword
 */
function ExportPanel({
  gridRef,
  grid,
  gridWidth,
  gridHeight,
  words,
  displayNames,
  placements,
  clues,
  acrossWords,
  downWords,
  onLoad,
  disabled
}) {
  // Get display name (with spaces) or fall back to the word itself
  const getDisplayName = (word) => displayNames?.[word] || word;

  // Save to JSON file
  const handleSave = () => {
    const filename = prompt('Enter filename:', 'crossword');
    if (!filename) return; // User cancelled

    const data = {
      gridWidth,
      gridHeight,
      words,
      displayNames,
      placements,
      clues
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

  // Load from JSON file
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

  // Export word list as text file
  const handleExportWords = () => {
    // Collect all words from across and down
    const allWords = new Set();

    acrossWords?.forEach(({ word }) => {
      allWords.add(getDisplayName(word));
    });

    downWords?.forEach(({ word }) => {
      allWords.add(getDisplayName(word));
    });

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

  // Export to PDF
  const handleExportPDF = async () => {
    if (!gridRef?.current) {
      alert('No crossword grid to export');
      return;
    }

    const filename = prompt('Enter filename:', 'crossword');
    if (!filename) return; // User cancelled

    try {
      // Capture empty grid (without letters) for puzzle page
      const emptyCanvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        onclone: (clonedDoc) => {
          const letters = clonedDoc.querySelectorAll('.cell-letter');
          letters.forEach(el => el.style.display = 'none');
        }
      });

      // Capture filled grid (with letters) for answer key
      const filledCanvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const emptyImgData = emptyCanvas.toDataURL('image/png');
      const filledImgData = filledCanvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Calculate image dimensions
      const maxWidth = pageWidth - 40;
      const imgAspect = emptyCanvas.width / emptyCanvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / imgAspect;
      if (imgHeight > 120) {
        imgHeight = 120;
        imgWidth = imgHeight * imgAspect;
      }
      const imgX = (pageWidth - imgWidth) / 2;

      // === PAGE 1+: PUZZLE (empty grid + clues) ===
      pdf.setFontSize(18);
      pdf.text('Crossword Puzzle', 105, 15, { align: 'center' });
      pdf.addImage(emptyImgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      let yPos = 35 + imgHeight;

      // Across clues
      if (acrossWords?.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Across', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        for (const { number, word } of acrossWords) {
          const clue = clues.across[word] || '(no clue)';
          const text = `${number}. ${clue}`;
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(text, 20, yPos);
          yPos += 5;
        }
      }

      yPos += 5;

      // Down clues
      if (downWords?.length > 0) {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.setFontSize(14);
        pdf.text('Down', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        for (const { number, word } of downWords) {
          const clue = clues.down[word] || '(no clue)';
          const text = `${number}. ${clue}`;
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(text, 20, yPos);
          yPos += 5;
        }
      }

      // === ANSWER KEY PAGE: filled grid + answers ===
      pdf.addPage();
      pdf.setFontSize(18);
      pdf.text('Answer Key', 105, 15, { align: 'center' });
      pdf.addImage(filledImgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      yPos = 35 + imgHeight;

      // Across answers
      if (acrossWords?.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Across', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        for (const { number, word } of acrossWords) {
          const text = `${number}. ${getDisplayName(word)}`;
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(text, 20, yPos);
          yPos += 5;
        }
      }

      yPos += 5;

      // Down answers
      if (downWords?.length > 0) {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.setFontSize(14);
        pdf.text('Down', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        for (const { number, word } of downWords) {
          const text = `${number}. ${getDisplayName(word)}`;
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(text, 20, yPos);
          yPos += 5;
        }
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
