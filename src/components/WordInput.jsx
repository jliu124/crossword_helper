import { useState, useMemo } from 'react';

/**
 * WordInput Component
 * Text area for entering words (one per line)
 * Validates words (letters only, no duplicates)
 */
function WordInput({ onGenerate, disabled }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  // Check for duplicates in real-time as user types
  const duplicates = useMemo(() => {
    const rawLines = text.split('\n')
      .map(line => line.trim().toUpperCase().replace(/\s+/g, ''))
      .filter(line => line.length > 0);

    const seen = new Set();
    const dupes = new Set();

    for (const word of rawLines) {
      if (seen.has(word)) {
        dupes.add(word);
      }
      seen.add(word);
    }

    return Array.from(dupes);
  }, [text]);

  const validateAndParse = () => {
    const rawLines = text.split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(line => line.length > 0);

    const processedWords = [];
    const displayNames = {}; // Maps processed word -> original with spaces

    for (const original of rawLines) {
      const processed = original.replace(/\s+/g, ''); // Remove spaces for grid

      // Check for non-letter characters (after removing spaces)
      if (!/^[A-Z]+$/.test(processed)) {
        setError(`Invalid word "${original}": only letters A-Z are allowed`);
        return null;
      }

      processedWords.push(processed);
      displayNames[processed] = original; // Keep original for display
    }

    // Check for duplicates
    const uniqueWords = [...new Set(processedWords)];
    if (uniqueWords.length !== processedWords.length) {
      setError('Duplicate words detected. Please remove duplicates.');
      return null;
    }

    // Check minimum words
    if (uniqueWords.length < 2) {
      setError('Please enter at least 2 words');
      return null;
    }

    setError('');
    return { words: uniqueWords, displayNames };
  };

  const handleGenerate = () => {
    const result = validateAndParse();
    if (result) {
      onGenerate(result.words, result.displayNames);
    }
  };

  return (
    <div className="word-input">
      <h3>Enter Words</h3>
      <p className="hint">Enter one word per line (spaces are ignored)</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="HELLO&#10;WORLD&#10;CROSSWORD&#10;PUZZLE"
        rows={10}
        disabled={disabled}
      />
      {duplicates.length > 0 && (
        <p className="error">
          Duplicate word{duplicates.length > 1 ? 's' : ''} detected: {duplicates.join(', ')}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button onClick={handleGenerate} disabled={disabled || text.trim().length === 0}>
        Generate Crossword
      </button>
    </div>
  );
}

export default WordInput;
