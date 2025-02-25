import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BlizzardApiService {
  private serverUrl = 'http://localhost:3000'; // Servidor Express

  constructor(private http: HttpClient) {}

  // Obtener la imagen de un ítem
  getItemMedia(itemId: number): Observable<any> {
    return this.http.get(`${this.serverUrl}/item-media/${itemId}`);
  }

  // Obtener el nombre de un ítem
  getItemName(itemId: number): Observable<any> {
    return this.http.get(`${this.serverUrl}/item-name/${itemId}`, { responseType: 'json' });
  }

  // Obtener datos de un journal encounter
  getJournalEncounter(journalEncounterId: number): Observable<any> {
    return this.http.get(`${this.serverUrl}/journal-encounter/${journalEncounterId}`);
  }
}


