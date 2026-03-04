import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RaidbotsApiService {

  constructor(private http: HttpClient) {  }

  getDroptimizer(report: any): Observable<Object> {
    const reportId = String(report || '').replace(/^report\//, '');
    const runtimeBase = (typeof window !== 'undefined')
      ? String(localStorage.getItem('wow.cacheApiBase') || '')
      : '';
    const backendBase = String(runtimeBase || environment.cacheApiBase || '').replace(/\/$/, '');
    const proxyUrl = backendBase
      ? `${backendBase}/raidbots/simbot/${reportId}/data.json`
      : '';
    const relativeUrl = `/simbot/${report}/data.json`;
    const absoluteUrl = `https://www.raidbots.com/simbot/${report}/data.json`;

    if (proxyUrl) {
      return this.http.get(proxyUrl);
    }

    return this.http.get(relativeUrl).pipe(
      // Dev local uses proxy. Absolute URL is a best-effort fallback.
      catchError(() => this.http.get(absoluteUrl))
    );
  }

  getBisList(spec: any): Observable<any> {
    spec = spec.toLowerCase();
    var realSpec = spec.split(' ');
    const _url = `https://www.wowhead.com/guide/classes/${realSpec[1]}/${realSpec[0]}/bis-gear`;
    return this.http.get(_url, { responseType: 'text' });  // Receive raw text (HTML)
  }

  getInstances(): Observable<Object> {
    const _url = 'https://www.raidbots.com/static/data/live/instances.json';
     return this.http.get(_url);
  }

  getItemList(): Observable<Object> {
    const _url = 'https://www.raidbots.com/static/data/live/encounter-items.json';
     return this.http.get(_url);
  }
    
}
