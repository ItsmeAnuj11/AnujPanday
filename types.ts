
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export enum AppTab {
  TRANSLATE = 'translate',
  HISTORY = 'history'
}
