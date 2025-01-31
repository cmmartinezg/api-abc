const express = require('express');
const puppeteer = require('puppeteer');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json'); // Archivo de configuración de Swagger
const router = express.Router();

const API_KEY = process.env.API_KEY || '123456';

// Middleware para validar API Key
router.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(403).json({ codigo: "e105", error: "API Key requerida" });
    }
    next();
});


// Ruta para obtener noticias desde /ultimas-noticias/
router.get('/ultimas-noticias', async (req, res) => {
    const { bono } = req.query;

    try {
        console.log(`🔍 Buscando noticias en /ultimas-noticias/`);

        const url = `https://www.abc.com.py/ultimas-noticias/`;
        const browser = await puppeteer.launch({
            headless: false, // ⚠️ Cambia a `false` para ver la página en tiempo real
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Simula ser un usuario real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'es' });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // 📸 Captura de pantalla para verificar el contenido
        await page.screenshot({ path: 'screenshot.png', fullPage: true });
        console.log('📸 Captura de pantalla guardada como screenshot.png');

        // 🔍 Ver el HTML cargado
        const pageHTML = await page.evaluate(() => document.body.innerHTML);
        console.log("🔍 HTML capturado:\n", pageHTML.substring(0, 2000));

        // ⚠️ Ajustar el selector si es necesario
        const noticiaSelector = '.article'; 

        try {
            await page.waitForSelector(noticiaSelector, { timeout: 20000 });
        } catch (error) {
            console.log(`⚠ No se encontraron noticias con el selector ${noticiaSelector}`);
            await browser.close();
            return res.status(404).json({ codigo: "e267", error: "No se encuentran noticias en /ultimas-noticias/" });
        }

        // Extraer noticias
        const noticias = await page.evaluate((noticiaSelector) => {
            return Array.from(document.querySelectorAll(noticiaSelector)).map(noticia => ({
                fecha: noticia.querySelector('.news-date')?.innerText.trim() || 'Fecha no disponible',
                enlace: noticia.querySelector('a')?.href || '',
                titulo: noticia.querySelector('h2, .news-title')?.innerText.trim() || 'Sin título',
                resumen: noticia.querySelector('.news-summary')?.innerText.trim() || 'Sin resumen',
                enlace_foto: noticia.querySelector('img')?.src || ''
            }));
        }, noticiaSelector);

        console.log("📌 Noticias encontradas:");
        noticias.forEach(noticia => console.log(noticia.titulo));

        // Procesar imágenes en base64 si se solicita el BONO
        if (bono === 'true') {
            for (let noticia of noticias) {
                if (noticia.enlace_foto) {
                    try {
                        const response = await page.goto(noticia.enlace_foto);
                        const buffer = await response.buffer();
                        noticia.contenido_foto = buffer.toString('base64');
                        noticia.content_type_foto = response.headers()['content-type'];
                    } catch (error) {
                        console.log(`⚠ Error obteniendo la imagen de ${noticia.enlace_foto}`);
                    }
                }
            }
        }

        await browser.close();

        if (noticias.length === 0) {
            return res.status(404).json({ codigo: "e267", error: "No se encuentran noticias en /ultimas-noticias/" });
        }

        res.status(200).json(noticias);
    } catch (error) {
        console.error('❌ Error en scraping:', error);
        res.status(500).json({ codigo: "e100", error: "Error interno del servidor" });
    }
});

// **SWAGGER**
const app = express();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', router);

// Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📄 Documentación disponible en http://localhost:${PORT}/api-docs`);
});





