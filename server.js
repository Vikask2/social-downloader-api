const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());

app.get('/', (req, res) => {
    res.send('Social Downloader API Running');
});

app.get('/formats', async (req, res) => {

    try {

        const videoUrl = req.query.url;

        if (!videoUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const command = `yt-dlp --cookies cookies.txt -F "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {

            if (error) {
                console.error(stderr);
                return res.status(500).json({ error: 'Unable to fetch formats' });
            }

            const lines = stdout.split('\n');

            const qualities = [];

            lines.forEach(line => {

                const match = line.match(/(\d{3,4})p/);

                if (match) {

                    const quality = match[1];

                    if (!qualities.includes(quality)) {
                        qualities.push(quality);
                    }

                }

            });

            qualities.sort((a,b)=>parseInt(a)-parseInt(b));

            res.json({ qualities });

        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: 'Server error' });

    }

});

app.get('/download', async (req, res) => {

    try {

        const videoUrl = req.query.url;
        const quality = req.query.quality || '720';

        if (!videoUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const outputPath = path.join(__dirname, `video-${Date.now()}.mp4`);

        const format = `best[height<=${quality}]/best`;

        const command = `yt-dlp --cookies cookies.txt -f "${format}" -o "${outputPath}" "${videoUrl}"`;

        exec(command, async (error, stdout, stderr) => {

            if (error) {
                console.error(stderr);
                return res.status(500).json({ error: 'Download failed' });
            }

            if (!fs.existsSync(outputPath)) {
                return res.status(500).json({ error: 'File not generated' });
            }

            res.download(outputPath, `video-${quality}p.mp4`, () => {
                fs.unlink(outputPath, () => {});
            });

        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: 'Server error' });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});