import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import mysql from 'mysql';
import config from './config';

const app = express();
const db = mysql.createConnection(config.db);

db.connect(err => {
    if (err) {
        throw err;
    }

    db.query(
        `CREATE TABLE IF NOT EXISTS images
	(
			id           INT(11)      UNSIGNED NOT NULL AUTO_INCREMENT,
			date_created TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
			date_used    TIMESTAMP    NULL DEFAULT NULL,
			name         VARCHAR(300) NOT NULL,
			size         INT(11)      UNSIGNED NOT NULL,
			data         LONGBLOB     NOT NULL,
		PRIMARY KEY (id),
		UNIQUE KEY name (name)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8`
    );

    app.param('image', (req, res, next, image) => {
        if (!image.match(/\.(png|jpg)$/i)) {
            return res.status(req.method === 'POST' ? 403 : 404).end();
        }
        db.query('SELECT * FROM images WHERE name = ?', [image], (err, images) => {
            if (err || !images.length) {
                return res.status(404).end();

            }
            req.image = images[0];
            return next();
        });

    });

    app.post('/uploads/:image', bodyParser.raw({
        limit: '10mb',
        type: 'image/*'
    }), (req, res) => {
        db.query('INSERT INTO images SET ?', {
            name: req.image.name,
            size: req.body.length,
            data: req.body,
        }, (err) => {
            if (err) {
                return res.send({ status: 'error', code: err.code });
            }
            res.send({ status: 'ok', size: req.body.length });

        });
    });

    app.head('/uploads/:image', (req, res) => {
        return res.status(200).end()
    });

    app.get('/uploads/:image', downloadImage);


    app.listen(5000, () => {
        console.log('ready');
    });

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
