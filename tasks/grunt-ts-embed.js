/**
 * grunt-ts-embed
 * Created by xperiments on 29/03/15.
 * Copyright (c) 2015 Pedro Casaubon
 * Licensed under the MIT license.
 */
///<reference path="typings/node/node.d.ts"/>
var Embed = {};
var xp;
(function (xp) {
    (function (EmbedType) {
        EmbedType[EmbedType["binary"] = 0] = "binary";
        EmbedType[EmbedType["utf8"] = 1] = "utf8";
    })(xp.EmbedType || (xp.EmbedType = {}));
    var EmbedType = xp.EmbedType;
})(xp || (xp = {}));
var xp;
(function (xp) {
    xp.EmbedMimeMap = {
        "audio/L24": xp.EmbedType.binary,
        "audio/mp4": xp.EmbedType.binary,
        "audio/mpeg": xp.EmbedType.binary,
        "audio/ogg": xp.EmbedType.binary,
        "audio/opus": xp.EmbedType.binary,
        "audio/vorbis": xp.EmbedType.binary,
        "audio/vnd.wave": xp.EmbedType.binary,
        "audio/webm": xp.EmbedType.binary,
        "image/gif": xp.EmbedType.binary,
        "image/jpeg": xp.EmbedType.binary,
        "image/pjpeg": xp.EmbedType.binary,
        "image/png": xp.EmbedType.binary,
        "image/bmp": xp.EmbedType.binary,
        "image/svg+xml": xp.EmbedType.utf8,
        "image/tiff": xp.EmbedType.binary,
        "text/css": xp.EmbedType.utf8,
        "text/csv": xp.EmbedType.utf8,
        "text/html": xp.EmbedType.utf8,
        "text/javascript": xp.EmbedType.utf8,
        "text/plain": xp.EmbedType.utf8,
        "text/rtf": xp.EmbedType.utf8,
        "text/vcard": xp.EmbedType.utf8,
        "text/xml": xp.EmbedType.utf8,
        "video/avi": xp.EmbedType.binary,
        "video/mpeg": xp.EmbedType.binary,
        "video/mp4": xp.EmbedType.binary,
        "video/ogg": xp.EmbedType.binary,
        "video/quicktime": xp.EmbedType.binary,
        "video/webm": xp.EmbedType.binary,
        "application/typescript": xp.EmbedType.utf8,
        "application/ecmascript": xp.EmbedType.utf8,
        "application/json": xp.EmbedType.utf8,
        "application/javascript": xp.EmbedType.utf8,
        "application/octet-stream": xp.EmbedType.binary,
        "application/pdf": xp.EmbedType.binary,
        "application/xml": xp.EmbedType.utf8,
        "application/zip": xp.EmbedType.binary,
        "application/gzip": xp.EmbedType.binary
    };
})(xp || (xp = {}));
'use strict';
module.exports = function (grunt) {
    grunt.registerMultiTask("embed", function () {
        var fs = require('fs');
        var path = require('path');
        var mime = require('mime');
        var strip = require('strip-comments');
        var done = this.async();
        if (this.files[0].src.length == 0) {
            grunt.log.error('grunt-ts-embed: No files to process');
            done();
            return;
        }
        var taskOptions = this.data;
        var outFile = taskOptions.out || 'ts-embed.ets';
        var embedFiles = [];
        var embedDiskMap = {};
        var diskPos = 0;
        var currentFile = 0;
        var gruntFiles = this.files[0].src;
        var numFileToProcess = 0;
        gruntFiles.forEach(parseSourceFile);
        numFileToProcess = embedFiles.length;
        embedFiles.forEach(processDiskMapFile);
        if (numFileToProcess == 0) {
            grunt.log.error('grunt-ts-embed: No files to process');
            done();
            return;
        }
        var jsonDiskMap = JSON.stringify(embedDiskMap);
        var jsonDiskMapBuffer = new Buffer(jsonDiskMap, "utf-8");
        var headerSize = jsonDiskMapBuffer.length;
        var mainHeader = new Buffer([
            headerSize >> 24 & 255,
            headerSize >> 16 & 255,
            headerSize >> 8 & 255,
            headerSize >> 0 & 255
        ]);
        var outStream = fs.createWriteStream(outFile, {
            flags: "w",
            encoding: null,
            mode: 438
        });
        outStream.write(mainHeader);
        outStream.write(jsonDiskMapBuffer);
        concatFiles();
        function concatFiles() {
            if (currentFile != numFileToProcess) {
                merge(embedFiles[currentFile].path, concatFiles);
                currentFile++;
                return;
            }
            grunt.log.ok('grunt-ts-embed: Completed embedding assets into', outFile);
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
            inStream.pipe(outStream, { end: false });
        }
        ;
        function parseSourceFile(file) {
            var fileContents = strip(grunt.file.read(file));
            var lines = fileContents.match(/[^\r\n]+/g);
            if (!lines)
                return;
            var filePath = path.dirname(file);
            lines.forEach(function (line, i) {
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
        function evalEmbedOptions(options) {
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
        function processDiskMapFile(file) {
            var fileSize = fs.statSync(file.path).size;
            var mimeType = file.mime ? file.mime : mime.lookup(file.path) || "application/octet-stream";
            var format = xp.EmbedMimeMap[mimeType] || xp.EmbedType.binary;
            embedDiskMap[PJWHash(file.src)] = {
                src: file.src,
                format: format,
                mime: mimeType,
                start: diskPos,
                length: fileSize
            };
            if (file.symbol)
                embedDiskMap[PJWHash(file.src)].symbol = file.symbol;
            diskPos += fileSize;
        }
        function PJWHash(str) {
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
        }
        ;
    });
};
/// <reference path="grunt-ts-embed.ts" />
/// <reference path="typings/node/node.d.ts" />
