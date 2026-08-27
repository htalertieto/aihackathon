const LANGUAGES = [
  'Spanish', 'French', 'German', 'Polish', 'Ukrainian', 'Arabic', 'Mandarin Chinese',
  'Hindi', 'Portuguese', 'Russian', 'Vietnamese', 'Tagalog', 'Korean', 'Italian', 'English',
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
