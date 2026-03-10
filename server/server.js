const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const PORT = Number(process.env.PORT) || 3000; // Render injects PORT in production
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Credenciales de Blizzard
const CLIENT_ID = '0f764e18288745e2b7fca5527ba27b3a';
const CLIENT_SECRET = 'GPmZ7jGSI0xTGs9yk31XUr32Da4x1JHI';
const TOKEN_URL = 'https://oauth.battle.net/token';

// Carpeta donde se guardarán las respuestas cacheadas
const CACHE_DIR = path.join(__dirname, 'cache');
const ASSETS_JSON_DIR = path.join(__dirname, '..', 'src', 'assets', 'json');
const BIS_LIST_FILE = path.join(ASSETS_JSON_DIR, 'bisList.txt');
const BIS_SOURCES_FILE = path.join(ASSETS_JSON_DIR, 'bisSources.json');
const DROPTIMIZERS_FILE = path.join(ASSETS_JSON_DIR, 'droptimizers.txt');

// Asegurar que la carpeta de caché existe
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}
if (!fs.existsSync(ASSETS_JSON_DIR)) {
    fs.mkdirSync(ASSETS_JSON_DIR, { recursive: true });
}
if (!fs.existsSync(DROPTIMIZERS_FILE)) {
    fs.writeFileSync(DROPTIMIZERS_FILE, '', 'utf8');
}

let droptimizerWriteQueue = Promise.resolve();

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

function getItemCachePaths(itemId) {
    return {
        media: path.join(CACHE_DIR, `item-media-${itemId}.json`),
        name: path.join(CACHE_DIR, `item-name-${itemId}.json`),
    };
}

function readDroptimizerUrls() {
    if (!fs.existsSync(DROPTIMIZERS_FILE)) {
        return [];
    }

    return fs.readFileSync(DROPTIMIZERS_FILE, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function writeDroptimizerUrls(urls) {
    const normalized = [...new Set(urls.map((line) => String(line || '').trim()).filter(Boolean))];
    const content = normalized.length > 0 ? `${normalized.join('\n')}\n` : '';
    fs.writeFileSync(DROPTIMIZERS_FILE, content, 'utf8');
}

function extractRaidbotsReportId(rawUrl) {
    let parsed;
    try {
        parsed = new URL(String(rawUrl || '').trim());
    } catch {
        return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'raidbots.com' && hostname !== 'www.raidbots.com') {
        return null;
    }

    const match = parsed.pathname.match(/^\/simbot\/(?:report\/)?([A-Za-z0-9]+)\/?$/);
    if (!match) {
        return null;
    }

    return match[1];
}

function normalizeDroptimizerUrl(reportId) {
    return `https://www.raidbots.com/simbot/report/${reportId}`;
}

async function fetchRaidbotsReportData(reportId) {
    const endpoint = `https://www.raidbots.com/simbot/report/${encodeURIComponent(reportId)}/data.json`;
    const response = await axios.get(endpoint, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'wow-skill-issue-proxy/1.0',
        },
        responseType: 'json',
        timeout: 20000,
        maxRedirects: 5,
    });
    return response.data;
}

async function validateDroptimizerUrl(rawUrl) {
    const reportId = extractRaidbotsReportId(rawUrl);
    if (!reportId) {
        return {
            ok: false,
            reason: 'invalid_raidbots_report_url',
        };
    }

    try {
        const data = await fetchRaidbotsReportData(reportId);
        const simType = data?.simbot?.simType || data?.simbot?.meta?.type || '';
        if (simType !== 'droptimizer') {
            return {
                ok: false,
                reason: 'report_is_not_droptimizer',
                reportId,
                simType: simType || 'unknown',
            };
        }

        return {
            ok: true,
            reportId,
            normalizedUrl: normalizeDroptimizerUrl(reportId),
            title: data?.simbot?.publicTitle || data?.simbot?.title || '',
            player: data?.simbot?.player || data?.sim?.players?.[0]?.name || '',
        };
    } catch (error) {
        return {
            ok: false,
            reason: 'raidbots_validation_failed',
            reportId,
            status: error?.response?.status || 502,
        };
    }
}

function enqueueDroptimizerWrite(task) {
    droptimizerWriteQueue = droptimizerWriteQueue.then(task, task);
    return droptimizerWriteQueue;
}

async function persistDroptimizerUrl(rawUrl) {
    return enqueueDroptimizerWrite(async () => {
        const validation = await validateDroptimizerUrl(rawUrl);
        if (!validation.ok) {
            return validation;
        }

        const existing = readDroptimizerUrls();
        if (existing.includes(validation.normalizedUrl)) {
            return {
                ...validation,
                stored: false,
                duplicate: true,
            };
        }

        existing.push(validation.normalizedUrl);
        writeDroptimizerUrls(existing);

        return {
            ...validation,
            stored: true,
            duplicate: false,
        };
    });
}

function extractUrlsFromMessage(message) {
    const values = [
        message?.content || '',
        ...(Array.isArray(message?.embeds) ? message.embeds.map((embed) => embed?.url || '') : []),
    ];

    const matches = values.flatMap((value) => String(value || '').match(/https?:\/\/[^\s<>()]+/g) || []);
    return [...new Set(matches)];
}

function shouldProcessDiscordMessage(message) {
    const configuredChannelId = String(process.env.DISCORD_CHANNEL_ID || '').trim();
    const configuredGuildId = String(process.env.DISCORD_GUILD_ID || '').trim();
    const configuredChannelName = String(process.env.DISCORD_CHANNEL_NAME || 'general').trim().toLowerCase();

    const channelIdMatches = configuredChannelId && message?.channelId === configuredChannelId;
    const channelNameMatches = !configuredChannelId
        && String(message?.channel?.name || '').trim().toLowerCase() === configuredChannelName;
    const guildMatches = !configuredGuildId || String(message?.guildId || '') === configuredGuildId;

    return guildMatches && (channelIdMatches || channelNameMatches);
}

async function runDiscordStartupChecks(token) {
    return token;
}

function startDiscordBot() {
    const token = String(process.env.DISCORD_BOT_TOKEN || '').trim();
    const configuredChannelId = String(process.env.DISCORD_CHANNEL_ID || '').trim();
    const configuredGuildId = String(process.env.DISCORD_GUILD_ID || '').trim();
    const configuredChannelName = String(process.env.DISCORD_CHANNEL_NAME || 'general').trim();

    console.log('[Discord Bot] Startup check:', JSON.stringify({
        hasToken: Boolean(token),
        channelId: configuredChannelId || null,
        guildId: configuredGuildId || null,
        channelName: configuredChannelName,
    }));

    if (!token) {
        console.log('[Discord Bot] Disabled: DISCORD_BOT_TOKEN not configured.');
        return;
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel],
    });

    client.on('error', (error) => {
        console.error('[Discord Bot] Client error:', error?.message || error);
    });

    client.on('warn', (message) => {
        console.warn(`[Discord Bot][warn] ${message}`);
    });

    client.once('clientReady', () => {
        console.log(`[Discord Bot] Connected as ${client.user?.tag || 'unknown-user'}.`);
    });

    client.on('messageCreate', async (message) => {
        if (!shouldProcessDiscordMessage(message)) {
            return;
        }

        if (message.author?.bot) {
            return;
        }

        const urls = extractUrlsFromMessage(message);
        if (urls.length === 0) {
            return;
        }

        for (const url of urls) {
            try {
                const result = await persistDroptimizerUrl(url);
                if (result.ok && result.stored) {
                    console.log(`[Discord Bot] Added droptimizer ${result.reportId} from #${message.channel?.name || message.channelId}.`);
                } else if (result.ok && result.duplicate) {
                    console.log(`[Discord Bot] Duplicate droptimizer ignored: ${result.reportId}.`);
                } else {
                    console.log(`[Discord Bot] Ignored URL (${result.reason}): ${url}`);
                }
            } catch (error) {
                console.error('[Discord Bot] Failed processing message URL:', url, error?.message || error);
            }
        }
    });

    client.login(token).catch((error) => {
        console.error('[Discord Bot] Login failed:', error?.message || error);
    });
}

// Proxy para scrape de Wowhead (evita CORS desde frontend).
app.get('/wowhead/scrape', async (req, res) => {
    const rawUrl = String(req.query?.url || '');
    if (!rawUrl) {
        return res.status(400).send('Missing "url" query param.');
    }

    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return res.status(400).send('Invalid URL.');
    }

    if (!parsed.hostname.includes('wowhead.com')) {
        return res.status(400).send('Only wowhead.com URLs are supported.');
    }

    try {
        const response = await axios.get(parsed.toString(), {
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeout: 20000,
        });
        res.type('text/html').send(response.data);
    } catch (error) {
        const status = error?.response?.status || 502;
        const body = error?.response?.data || 'Failed to scrape Wowhead URL.';
        res.status(status).send(body);
    }
});

async function handleRaidbotsReportProxy(req, res) {
    const report = String(req.params?.report || '').trim();
    if (!report) {
        return res.status(400).json({ error: 'Missing report id.' });
    }

    const endpoint = `https://www.raidbots.com/simbot/report/${encodeURIComponent(report)}/data.json`;
    try {
        const response = await axios.get(endpoint, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'wow-skill-issue-proxy/1.0',
            },
            responseType: 'json',
            timeout: 20000,
            maxRedirects: 5,
        });
        return res.json(response.data);
    } catch (error) {
        const status = error?.response?.status || 502;
        const detail = error?.response?.data || error?.message || 'Failed to fetch Raidbots report.';
        console.error(`[Raidbots Proxy] ${report} -> ${status}`, detail);
        return res.status(status).json({ error: 'raidbots_fetch_failed', report, status });
    }
}

// Proxy para data.json de Raidbots (evita CORS en frontend público).
app.get('/raidbots/simbot/:report/data.json', handleRaidbotsReportProxy);
// Backward compatibility for clients that still send "report/:id".
app.get('/raidbots/simbot/report/:report/data.json', handleRaidbotsReportProxy);

app.get('/droptimizers', (req, res) => {
    const content = fs.existsSync(DROPTIMIZERS_FILE)
        ? fs.readFileSync(DROPTIMIZERS_FILE, 'utf8')
        : '';
    res.type('text/plain').send(content);
});

app.post('/droptimizers/append', async (req, res) => {
    const rawUrl = String(req.body?.url || '').trim();
    if (!rawUrl) {
        return res.status(400).json({ error: 'url is required' });
    }

    try {
        const result = await persistDroptimizerUrl(rawUrl);
        if (!result.ok) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('Error guardando droptimizer:', error);
        return res.status(500).json({ error: 'droptimizer_save_failed' });
    }
});

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

// Prefetch de cache para lista de item IDs. Solo consulta los faltantes.
app.post('/cache/items/prefetch', async (req, res) => {
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
    const normalizedIds = [...new Set(itemIds.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))];

    const summary = {
        total: normalizedIds.length,
        alreadyCached: 0,
        fetchedMedia: 0,
        fetchedName: 0,
        failed: 0,
    };

    for (const itemId of normalizedIds) {
        const cachePaths = getItemCachePaths(itemId);
        const hasMedia = fs.existsSync(cachePaths.media);
        const hasName = fs.existsSync(cachePaths.name);

        if (hasMedia && hasName) {
            summary.alreadyCached += 1;
            continue;
        }

        try {
            if (!hasMedia) {
                const endpointMedia = `https://us.api.blizzard.com/data/wow/media/item/${itemId}?namespace=static-us&locale=en_US`;
                const mediaData = await fetchData(endpointMedia, `item-media-${itemId}.json`);
                if (!mediaData?.error) {
                    summary.fetchedMedia += 1;
                }
            }

            if (!hasName) {
                const endpointName = `https://us.api.blizzard.com/data/wow/item/${itemId}?namespace=static-us&locale=en_US`;
                const nameData = await fetchData(endpointName, `item-name-${itemId}.json`);
                if (!nameData?.error) {
                    summary.fetchedName += 1;
                }
            }
        } catch (error) {
            summary.failed += 1;
            console.error(`Error prefetch item ${itemId}:`, error);
        }
    }

    res.json(summary);
});

// Limpieza de cache de items (no toca journal-encounter).
app.delete('/cache/items', (req, res) => {
    const files = fs.readdirSync(CACHE_DIR);
    let removed = 0;

    files.forEach((file) => {
        if (file.startsWith('item-media-') || file.startsWith('item-name-')) {
            fs.unlinkSync(path.join(CACHE_DIR, file));
            removed += 1;
        }
    });

    res.json({ removed });
});

// Guardar snapshot de bis list generado en local para publicar como estático.
app.post('/bislist/save', (req, res) => {
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    const sources = req.body?.sources ?? {};

    if (!content.trim()) {
        return res.status(400).json({ error: 'content is required' });
    }

    try {
        fs.writeFileSync(BIS_LIST_FILE, content, 'utf8');
        fs.writeFileSync(BIS_SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf8');
        return res.json({
            ok: true,
            bisListFile: BIS_LIST_FILE,
            bisSourcesFile: BIS_SOURCES_FILE,
        });
    } catch (error) {
        console.error('Error guardando bislist estática:', error);
        return res.status(500).json({ error: 'No se pudo guardar la bis list estática.' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    startDiscordBot();
});
