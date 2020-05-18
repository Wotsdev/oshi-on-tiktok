'use strict'

const fs = require('fs')
const path = require('path')
const Axios = require('axios')
var request = require('request');
var progress = require('request-progress');

function downloadFile(videoUrl, fileName) {
	return new Promise((resolve, reject) => {
		const filePath = path.resolve('downloads', fileName);
		return progress(request(videoUrl), {
			// throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms 
			// delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms 
			// lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length 
		})
		.on('progress', function (state) {
			// The state is an object that looks like this: 
			// { 
			//     percent: 0.5,               // Overall percent (between 0 to 1) 
			//     speed: 554732,              // The download speed in bytes/sec 
			//     size: { 
			//         total: 90044871,        // The total payload size in bytes 
			//         transferred: 27610959   // The transferred payload size in bytes 
			//     }, 
			//     time: { 
			//         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals) 
			//         remaining: 81.403       // The remaining seconds to finish (3 decimals) 
			//     } 
			// } 
			console.log('progress', state.percent);
		})
		.on('error', function (err) {
			reject(err)
		})
		.on('end', function () {
			resolve()
		})
		.pipe(fs.createWriteStream(filePath));
	})
}
function downloadFile1(videoUrl, videoName) {
	return new Promise(async(resolve, reject) => {
		const url = videoUrl
		const filePath = path.resolve('downloads', videoName);
		const writer = fs.createWriteStream(filePath)

		// axios image download with response type "stream"
		const response = await Axios({
			method: 'GET',
			url: url,
			responseType: 'stream'
		})
		// response.on('error', function (err) {
		// 	fs.unlink(filePath, reject(null, err));
		// });
		response.data.pipe(writer)
		writer.on('finish', resolve)
		writer.on('error', reject)
	});
}

module.exports = downloadFile