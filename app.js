import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const __dirname = path.resolve();
const app = express();

app.param('image', (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
        return res.status(req.method === 'POST' ? 403 : 404).end();
    }
    req.image = image;
    req.localpath = path.join(__dirname, 'uploads', req.image);
    return next();
});

app.post('/uploads/:image', bodyParser.raw({
    limit: '10mb',
    type: 'image/*'
}), (req, res) => {

    const fd = fs.createWriteStream(req.localpath, {
        flags: 'w+',
        encoding: 'binary'
    });
    fd.end(req.body);
    fd.on('close', () => {
        res.send({ status: 'ok', size: req.body.length });
    });
});

app.head('/uploads/:image', (req, res) => {
    fs.access(
        req.localpath,
        fs.constants.R_OK,
        (err) => res.status(err ? 404 : 200).end()
    );
});

app.get('/uploads/:image', downloadImage);

app.listen(3000, () => {
    console.log('ready');
});

function downloadImage(req, res) {
    fs.access(req.localpath, fs.constants.R_OK, (err) => {
        if (err) {
            return res.status(404).end();
        }

        const queryParams = req.query;
        const width = +queryParams.width;
        const height = +queryParams.height;
        const blur = +queryParams.blur;
        const sharpen = +queryParams.sharpen;
        const greyscale = queryParams.greyscale === 'y';
        const flip = queryParams.flip === 'y';
        const flop = queryParams.flop === 'y';
        const image = sharp(req.localpath);

        if (width > 0 || height > 0) {
            image.resize(width || null, height || null);
        }

        if (blur > 0) {
            image.blur(blur);
        }

        if (sharpen > 0) {
            image.sharpen(sharpen);
        }

        if (flip) {
            image.flip();
        }

        if (flop) {
            image.flop();
        }

        if (greyscale) {
            image.greyscale();
        }

        res.setHeader('Content-Type', 'image/' +
            path.extname(req.image).substr(1));

        image.pipe(res);
    });
}
