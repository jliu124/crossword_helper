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
  placements,
  clues,
  acrossWords,
  downWords,
  onLoad,
  disabled
}) {
  // Save to JSON file
  const handleSave = () => {
    const data = {
      gridWidth,
      gridHeight,
      words,
      placements,
      clues
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'crossword.json';
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

  // Export to PNG image
  const handleExportImage = async () => {
    if (!gridRef?.current) {
      alert('No crossword grid to export');
      return;
    }

    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const link = document.createElement('a');
      link.download = 'crossword.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Failed to export image: ' + err.message);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!gridRef?.current) {
      alert('No crossword grid to export');
      return;
    }

    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add title
      pdf.setFontSize(18);
      pdf.text('Crossword Puzzle', 105, 15, { align: 'center' });

      // Calculate image dimensions to fit on page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const maxWidth = pageWidth - 40; // 20mm margins
      const imgAspect = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / imgAspect;

      // If too tall, scale down
      if (imgHeight > 150) {
        imgHeight = 150;
        imgWidth = imgHeight * imgAspect;
      }

      // Center the image
      const imgX = (pageWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 25, imgWidth, imgHeight);

      // Add clues
      let yPos = 35 + imgHeight;

      // Across clues
      if (acrossWords?.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Across', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        for (const { number } of acrossWords) {
          const clue = clues.across[number] || '(no clue)';
          const text = `${number}. ${clue}`;

          // Check if we need a new page
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
        // Check if we need a new page
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(14);
        pdf.text('Down', 20, yPos);
        yPos += 7;

        pdf.setFontSize(10);
        for (const { number } of downWords) {
          const clue = clues.down[number] || '(no clue)';
          const text = `${number}. ${clue}`;

          // Check if we need a new page
          if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.text(text, 20, yPos);
          yPos += 5;
        }
      }

      pdf.save('crossword.pdf');
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
        <button onClick={handleExportImage} disabled={disabled || !grid}>
          Export PNG
        </button>
        <button onClick={handleExportPDF} disabled={disabled || !grid}>
          Export PDF
        </button>
      </div>
    </div>
  );
}

export default ExportPanel;
