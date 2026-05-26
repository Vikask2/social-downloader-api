const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET']
}));

const cookiesPath = path.join(__dirname, 'cookies.txt');

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        cookies: fs.existsSync(cookiesPath)
    });
});

app.get('/vikas-test-999', (req, res) => {
    res.json({
        working: true,
        latest: true,
        timestamp: Date.now()
    });
});

app.get('/formats', async (req, res) => {

    try {

        const videoUrl = req.query.url;

        if (!videoUrl) {
            return res.status(400).json({
                error: 'URL is required'
            });
        }

        if (!fs.existsSync(cookiesPath)) {
            return res.status(500).json({
                error: 'cookies.txt missing'
            });
        }

        const command = `yt-dlp --cookies "${cookiesPath}" -J "${videoUrl}"`;

        exec(command, {
            maxBuffer: 1024 * 1024 * 20,
            timeout: 120000
        }, (error, stdout, stderr) => {

            if (error) {

                console.error(stderr || error.message);

                return res.status(500).json({
                    error: 'Unable to fetch formats',
                    details: stderr || error.message
                });

            }

            try {

                const data = JSON.parse(stdout);

                const qualities = [];

                if (data.formats && Array.isArray(data.formats)) {

                    data.formats.forEach(format => {

                        if (
                            format.height &&
                            !qualities.includes(String(format.height))
                        ) {
                            qualities.push(String(format.height));
                        }

                    });

                }

                qualities.sort((a, b) => parseInt(a) - parseInt(b));

                if (qualities.length === 0) {

                    return res.status(500).json({
                        error: 'No formats detected'
                    });

                }

                res.json({ qualities });

            } catch (jsonError) {

                return res.status(500).json({
                    error: 'Format parsing failed',
                    details: jsonError.message
                });

            }

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Server error',
            details: err.message
        });

    }

});

app.get('/download', async (req, res) => {

    try {

        const videoUrl = req.query.url;
        const quality = req.query.quality || '720';

        if (!videoUrl) {
            return res.status(400).json({
                error: 'URL is required'
            });
        }

        const outputTemplate = path.join(__dirname, `video-${Date.now()}.%(ext)s`);

        const format = `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4][height<=${quality}]/best[height<=${quality}]/best`;

        const command = `yt-dlp --cookies "${cookiesPath}" --merge-output-format mp4 -f "${format}" -o "${outputTemplate}" "${videoUrl}"`;

        exec(command, {
            maxBuffer: 1024 * 1024 * 20,
            timeout: 300000
        }, (error, stdout, stderr) => {

            if (error) {

                console.error(stderr || error.message);

                return res.status(500).json({
                    error: 'Download failed',
                    details: stderr || error.message
                });

            }

            const files = fs.readdirSync(__dirname);

            const downloadedFile = files.find(file =>
                file.startsWith('video-') &&
                (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
            );

            if (!downloadedFile) {

                return res.status(500).json({
                    error: 'File not generated'
                });

            }

            const finalPath = path.join(__dirname, downloadedFile);

            res.download(finalPath, downloadedFile, () => {
                fs.unlink(finalPath, () => {});
            });

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Server error',
            details: err.message
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});