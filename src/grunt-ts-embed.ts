/**
 * grunt-ts-embed
 * Created by xperiments on 29/03/15.
 * Copyright (c) 2015 Pedro Casaubon
 * Licensed under the MIT license.
 */

///<reference path="typings/node/node.d.ts"/>

var Embed = {}

module xp {

	/**
	 * Types of internal data storage formats
	 */
	export enum EmbedType
	{
		binary,
		utf8
	}


	/**
	 * Internal storage representation of a file
	 */
	export interface EmbedDiskFile {
		format:EmbedType;
		mime:string;
		start:number;
		length:number;
		content?:string | Uint8Array;
		symbol?:string;
	}

	export interface EmbedDiskMap {
		[key:string]:EmbedDiskFile
	}

	export interface IEmbedExtractor { ( meta:IEmbedMeta ):any;
	}
	export interface IEmbedMeta {
		src:string;
		format?:xp.EmbedType;
		as?:IEmbedExtractor;
		symbol?:string;
		mime:string;
		path?:string; /*node only*/
	}
	export interface IEmbedDecorator {
		params:IEmbedMeta;
		proto:any;
		propertyName:string;
		done?:boolean;
	}

}
module xp {


	export var EmbedMimeMap:{[key:string]:EmbedType } = {
		"audio/L24":EmbedType.binary,
		"audio/mp4":EmbedType.binary,
		"audio/mpeg":EmbedType.binary,
		"audio/ogg":EmbedType.binary,
		"audio/opus":EmbedType.binary,
		"audio/vorbis":EmbedType.binary,
		"audio/vnd.wave":EmbedType.binary,
		"audio/webm":EmbedType.binary,

		"image/gif":EmbedType.binary,
		"image/jpeg":EmbedType.binary,
		"image/pjpeg":EmbedType.binary,
		"image/png":EmbedType.binary,
		"image/bmp":EmbedType.binary,
		"image/svg+xml":EmbedType.utf8,
		"image/tiff":EmbedType.binary,

		"text/css":EmbedType.utf8,
		"text/csv":EmbedType.utf8,
		"text/html":EmbedType.utf8,
		"text/javascript":EmbedType.utf8,
		"text/plain":EmbedType.utf8,
		"text/rtf":EmbedType.utf8,
		"text/vcard":EmbedType.utf8,
		"text/xml":EmbedType.utf8,

		"video/avi":EmbedType.binary,
		"video/mpeg":EmbedType.binary,
		"video/mp4":EmbedType.binary,
		"video/ogg":EmbedType.binary,
		"video/quicktime":EmbedType.binary,
		"video/webm":EmbedType.binary,

		"application/typescript":EmbedType.utf8,
		"application/ecmascript":EmbedType.utf8,
		"application/json":EmbedType.utf8,
		"application/javascript":EmbedType.utf8,
		"application/octet-stream":EmbedType.binary,
		"application/pdf":EmbedType.binary,
		"application/xml":EmbedType.utf8,
		"application/zip":EmbedType.binary,
		"application/gzip":EmbedType.binary


	}
}


'use strict';


module.exports = function ( grunt ) {

	grunt.registerMultiTask("embed", function () {

		var fs = require('fs')
		var path = require('path')
		var mime = require('mime');
		var strip = require('strip-comments');

		var done = this.async();
		if (this.files[0].src.length == 0) {
			grunt.log.error('grunt-ts-embed: No files to process');
			done();
			return;
		}

		var taskOptions:any = this.data;

		// determine output file
		var outFile:String = taskOptions.out || 'ts-embed.ets';

		var embedFiles:xp.IEmbedMeta[] = [];
		var embedDiskMap:xp.EmbedDiskMap = {};
		var diskPos:number = 0;
		var currentFile:number = 0;
		var gruntFiles = this.files[0].src;
		var numFileToProcess = 0;
		// process Typescript source files
		gruntFiles.forEach(parseSourceFile);

		// generate embedDiskMap data
		numFileToProcess = embedFiles.length;
		embedFiles.forEach(processDiskMapFile);


		// no files to process?
		if (numFileToProcess == 0) {
			grunt.log.error('grunt-ts-embed: No files to process');
			done();
			return;
		}


		/* Generate 32bit Header with the size of the JSON representation of embedDiskMap */
		var jsonDiskMap = JSON.stringify(embedDiskMap);
		var jsonDiskMapBuffer = new Buffer(jsonDiskMap, "utf-8");
		var headerSize = jsonDiskMapBuffer.length;
		var mainHeader = new Buffer([

			headerSize >> 24 & 255, // size
			headerSize >> 16 & 255, // size
			headerSize >> 8 & 255, // size
			headerSize >> 0 & 255
		]);

		/* Create output stream */
		var outStream = fs.createWriteStream(outFile, {
			flags: "w",
			encoding: null,
			mode: 438
		});

		/* write header */
		outStream.write(mainHeader);
		/* write embedDiskMap */
		outStream.write(jsonDiskMapBuffer);

		/* recursively concatenate files */
		concatFiles();


		/* Helper Methods */

		function concatFiles():void {

			if (currentFile != numFileToProcess) {

				merge(embedFiles[currentFile].path, concatFiles);
				currentFile++;
				return;
			}
			grunt.log.ok('grunt-ts-embed: Completed embedding assets into', outFile);
			done(true);
		}

		function merge( file:string, onDone:()=>void ):void {
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

		function parseSourceFile( file:string ):void {

			var fileContents = strip(grunt.file.read(file));
			var lines = fileContents.match(/[^\r\n]+/g);

			if (!lines) return;
			var filePath = path.dirname(file);
			lines.forEach(function ( line, i ) {

				var hasEmbed = /@embed([A-Z].*)?[\s]?\([\s]?(.*)[\s]?\)/.test(line);
				if (hasEmbed) {
					var embedOptions = /@embed([A-Z].*)?[\s]?\([\s]?(.*)[\s]?\)/.exec(line)[2].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace((/'/g), "\"");

					var embedObj = evalEmbedOptions(embedOptions);
					if (embedObj) {
						var embedPath = filePath + '/' + embedObj.src;

						if (!grunt.file.exists(embedPath)) {
							grunt.log.error('ERROR No file at path: ', embedPath);
							return;
						}
						embedObj.path = embedPath;
						if (embedFiles.indexOf(embedObj) == -1) {
							embedFiles.push(embedObj);
						}
					}
				}
			});

		}

		function evalEmbedOptions( options:string ):xp.IEmbedMeta {
			var r = null;
			var error = true;
			var lastPath;
			while (error) {

				try {
					eval('r=' + options);
					error = false;
				}
				catch (err) {
					if (err instanceof ReferenceError) {
						var ref = err.message.replace(' is not defined', '');
						global[ref] = (taskOptions.decompressor && taskOptions.decompressor[ref]) || {};
					}
				}
			}
			return r;
		}

		function processDiskMapFile( file:xp.IEmbedMeta ):void {

			var fileSize = fs.statSync(file.path).size;
			var mimeType = file.mime ? file.mime : <string>mime.lookup(file.path) || "application/octet-stream";
			var format = xp.EmbedMimeMap[ mimeType ] || xp.EmbedType.binary;

			embedDiskMap[PJWHash(file.src)] = <xp.EmbedDiskFile>{
				src: file.src,
				format: format,
				mime: mimeType,
				start: diskPos,
				length: fileSize
			}
			if (file.symbol) embedDiskMap[PJWHash(file.src)].symbol = file.symbol;
			diskPos += fileSize;
		}

		function PJWHash( str:string ):number {
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


	});

}
