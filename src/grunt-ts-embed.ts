/**
 * grunt-ts-embed
 * Created by xperiments on 29/03/15.
 * Copyright (c) 2015 Pedro Casaubon
 * Licensed under the MIT license.
 */

///<reference path="typings/node/node.d.ts"/>

var Embed = {
	HTMLImageElement:null
}
module io.xperiments.ts {

	export enum EmbedTypes
	{
		binary,
		utf8,
		ascii
	}
	export interface EmbedDiskMap {
		[key:string]:EmbedDiskFile
	}

	export interface EmbedDiskFile{
		format:string;
		mime:string;
		start:number;
		length:number;
		buffer?:Uint8Array;
		dataURL?:string;
		content?:string;
	}

	export var EmbedMimeMap = {
		"application/octet-stream":EmbedTypes.binary,

		"text/xml":EmbedTypes.utf8,
		"text/html":EmbedTypes.utf8,
		"text/plain":EmbedTypes.utf8,
		"text/css":EmbedTypes.utf8,
		"application/javascript":EmbedTypes.utf8,

		"image/svg+xml":EmbedTypes.utf8,
		"image/png":EmbedTypes.binary,
		"image/jpeg":EmbedTypes.binary,
		"image/gif":EmbedTypes.binary,
		"application/pdf":EmbedTypes.binary
	}
}

'use strict';


module.exports = function (grunt) {

	grunt.registerMultiTask("embed", function () {


		var done = this.async();
		var fs = require('fs')
		var path = require('path')
		var mime = require('mime');

		var outFile = this.data.out || 'ts-embed.ets';


		/* Fetch file data */
		var fileSrcs:any[] = [];
		var diskMap:io.xperiments.ts.EmbedDiskMap = {};
		var diskPos = 0;
		var count = 0;
		this.files.forEach(parseSourceFile);
		fileSrcs.forEach(processDiskMapFile)

		console.log( diskMap )
		/* Generate Header */
		var jsonDiskMap = JSON.stringify(diskMap);
		var jsonDiskMapBuffer = new Buffer(jsonDiskMap, "utf-8");
		var headerSize = jsonDiskMapBuffer.length;
		var mainHeader = new Buffer([

			headerSize >> 24 & 255, // size
			headerSize >> 16 & 255, // size
			headerSize >> 8 & 255, // size
			headerSize >> 0 & 255
		]);

		/* Create output stream */
		var outStream = fs.createWriteStream(path.join(__dirname ,outFile), {
			flags: "w",
			encoding: null,
			mode: 438
		});

		/* Write header map */
		outStream.write(mainHeader);
		outStream.write(jsonDiskMapBuffer);


		var todo = fileSrcs.length;
		rmerge();


		/* Helper Methods */

		function rmerge() {

			if (count != todo) {

				var currentFile = fileSrcs[count].path;
				merge(currentFile, rmerge);
				count++;
				return;
			}
			done(true);
		}


		function parseSourceFile(file) {
			var fileContents = grunt.file.read(file.src);
			var lines = fileContents.match(/[^\r\n]+/g);
			var filePath = path.dirname(file.src[0]);

			lines.forEach(function (line, i) {
				var hasEmbed = /@embed[\s]?\([\s]?(.*)[\s]?\)/.test(line);
				if (hasEmbed) {
					var embedObj;
					var embedOptions = /@embed[\s]?\([\s]?(.*)[\s]?\)/.exec(line)[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace((/'/g), "\"");
					eval( "embedObj="+embedOptions);
					//var embedObj = JSON.parse(/@embed[\s]?\([\s]?(.*)[\s]?\)/.exec(line)[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace((/'/g), "\""));
					var embedPath = filePath + '/' + embedObj.src;

					if (!grunt.file.exists(embedPath)) {
						console.log('ERROR Not file at path: ', embedPath);
						return;
					}
					embedObj.path = embedPath;
					fileSrcs.push(embedObj);
				}
			})

		}

		function processDiskMapFile(file:any) {

			var fileSize = fs.statSync(file.path).size;
			diskMap[PJWHash(file.src)] = {
				format:( file.format || io.xperiments.ts.EmbedMimeMap[ mime.lookup(file.path) ] || io.xperiments.ts.EmbedTypes.binary),
				mime:mime.lookup(file.path) || "application/octet-stream",
				start: diskPos,
				length: fileSize
			}
			diskPos += fileSize;
		}

		function PJWHash(str:string):number {
			var BitsInUnsignedInt = 4 * 8;
			var ThreeQuarters = (BitsInUnsignedInt * 3) / 4;
			var OneEighth = BitsInUnsignedInt / 8;
			var HighBits = (0xFFFFFFFF) << (BitsInUnsignedInt - OneEighth);
			var hash = 0;
			var test = 0;
			for (var i = 0; i < str.length; i++) {
				hash = (hash << OneEighth) + str.charCodeAt(i);
				if ((test = hash & HighBits) != 0) {
					hash = ((hash ^ (test >> ThreeQuarters)) & (~HighBits));
				}
			}
			return hash;
		};

		function merge(file, onDone) {
			var inStream = fs.createReadStream(file, {
				flags: "r",
				encoding: null,
				fd: null,
				mode: 438,
				bufferSize: 64 * 1024
			});
			inStream.on("end", onDone);
			inStream.pipe(outStream, {end: false});
		};
	});

}
