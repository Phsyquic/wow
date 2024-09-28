import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RaidbotsApiService {

  constructor(private http: HttpClient) {  }

  getDroptimizer(report: any): Observable<Object> {
    const _url = `/simbot/${report}/data.json`;
    let header = new HttpHeaders()
    .set('Content-Type', 'application/json')

     return this.http.get(_url, {
      headers: header
     });
  }
    
}
