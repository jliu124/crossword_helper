/**
 * ClueEditor Component
 * Two sections: "Across" and "Down"
 * Lists each numbered word with an input field for the clue
 * Display names (words in parentheses) are editable
 * Clues are keyed by word (not number) so they follow words when renumbered
 */
function ClueEditor({ acrossWords, downWords, clues, displayNames, onClueChange, onDisplayNameChange }) {
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
          <div key={`across-${word}`} className="clue-row">
            <span className="clue-number">{number}.</span>
            <input
              type="text"
              className="clue-word-input"
              value={getDisplayName(word)}
              onChange={(e) => onDisplayNameChange?.(word, e.target.value)}
              title="Edit display name"
            />
            <input
              type="text"
              placeholder="Enter clue..."
              value={clues.across[word] || ''}
              onChange={(e) => onClueChange('across', word, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="clue-section">
        <h3>Down</h3>
        {downWords.map(({ number, word }) => (
          <div key={`down-${word}`} className="clue-row">
            <span className="clue-number">{number}.</span>
            <input
              type="text"
              className="clue-word-input"
              value={getDisplayName(word)}
              onChange={(e) => onDisplayNameChange?.(word, e.target.value)}
              title="Edit display name"
            />
            <input
              type="text"
              placeholder="Enter clue..."
              value={clues.down[word] || ''}
              onChange={(e) => onClueChange('down', word, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClueEditor;
