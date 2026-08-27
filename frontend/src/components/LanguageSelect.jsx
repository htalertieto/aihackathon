const LANGUAGES = [
  'English', 'Polish', 'Hindi', 'Spanish', 'French', 'German', 'Ukrainian', 'Arabic',
  'Mandarin Chinese', 'Portuguese', 'Russian', 'Vietnamese', 'Tagalog', 'Korean', 'Italian',
];

export default function LanguageSelect({ value, onChange }) {
  return (
    <label className="field">
      <span>Translate to</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </label>
  );
}
