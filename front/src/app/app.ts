import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LanguageService } from './services/language.service';
import { SeoService } from './services/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('MDS Food');
  private router = inject(Router);
  private routerSub?: Subscription;
  private languageService = inject(LanguageService);
  private seo = inject(SeoService);

  ngOnInit() {
    this.seo.start();
    this.updateFavicon();
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.updateFavicon());
  }

  ngOnDestroy() {
    this.seo.stop();
    this.routerSub?.unsubscribe();
  }

  private updateFavicon() {
    this.setFavicon('/favicon.png');
  }

  private setFavicon(path: string) {
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = `${path}?v=6.0.0`;
    document.head.appendChild(link);

    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = 'image/png';
    shortcutLink.href = `${path}?v=6.0.0`;
    document.head.appendChild(shortcutLink);

    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = `${path}?v=6.0.0`;
    document.head.appendChild(appleLink);
  }
}
