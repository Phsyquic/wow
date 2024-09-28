import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiscordApiService {

  // Las credenciales deben ser manejadas de forma segura
  private access_token = '';
  private refresh_token = '';
  private token_type = '';

  constructor(private http: HttpClient) { }

  // Método para obtener mensajes del canal
  getMensajes(channelId: string): Observable<Object> {
    const _url = `https://discord.com/api/channels/${channelId}/messages`;

    // Asegúrate de que el token se haya obtenido correctamente
    if (!this.access_token) {
      throw new Error('Access token is missing. Call getAuthorize() first.');
    }

    return this.http.get(_url, {
      headers: {
        'Authorization': `${this.token_type} ${this.access_token}`,
      }
    });
  }

  // Método para obtener el token de autorización
  async getAuthorize(code: string): Promise<void> {
    const _url = 'https://discord.com/api/oauth2/token';

    const clientId = '1090348260201332746';
    const clientSecret = 'vn7bkNNwCvHO9UkegZllg748yyEJwi_Z';

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'http://localhost:4200/');  // Asegúrate de que esto coincida con tu configuración de Discord
    params.append('scope', 'identify');

    try {
      const response = await fetch(_url, {
        method: 'POST',
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
      });

      // Verifica si la respuesta fue exitosa
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const json = await response.json();

      this.access_token = json.access_token;
      this.refresh_token = json.refresh_token;
      this.token_type = json.token_type;
    } catch (error) {
      console.error('Error during authorization:', error);
      throw error;  // Puedes lanzar el error o manejarlo de otra manera
    }
  }
}
