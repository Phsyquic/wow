import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CacheBlizzardApiService {
  constructor(private http: HttpClient) {}

  // Obtener la imagen de un ítem
  getItemMedia(itemId: number): Observable<any> {
    const filePath = `assets/cache/item-media-${itemId}.json`;  // Ruta dentro de "assets"
    return this.http.get(filePath);
  }

  // Obtener el nombre de un ítem
  getItemName(itemId: number): Observable<any> {
    const filePath = `assets/cache/item-name-${itemId}.json`;  // Ruta dentro de "assets"
    return this.http.get(filePath);
  }

  // Obtener datos de un journal encounter
  getJournalEncounter(journalEncounterId: number): Observable<any> {
    const filePath = `assets/cache/journal-encounter-${journalEncounterId}.json`;  // Ruta dentro de "assets"
    return this.http.get(filePath);
  }
}

