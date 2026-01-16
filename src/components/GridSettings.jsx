/**
 * GridSettings Component
 * Width and height inputs for the crossword grid
 */
function GridSettings({ width, height, onWidthChange, onHeightChange, disabled }) {
  const handleWidthChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 50) {
      onWidthChange(value);
    }
  };

  const handleHeightChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 50) {
      onHeightChange(value);
    }
  };

  return (
    <div className="grid-settings">
      <h3>Grid Size</h3>
      <div className="settings-row">
        <label>
          Width:
          <input
            type="number"
            value={width}
            onChange={handleWidthChange}
            min={5}
            max={50}
            disabled={disabled}
          />
        </label>
        <label>
          Height:
          <input
            type="number"
            value={height}
            onChange={handleHeightChange}
            min={5}
            max={50}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}

export default GridSettings;
