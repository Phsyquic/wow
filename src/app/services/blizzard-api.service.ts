import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CacheBlizzardApiService } from './cache-blizzard-api.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BlizzardApiService {
  private serverUrl = environment.cacheApiBase;

  constructor(
    private http: HttpClient,
    private cacheBlizzardApiService: CacheBlizzardApiService
  ) {}

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

    // Avoid localhost backend calls when app is running on remote hosts (e.g. GitHub Pages).
    return !(isLocalServer && !isLocalRuntime);
  }

  // Obtener la imagen de un ítem
  getItemMedia(itemId: number): Observable<any> {
    if (!this.canUseServerApi()) {
      return this.cacheBlizzardApiService.getItemMedia(itemId);
    }
    return this.http.get(`${this.serverUrl}/item-media/${itemId}`).pipe(
      catchError(() => this.cacheBlizzardApiService.getItemMedia(itemId))
    );
  }

  // Obtener el nombre de un ítem
  getItemName(itemId: number): Observable<any> {
    if (!this.canUseServerApi()) {
      return this.cacheBlizzardApiService.getItemName(itemId);
    }
    return this.http.get(`${this.serverUrl}/item-name/${itemId}`, { responseType: 'json' }).pipe(
      catchError(() => this.cacheBlizzardApiService.getItemName(itemId))
    );
  }

  // Obtener datos de un journal encounter
  getJournalEncounter(journalEncounterId: number): Observable<any> {
    if (!this.canUseServerApi()) {
      return this.cacheBlizzardApiService.getJournalEncounter(journalEncounterId);
    }
    return this.http.get(`${this.serverUrl}/journal-encounter/${journalEncounterId}`).pipe(
      catchError(() => this.cacheBlizzardApiService.getJournalEncounter(journalEncounterId))
    );
  }
}



