import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)', locale: 'pt-BR' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR';
const DEFAULT_LOCALE = 'pt-BR';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);

  currentLanguage = signal<LanguageCode>(DEFAULT_LANGUAGE);
  currentLocale = signal<string>(DEFAULT_LOCALE);

  constructor() {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    this.translate.addLangs([DEFAULT_LANGUAGE]);
    this.translate.setDefaultLang(DEFAULT_LANGUAGE);
    this.translate.use(DEFAULT_LANGUAGE);
    this.currentLanguage.set(DEFAULT_LANGUAGE);
    this.currentLocale.set(DEFAULT_LOCALE);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = DEFAULT_LANGUAGE;
      document.documentElement.dir = 'ltr';
    }

    // Remove any legacy preference from previous multilingual versions.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('pos_language');
    }
  }

  /**
   * MDS Food is single-language. Any request to change language is ignored
   * and Portuguese (Brazil) remains active.
   */
  setLanguage(_lang: LanguageCode | string): void {
    this.translate.use(DEFAULT_LANGUAGE);
    this.currentLanguage.set(DEFAULT_LANGUAGE);
    this.currentLocale.set(DEFAULT_LOCALE);
  }

  isRtl(): boolean {
    return false;
  }

  getLanguage(): LanguageCode {
    return DEFAULT_LANGUAGE;
  }

  getLocale(): string {
    return DEFAULT_LOCALE;
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  normalizeLanguageCode(_lang: string): LanguageCode {
    return DEFAULT_LANGUAGE;
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
  }

  formatCurrency(value: number, currencyCode: string): string {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol'
    }).format(value);
  }

  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(dateObj);
  }

  getAcceptLanguageHeader(): string {
    return 'pt-BR';
  }
}
