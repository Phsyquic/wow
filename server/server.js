const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000; // Puerto donde correrá el servidor

// Credenciales de Blizzard
const CLIENT_ID = '0f764e18288745e2b7fca5527ba27b3a';
const CLIENT_SECRET = 'GPmZ7jGSI0xTGs9yk31XUr32Da4x1JHI';
const TOKEN_URL = 'https://oauth.battle.net/token';

// Carpeta donde se guardarán las respuestas cacheadas
const CACHE_DIR = path.join(__dirname, 'cache');

// Asegurar que la carpeta de caché existe
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

// Función para obtener un token de acceso
async function getAccessToken() {
    try {
        const response = await axios.post(
            TOKEN_URL,
            'grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error obteniendo el token:', error);
        return null;
    }
}

// Función para obtener datos desde la API (con caché)
async function fetchData(endpoint, cacheFile) {
    const cachePath = path.join(CACHE_DIR, cacheFile);

    // Si el archivo de caché existe, devolver los datos guardados
    if (fs.existsSync(cachePath)) {
        console.log(`📂 Cargando desde caché: ${cacheFile}`);
        return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }

    // Obtener token de acceso
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return { error: 'No se pudo obtener el token' };
    }

    // Llamar a la API de Blizzard
    try {
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Guardar la respuesta en caché
        fs.writeFileSync(cachePath, JSON.stringify(response.data, null, 2));
        console.log(`✅ Guardado en caché: ${cacheFile}`);

        return response.data;
    } catch (error) {
        console.error(`Error llamando a ${endpoint}:`, error);
        return { error: 'Error obteniendo datos de Blizzard' };
    }
}

// Endpoint para obtener media de un item
app.get('/item-media/:id', async (req, res) => {
    const itemId = req.params.id;
    const endpoint = `https://us.api.blizzard.com/data/wow/media/item/${itemId}?namespace=static-us&locale=en_US`;
    const cacheFile = `item-media-${itemId}.json`;

    const data = await fetchData(endpoint, cacheFile);
    res.json(data);
});

// Endpoint para obtener nombre de un item
app.get('/item-name/:id', async (req, res) => {
    const itemId = req.params.id;
    const endpoint = `https://us.api.blizzard.com/data/wow/item/${itemId}?namespace=static-us&locale=en_US`;
    const cacheFile = `item-name-${itemId}.json`;

    const data = await fetchData(endpoint, cacheFile);
    res.json(data);
});

// Endpoint para obtener journal encounter
app.get('/journal-encounter/:id', async (req, res) => {
    const encounterId = req.params.id;
    const endpoint = `https://us.api.blizzard.com/data/wow/journal-encounter/${encounterId}?namespace=static-us&locale=en_US`;
    const cacheFile = `journal-encounter-${encounterId}.json`;

    const data = await fetchData(endpoint, cacheFile);
    res.json(data);
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
