const Queue = require('bull')
const fs = require('fs')
const {tweet, VideoTweet} = require('../util/Tweet')
const download = require('../util/download')
const {Feed} = require('../models')
const path = require('path')

const queue = new Queue('tweetQueue', process.env.REDIS_URI)

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

queue.process(5, async function(job, done){
    const data = job.data
    if(data.videoMeta.duration > 140) {
        return done(new Error('Video too long'))
    }
    const fileName = data.id + '.mp4'
    const videoUrl = data.videoUrlNoWaterMark || data.videoUrl
    download(videoUrl, fileName).then(async() => {
        console.log("Video Downloaded")
        const username = data.authorMeta.name
        const nickname = data.authorMeta.nickName
        const pathFile = path.resolve('downloads', fileName)
        const downloadUrl = `${process.env.DOWNLOAD_SERVICE_URL}/${username}/${data.id}`
        await sleep(10000)
        const regexp = new RegExp('#([^\\s]*)','g')
        let caption = data.text
        caption = caption.replace(regexp, '');
        caption = caption.replace(/@/g, '@.')
        caption = caption.trim()
        const tweet_text = `Update dari ${nickname ? nickname : username}:\n${caption}`
        new VideoTweet({
            file_path: pathFile,
            tweet_text: tweet_text
        }, async function(err, t) {
            if(err) return done(new Error(err))
            if("id_str" in t) {
                // await sleep(2000)
                const result = {
                    tiktok_id: data.id,
                    author_id: data.authorMeta.id,
                    author_name: username,
                    tiktok_createTime: data.createTime,
                    downloadUrl: downloadUrl,
                    tweet_id: t.id_str
                }
                return done(null, result)
            } else {
                console.log(t)
                return done(new Error("Failed to Upload Video"))
            }
        })
    }).catch(err => done(new Error(err)))
    
});

queue.on('progress', function(job, progress) {
    // console.log(`Job ${job.data.id} is ${progress * 100}% ready!`);
});

queue.on('completed', async function(job, result){
    console.log(`${job.data.id} COMPLETED`)
    await Feed.create(result)

    const fileName = job.data.id + '.mp4'
    const filePath = path.resolve('downloads', fileName);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (error) {}
    // setTimeout(() => {
    //     tweet(`Download video: ${result.downloadUrl}`, result.tweet_id)
    // }, 1000 * 60 * 2)
    job.remove()
});
queue.on('failed', function(job, err){
    console.error(err)
    const fileName = job.data.id + '.mp4'
    const filePath = path.resolve('downloads', fileName);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (error) {}
    job.remove()
});


module.exports = queue