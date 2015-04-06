/**
 * grunt-ts-embed
 * Created by xperiments on 29/03/15.
 * Copyright (c) 2015 Pedro Casaubon
 * Licensed under the MIT license.
 */

///<reference path="typings/node/node.d.ts"/>

var Embed = {}

module xp {



	export interface EmbedDiskMap {
		[key:string]:EmbedDiskFile
	}
	export interface EmbedDiskFile {
		format:string;
		mime:string;
		start:number;
		length:number;
		content:string | Uint8Array;
		symbol?:string;
	}
	export interface IEmbedDecompressor { (params:IEmbedParams):any; }
	export interface IEmbedParams {
		src:string;
		as?:IEmbedDecompressor;
		symbol?:string;
		format:xp.EmbedType;
		/*node only*/
		path?:string;
	}
	export interface IEmbedDecoratorParams {
		params:IEmbedParams;
		proto:any;
		propertyName:string;
		processed:boolean;
	}

	export enum EmbedType
	{
		binary,
		utf8,
		ascii
	}
}
module xp {


	export var EmbedMimeMap = {
		"application/octet-stream":EmbedType.binary,

		"text/xml":EmbedType.utf8,
		"text/html":EmbedType.utf8,
		"text/plain":EmbedType.utf8,
		"text/css":EmbedType.utf8,
		"application/javascript":EmbedType.utf8,

		"image/svg+xml":EmbedType.utf8,
		"image/png":EmbedType.binary,
		"image/jpeg":EmbedType.binary,
		"image/gif":EmbedType.binary,
		"application/pdf":EmbedType.binary
	}
}



'use strict';


module.exports = function (grunt) {

	grunt.registerMultiTask("embed", function () {

		var fs = require('fs')
		var path = require('path')
		var mime = require('mime');

		var done = this.async();
		if( this.files[0].src.length == 0)
		{
			grunt.log.error('grunt-ts-embed: No files to processs');
			done();
			return;
		}

		var outFile:String = this.data.out || 'ts-embed.ets';

		var taskOptions:any = this.data;
		/* Fetch file data */
		var fileSrcs:xp.IEmbedParams[] = [];
		var diskMap:xp.EmbedDiskMap = {};
		var diskPos:number = 0;
		var count:number = 0;

		this.files[0].src.forEach(parseSourceFile);
		fileSrcs.forEach(processDiskMapFile);
		if( fileSrcs.length == 0)
		{
			grunt.log.error('grunt-ts-embed: No files to processs');
			done();
			return;
		}
		console.log( diskMap );

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
		var outStream = fs.createWriteStream(outFile, {
			flags: "w",
			encoding: null,
			mode: 438
		});

		/* Write header map */
		outStream.write(mainHeader);
		outStream.write(jsonDiskMapBuffer);


		var numFileToProcess = fileSrcs.length;
		rmerge();


		/* Helper Methods */

		function rmerge():void {

			if (count != numFileToProcess) {

				merge(fileSrcs[count].path, rmerge);
				count++;
				return;
			}
			grunt.log.ok('grunt-ts-embed: Completed embeding assets into', outFile);
			done(true);
		}

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

		function parseSourceFile(file:string):void {
			var fileContents = grunt.file.read(file);
			var lines = fileContents.match(/[^\r\n]+/g);
			var filePath = path.dirname(file);

			lines.forEach(function (line, i) {

				var hasEmbed = /@embed[\s]?\([\s]?(.*)[\s]?\)/.test(line);
				if (hasEmbed) {
					var embedOptions = /@embed[\s]?\([\s]?(.*)[\s]?\)/.exec(line)[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace((/'/g), "\"");

					var embedObj = evalEmbedOptions( embedOptions );
					if( embedObj ) {
						var embedPath = filePath + '/' + embedObj.src;

						if (!grunt.file.exists(embedPath)) {
							grunt.log.error('ERROR Not file at path: ', embedPath);
							return;
						}
						embedObj.path = embedPath;
						if (fileSrcs.indexOf(embedObj) == -1) {
							fileSrcs.push(embedObj);
						}
					}


				}
			})

		}

		function evalEmbedOptions(options:string):xp.IEmbedParams{
			var r = null;
			var error = true;
			var lastPath;
			while( error ){

				try{
					eval('r='+options);
					error = false;
				}
				catch(err){
					if(  err instanceof ReferenceError){
						var ref = err.message.replace(' is not defined','');
						global[ref]=(taskOptions.decompressor && taskOptions.decompressor[ ref ]) || {};
					}
				}
			}
			return r;
		}

		function processDiskMapFile(file:xp.IEmbedParams):void {

			var fileSize = fs.statSync(file.path).size;

			diskMap[PJWHash(file.src)] = <xp.EmbedDiskFile>{
				src:file.src,
				format:<string>( file.format || xp.EmbedMimeMap[ mime.lookup(file.path) ] || xp.EmbedType.binary),
				mime:<string>(mime.lookup(file.path) || "application/octet-stream"),
				start: diskPos,
				length: fileSize
			}
			if( file.symbol) diskMap[PJWHash(file.src)].symbol =  file.symbol;
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


	});

}
