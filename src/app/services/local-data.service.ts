import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocalDataService {

  jsonURL = 'assets/json/';
  private generatedBisListStorageKey = 'wowapp.generated.bisList.txt';
  private generatedBisSourceStorageKey = 'wowapp.generated.bisSources.json';

  constructor(private http: HttpClient) { }

  getDroptimizers(): Observable<any> {
    var _url = this.jsonURL + 'droptimizers.txt';
    return this.http.get(_url, { responseType: 'text' });
  }

  getBisListTxt(): Observable<any> {
    const generatedBisList = this.getGeneratedBisListTxt();
    return of(generatedBisList ?? '');
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
}
