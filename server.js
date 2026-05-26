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

app.get('/download', async (req, res) => {

    try {

        const videoUrl = req.query.url;
        const quality = req.query.quality || '720';

        if (!videoUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const outputPath = path.join(__dirname, `video-${Date.now()}.mp4`);

        let format = 'best';

        if (quality === '360') {
            format = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
        } else if (quality === '480') {
            format = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
        } else if (quality === '720') {
            format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
        } else if (quality === '1080') {
            format = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
        }

        const command = `yt-dlp -f "${format}" -o "${outputPath}" "${videoUrl}"`;

        exec(command, async (error, stdout, stderr) => {

            if (error) {
                console.error(error);
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