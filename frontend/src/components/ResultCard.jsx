export default function ResultCard({ result }) {
  if (!result) return null;

  return (
    <div className="result-card">
      <h2>Here's what it means</h2>

      <section>
        <h3>Summary</h3>
        <p>{result.summary}</p>
      </section>

      {Array.isArray(result.keyTerms) && result.keyTerms.length > 0 && (
        <section>
          <h3>Key terms explained</h3>
          <ul>
            {result.keyTerms.map((kt, i) => (
              <li key={i}>
                <strong>{kt.term}</strong>: {kt.plainMeaning}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>Translated explanation</h3>
        <p>{result.translatedText}</p>
      </section>

      {Array.isArray(result.actionItems) && result.actionItems.length > 0 && (
        <section>
          <h3>What to do next</h3>
          <ul>
            {result.actionItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {result.disclaimer && <p className="disclaimer">{result.disclaimer}</p>}
    </div>
  );
}
