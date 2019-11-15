import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';

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
        res.send({status: 'ok', size: req.body.length});
    });
});

app.head('/uploads/:image', (req, res) => {
    fs.access(
        req.localpath,
        fs.constants.R_OK,
        (err) => res.status(err ? 404 : 200).end()
    );
});

app.get('/uploads/:image', (req, res) => {
    const fd = fs.createReadStream(req.localpath);

    fd.on('error', (e) => {
        res.status(e.code === 'ENOENT' ? 404 : 500).end();
    });
    res.setHeader('Content-Type', 'image/' + path.extname(req.image).substr(1));
    fd.pipe(res);
});

app.listen(3000, () => {
    console.log('ready');
});
