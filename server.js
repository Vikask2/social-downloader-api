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

        if (!videoUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const outputPath = path.join(__dirname, `video-${Date.now()}.mp4`);

        const command = `yt-dlp -f mp4 -o "${outputPath}" "${videoUrl}"`;

        exec(command, async (error) => {

            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Download failed' });
            }

            if (!fs.existsSync(outputPath)) {
                return res.status(500).json({ error: 'File not generated' });
            }

            res.download(outputPath, 'video.mp4', () => {
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