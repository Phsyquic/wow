import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocalDataService {

  jsonURL = 'assets/json/';
  private generatedBisListStorageKey = 'wowapp.generated.bisList.txt';
  private generatedBisSourceStorageKey = 'wowapp.generated.bisSources.json';
  private generatedBisSlotStorageKey = 'wowapp.generated.bisSlots.json';
  private serverUrl = environment.cacheApiBase;

  constructor(private http: HttpClient) { }

  private canUseServerApi(): boolean {
    if (!this.serverUrl) {
      return false;
    }

    if (typeof window === 'undefined') {
      return true;
    }

    const currentHost = window.location.hostname.toLowerCase();
    const isLocalRuntime = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const target = this.serverUrl.toLowerCase();
    const isLocalServer = target.includes('localhost') || target.includes('127.0.0.1');

    return !(isLocalServer && !isLocalRuntime);
  }

  getDroptimizers(): Observable<any> {
    const staticUrl = this.jsonURL + 'droptimizers.txt';
    if (!this.canUseServerApi()) {
      return this.http.get(staticUrl, { responseType: 'text' });
    }

    return this.http.get(`${this.serverUrl}/droptimizers`, { responseType: 'text' }).pipe(
      catchError(() => this.http.get(staticUrl, { responseType: 'text' }))
    );
  }

  getBisListTxt(): Observable<any> {
    if (environment.production) {
      var staticUrl = this.jsonURL + 'bisList.txt';
      return this.http.get(staticUrl, { responseType: 'text' }).pipe(
        catchError(() => of(''))
      );
    }

    const generatedBisList = this.getGeneratedBisListTxt();
    if (generatedBisList) {
      return of(generatedBisList);
    }

    var _url = this.jsonURL + 'bisList.txt';
    return this.http.get(_url, { responseType: 'text' });
  }

  saveGeneratedBisListTxt(content: string): void {
    localStorage.setItem(this.generatedBisListStorageKey, content);
  }

  clearGeneratedBisListTxt(): void {
    localStorage.removeItem(this.generatedBisListStorageKey);
  }

  getGeneratedBisListTxt(): string | null {
    return localStorage.getItem(this.generatedBisListStorageKey);
  }

  saveGeneratedBisSources(map: Record<string, string[]>): void {
    localStorage.setItem(this.generatedBisSourceStorageKey, JSON.stringify(map));
  }

  clearGeneratedBisSources(): void {
    localStorage.removeItem(this.generatedBisSourceStorageKey);
  }

  getGeneratedBisSources(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem(this.generatedBisSourceStorageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed as Record<string, string[]>;
    } catch {
      return {};
    }
  }

  saveGeneratedBisSlots(map: Record<string, string[]>): void {
    localStorage.setItem(this.generatedBisSlotStorageKey, JSON.stringify(map));
  }

  clearGeneratedBisSlots(): void {
    localStorage.removeItem(this.generatedBisSlotStorageKey);
  }

  getGeneratedBisSlots(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem(this.generatedBisSlotStorageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed as Record<string, string[]>;
    } catch {
      return {};
    }
  }
}
