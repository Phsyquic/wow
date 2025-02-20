import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BlizzardApiService {
  private clientId = '0f764e18288745e2b7fca5527ba27b3a';
  private clientSecret = 'GPmZ7jGSI0xTGs9yk31XUr32Da4x1JHI';
  private tokenUrl = 'https://oauth.battle.net/token';
  private apiBaseUrl = 'https://us.api.blizzard.com/data/wow/media/item/';
  private apiUrl = 'https://us.api.blizzard.com/data/wow/profession';
  private region = 'us';
  private namespace = 'static-us';
  private locale = 'en_US';
  private accessToken: string | null = null; // Para guardar el token en memoria
  private rateLimitRemaining = Number.MAX_SAFE_INTEGER;
  private rateLimitReset = 0;

  constructor(private http: HttpClient) { }

  // Método para obtener el token de acceso
  getToken(): Observable<any> {
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');

    const headers = new HttpHeaders({
      Authorization: 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post(this.tokenUrl, body.toString(), { headers });
  }

  // Método para obtener la imagen del item
  getItemMedia(itemId: number): Observable<any> {
    if (!this.accessToken) {
      return new Observable((observer) => {
        this.getToken().subscribe(
          (response) => {
            this.accessToken = response.access_token;
            this.fetchItemMedia(itemId).subscribe(
              (data) => observer.next(data),
              (error) => observer.error(error)
            );
          },
          (error) => observer.error(error)
        );
      });
    }
    return this.fetchItemMedia(itemId);
  }

  private fetchItemMedia(itemId: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`,
    });
  
    return this.http
      .get<any>(
        `${this.apiBaseUrl}${itemId}?namespace=${this.namespace}&locale=${this.locale}`,
        { headers, observe: 'response' }
      )
      .pipe(
        tap((response) => {
          // Extraer y actualizar los límites de peticiones
          this.rateLimitRemaining = Number(response.headers.get('X-RateLimit-Remaining')) || 0;
          this.rateLimitReset = Number(response.headers.get('X-RateLimit-Reset')) || 0;
          //console.log(this.rateLimitRemaining + ' || ' + this.rateLimitReset);
        }),
        map((response) => ({
          data: response.body,
          rateLimitRemaining: this.rateLimitRemaining,
          rateLimitReset: this.rateLimitReset,
        }))
      );
  }
  

  getItemName(itemId: number): Observable<string> {
    if (!this.accessToken) {
      return new Observable((observer) => {
        this.getToken().subscribe(
          (response) => {
            this.accessToken = response.access_token;
            this.fetchItemName(itemId).subscribe(
              (data) => observer.next(data),
              (error) => observer.error(error)
            );
          },
          (error) => observer.error(error)
        );
      });
    }
    return this.fetchItemName(itemId);
  }

  private fetchItemName(itemId: number): Observable<string> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`,
    });
  
    return this.http
      .get<any>(
        `https://us.api.blizzard.com/data/wow/item/${itemId}?namespace=${this.namespace}&locale=${this.locale}`,
        { headers, observe: 'response' }
      )
      .pipe(
        tap((response) => {
          // Extraer y actualizar los límites de peticiones
          this.rateLimitRemaining = Number(response.headers.get('X-RateLimit-Remaining')) || 0;
          this.rateLimitReset = Number(response.headers.get('X-RateLimit-Reset')) || 0;
          //console.log(this.rateLimitRemaining + ' || ' + this.rateLimitReset);
        }),
        map((response) => response.body.name) // Extrae solo el nombre del ítem
      );
  }
  

  // Nuevo método para obtener el journal encounter
  getJournalEncounter(journalEncounterId: number): Observable<any> {
    if (!this.accessToken) {
      return new Observable((observer) => {
        this.getToken().subscribe(
          (response) => {
            this.accessToken = response.access_token;
            this.fetchJournalEncounter(journalEncounterId).subscribe(
              (data) => observer.next(data),
              (error) => observer.error(error)
            );
          },
          (error) => observer.error(error)
        );
      });
    }
    return this.fetchJournalEncounter(journalEncounterId);
  }

  private fetchJournalEncounter(journalEncounterId: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`,
    });
  
    return this.http
      .get<any>(
        `https://us.api.blizzard.com/data/wow/journal-encounter/${journalEncounterId}?namespace=${this.namespace}&locale=${this.locale}`,
        { headers, observe: 'response' }
      )
      .pipe(
        tap((response) => {
          // Extraer y actualizar los límites de peticiones
          this.rateLimitRemaining = Number(response.headers.get('X-RateLimit-Remaining')) || 0;
          this.rateLimitReset = Number(response.headers.get('X-RateLimit-Reset')) || 0;
          //console.log(this.rateLimitRemaining + '||' + this.rateLimitReset);
        }),
        map((response) => ({
          data: response.body,
          rateLimitRemaining: this.rateLimitRemaining,
          rateLimitReset: this.rateLimitReset,
        }))
      );
  }
  
 
}

