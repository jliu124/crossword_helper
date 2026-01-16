import { useState } from 'react';

/**
 * WordInput Component
 * Text area for entering words (one per line)
 * Validates words (letters only, no duplicates)
 */
function WordInput({ onGenerate, disabled }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const validateAndParse = () => {
    const lines = text.split('\n').map(line => line.trim().toUpperCase()).filter(line => line.length > 0);

    // Check for non-letter characters
    for (const word of lines) {
      if (!/^[A-Z]+$/.test(word)) {
        setError(`Invalid word "${word}": only letters A-Z are allowed`);
        return null;
      }
    }

    // Check for duplicates
    const uniqueWords = [...new Set(lines)];
    if (uniqueWords.length !== lines.length) {
      setError('Duplicate words detected. Please remove duplicates.');
      return null;
    }

    // Check minimum words
    if (uniqueWords.length < 2) {
      setError('Please enter at least 2 words');
      return null;
    }

    setError('');
    return uniqueWords;
  };

  const handleGenerate = () => {
    const words = validateAndParse();
    if (words) {
      onGenerate(words);
    }
  };

  return (
    <div className="word-input">
      <h3>Enter Words</h3>
      <p className="hint">Enter one word per line (letters only)</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="HELLO&#10;WORLD&#10;CROSSWORD&#10;PUZZLE"
        rows={10}
        disabled={disabled}
      />
      {error && <p className="error">{error}</p>}
      <button onClick={handleGenerate} disabled={disabled || text.trim().length === 0}>
        Generate Crossword
      </button>
    </div>
  );
}

export default WordInput;
