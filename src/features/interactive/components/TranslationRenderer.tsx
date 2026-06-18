import { SoundOutlined } from "@ant-design/icons";
import type { TranslationData } from "../types";

interface Props {
  data: TranslationData;
}

export function TranslationRenderer({ data }: Props) {
  if (!data || !Array.isArray(data.entries)) {
    return <div className="kui-interactive-error">Translation: invalid data</div>;
  }
  const speak = (text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="kui-interactive-translation">
      <div className="kui-interactive-translation-header">
        <span className="kui-interactive-translation-lang">{data.sourceLang}</span>
        <span className="kui-interactive-translation-arrow">→</span>
        <span className="kui-interactive-translation-lang">{data.targetLang}</span>
      </div>
      <div className="kui-interactive-translation-list">
        {data.entries.map((entry, i) => (
          <div key={i} className="kui-interactive-translation-entry">
            <div className="kui-interactive-translation-row">
              <span className="kui-interactive-translation-source">{entry.source}</span>
              <button
                className="kui-interactive-translation-speak"
                onClick={() => speak(entry.source, data.sourceLang)}
                title="朗读"
              >
                <SoundOutlined />
              </button>
              {entry.phonetic && (
                <span className="kui-interactive-translation-phonetic">/{entry.phonetic}/</span>
              )}
            </div>
            <div className="kui-interactive-translation-row">
              <span className="kui-interactive-translation-target">{entry.target}</span>
              <button
                className="kui-interactive-translation-speak"
                onClick={() => speak(entry.target, data.targetLang)}
                title="朗读"
              >
                <SoundOutlined />
              </button>
            </div>
            {entry.note && (
              <div className="kui-interactive-translation-note">{entry.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
