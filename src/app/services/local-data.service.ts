import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocalDataService {

  jsonURL = 'assets/json/';

  constructor(private http: HttpClient) { }

  getDroptimizers(): Observable<any> {
    var _url = this.jsonURL + 'droptimizers.txt';
    return this.http.get(_url, { responseType: 'text' });
  }

  getBisListTxt(): Observable<any> {
    var _url = this.jsonURL + 'bisList.txt';
    return this.http.get(_url, { responseType: 'text' });
  }
}
