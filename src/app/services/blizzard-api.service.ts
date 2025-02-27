import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CacheBlizzardApiService } from './cache-blizzard-api.service';

@Injectable({
  providedIn: 'root',
})
export class BlizzardApiService {
  private serverUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private cacheBlizzardApiService: CacheBlizzardApiService
  ) {}

  // Obtener la imagen de un ítem
  getItemMedia(itemId: number): Observable<any> {
    //return this.http.get(`${this.serverUrl}/item-media/${itemId}`);
    return this.cacheBlizzardApiService.getItemMedia(itemId);
  }

  // Obtener el nombre de un ítem
  getItemName(itemId: number): Observable<any> {
    //return this.http.get(`${this.serverUrl}/item-name/${itemId}`, { responseType: 'json' });
    return this.cacheBlizzardApiService.getItemName(itemId);
  }

  // Obtener datos de un journal encounter
  getJournalEncounter(journalEncounterId: number): Observable<any> {
    //return this.http.get(`${this.serverUrl}/journal-encounter/${journalEncounterId}`);
    return this.cacheBlizzardApiService.getJournalEncounter(journalEncounterId);
  }
}



