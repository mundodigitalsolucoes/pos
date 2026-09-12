import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)', locale: 'pt-BR' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR';
const DEFAULT_LOCALE = 'pt-BR';

const MDS_PT_BR_PATCH = {
  MY_SHIFT: {
    TITLE: 'Meu turno',
    SUBTITLE: 'Registre sua jornada de trabalho',
    AUDIT_HINT: 'Acompanhe aqui sua entrada, pausas, saída e histórico de turnos.',
    QR_HINT: 'Escaneie o QR Code do estabelecimento para registrar o ponto.',
    LOCATION_HINT: 'A localização pode ser verificada conforme a configuração do restaurante.',
    VENUE_VERIFIED: 'Estabelecimento verificado.',
    SCANNER_TITLE: 'Escanear QR Code do estabelecimento',
    SCANNER_HELP: 'Aponte a câmera para o QR Code de ponto do estabelecimento.',
    SCANNER_STARTING: 'Abrindo câmera...',
    SCAN_VENUE_QR: 'Escanear QR Code',
    SCAN_RETRY: 'Tentar novamente',
    ERR_QR: 'Escaneie o QR Code do estabelecimento para continuar.',
    OVERTIME_TITLE: 'Turno acima do período esperado',
    OVERTIME_BODY: 'Este turno ultrapassou {{hours}} horas. Confira antes de encerrar.',
    LOADING: 'Carregando turno...',
    STATUS_ON: 'Turno em andamento',
    STATUS_BREAK: 'Em pausa',
    STATUS_OFF: 'Turno não iniciado',
    STARTED: 'Iniciado em',
    NET_ELAPSED: 'Tempo trabalhado',
    START_SHIFT: 'Iniciar turno',
    END_SHIFT: 'Encerrar turno',
    START_BREAK: 'Iniciar pausa',
    END_BREAK: 'Encerrar pausa',
    WORKING: 'Processando...',
    HISTORY_TITLE: 'Histórico de turnos',
    NO_HISTORY: 'Nenhum turno registrado ainda.',
    COL_START: 'Entrada',
    COL_END: 'Saída',
    COL_DURATION: 'Duração'
  }
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  currentLanguage = signal<LanguageCode>(DEFAULT_LANGUAGE);
  currentLocale = signal<string>(DEFAULT_LOCALE);

  constructor() { this.initializeLanguage(); }

  private initializeLanguage(): void {
    this.translate.addLangs([DEFAULT_LANGUAGE]);
    this.translate.setDefaultLang(DEFAULT_LANGUAGE);
    this.translate.use(DEFAULT_LANGUAGE).subscribe(() => {
      // Keep critical MDS Food staff labels available even when the legacy locale file is incomplete.
      this.translate.setTranslation(DEFAULT_LANGUAGE, MDS_PT_BR_PATCH, true);
    });
    this.currentLanguage.set(DEFAULT_LANGUAGE);
    this.currentLocale.set(DEFAULT_LOCALE);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = DEFAULT_LANGUAGE;
      document.documentElement.dir = 'ltr';
    }
    if (typeof localStorage !== 'undefined') localStorage.removeItem('pos_language');
  }

  setLanguage(_lang: LanguageCode | string): void {
    this.translate.use(DEFAULT_LANGUAGE).subscribe(() => this.translate.setTranslation(DEFAULT_LANGUAGE, MDS_PT_BR_PATCH, true));
    this.currentLanguage.set(DEFAULT_LANGUAGE);
    this.currentLocale.set(DEFAULT_LOCALE);
  }

  isRtl(): boolean { return false; }
  getLanguage(): LanguageCode { return DEFAULT_LANGUAGE; }
  getLocale(): string { return DEFAULT_LOCALE; }
  getSupportedLanguages() { return SUPPORTED_LANGUAGES; }
  normalizeLanguageCode(_lang: string): LanguageCode { return DEFAULT_LANGUAGE; }
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string { return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value); }
  formatCurrency(value: number, currencyCode: string): string { return new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: currencyCode, currencyDisplay: 'symbol' }).format(value); }
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string { const dateObj = typeof date === 'string' ? new Date(date) : date; return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(dateObj); }
  getAcceptLanguageHeader(): string { return 'pt-BR'; }
}
