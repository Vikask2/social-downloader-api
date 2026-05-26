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

        const command = `yt-dlp --cookies "${cookiesPath}" -F "${videoUrl}"`;

        exec(command, {
            maxBuffer: 1024 * 1024 * 10,
            timeout: 120000
        }, (error, stdout, stderr) => {

            if (error) {

                console.error(stderr || error.message);

                return res.status(500).json({
                    error: 'Unable to fetch formats',
                    details: stderr || error.message
                });

            }

            const qualities = [];

            stdout.split('\n').forEach(line => {

                const match = line.match(/(\d{3,4})p/);

                if (match && !qualities.includes(match[1])) {
                    qualities.push(match[1]);
                }

            });

            qualities.sort((a, b) => parseInt(a) - parseInt(b));

            if (qualities.length === 0) {
                return res.status(500).json({
                    error: 'No formats detected',
                    details: stdout
                });
            }

            res.json({ qualities });

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

        const outputPath = path.join(__dirname, `video-${Date.now()}.mp4`);

        const format = `best[height<=${quality}]/best`;

        const command = `yt-dlp --cookies "${cookiesPath}" -f "${format}" -o "${outputPath}" "${videoUrl}"`;

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

            if (!fs.existsSync(outputPath)) {
                return res.status(500).json({
                    error: 'File not generated'
                });
            }

            res.download(outputPath, `video-${quality}p.mp4`, () => {
                fs.unlink(outputPath, () => {});
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