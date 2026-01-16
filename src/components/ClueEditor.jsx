/**
 * ClueEditor Component
 * Two sections: "Across" and "Down"
 * Lists each numbered word with an input field for the clue
 */
function ClueEditor({ acrossWords, downWords, clues, displayNames, onClueChange }) {
  const handleClueChange = (direction, number, value) => {
    onClueChange(direction, number, value);
  };

  // Get display name (with spaces) or fall back to the word itself
  const getDisplayName = (word) => displayNames?.[word] || word;

  if (!acrossWords?.length && !downWords?.length) {
    return null;
  }

  return (
    <div className="clue-editor">
      <div className="clue-section">
        <h3>Across</h3>
        {acrossWords.map(({ number, word }) => (
          <div key={`across-${number}`} className="clue-row">
            <span className="clue-number">{number}.</span>
            <span className="clue-word">({getDisplayName(word)})</span>
            <input
              type="text"
              placeholder="Enter clue..."
              value={clues.across[number] || ''}
              onChange={(e) => handleClueChange('across', number, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="clue-section">
        <h3>Down</h3>
        {downWords.map(({ number, word }) => (
          <div key={`down-${number}`} className="clue-row">
            <span className="clue-number">{number}.</span>
            <span className="clue-word">({getDisplayName(word)})</span>
            <input
              type="text"
              placeholder="Enter clue..."
              value={clues.down[number] || ''}
              onChange={(e) => handleClueChange('down', number, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClueEditor;
