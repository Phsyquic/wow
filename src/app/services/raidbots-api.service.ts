import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RaidbotsApiService {

  constructor(private http: HttpClient) {  }

  getDroptimizer(report: any): Observable<Object> {
    const relativeUrl = `/simbot/${report}/data.json`;
    const absoluteUrl = `https://www.raidbots.com/simbot/${report}/data.json`;
    let header = new HttpHeaders()
    .set('Content-Type', 'application/json')

     return this.http.get(relativeUrl, {
      headers: header
     }).pipe(
      // Dev local uses proxy (relative URL). Public static deploy needs absolute Raidbots URL.
      catchError(() => this.http.get(absoluteUrl, { headers: header }))
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
    let header = new HttpHeaders()
    .set('Content-Type', 'application/json')

     return this.http.get(_url, {
      headers: header
     });
  }

  getItemList(): Observable<Object> {
    const _url = 'https://www.raidbots.com/static/data/live/encounter-items.json';
    let header = new HttpHeaders()
    .set('Content-Type', 'application/json')

     return this.http.get(_url, {
      headers: header
     });
  }
    
}
