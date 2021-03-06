const express = require('express');
const SSEChannel = require('sse-pubsub');
const app = express();
const channel = new SSEChannel();
const scrap = require('./scrap');
const Promise = require('bluebird');
const TikTokScraper = require('tiktok-scraper');
const { query } = require('express');

const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); //replace localhost with actual host
    res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, PATCH, POST, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');
    next();
}

app.use(corsMiddleware);
app.get('/', (req, res) => res.send("OK"));
app.get('/stream', (req, res) => channel.subscribe(req, res));

app.get('/:username', (req, res) => {
    try {
        const username = req.params.username;
        const limit = req.query.limit || 10;
        if(!username) return res.status(400).json({
            code:400,
            message: 'Invalid parameter'
        })
        console.log("limit", limit)
        return TikTokScraper.user(username, { number: parseInt(limit) }).then(posts => {
            posts.collector = posts.collector.map(post => ({
                id: post.id, 
                text: post.text,
                createTime: post.createTime,
                authorMeta: post.authorMeta,
                videoUrl: post.videoUrl,
                covers: post.covers,
                webVideoUrl: post.webVideoUrl
            }));
            return res.status(200).json({
                code: 200,
                data: posts.collector
            });
        });
    } catch (error) {
        return res.status(500).json({
            code: 500,
            message: error.message
        });
    }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log("Running scrap and server");
    Promise.delay(5000).then(() => scrap(channel));
});