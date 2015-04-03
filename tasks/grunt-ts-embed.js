var Embed = {};
var io;
(function (io) {
    var xperiments;
    (function (xperiments) {
        var ts;
        (function (ts) {
            (function (EmbedTypes) {
                EmbedTypes[EmbedTypes["binary"] = 0] = "binary";
                EmbedTypes[EmbedTypes["utf8"] = 1] = "utf8";
                EmbedTypes[EmbedTypes["ascii"] = 2] = "ascii";
            })(ts.EmbedTypes || (ts.EmbedTypes = {}));
            var EmbedTypes = ts.EmbedTypes;
            ts.EmbedMimeMap = {
                "application/octet-stream": 0 /* binary */,
                "text/xml": 1 /* utf8 */,
                "text/html": 1 /* utf8 */,
                "text/plain": 1 /* utf8 */,
                "text/css": 1 /* utf8 */,
                "application/javascript": 1 /* utf8 */,
                "image/svg+xml": 1 /* utf8 */,
                "image/png": 0 /* binary */,
                "image/jpeg": 0 /* binary */,
                "image/gif": 0 /* binary */,
                "application/pdf": 0 /* binary */
            };
        })(ts = xperiments.ts || (xperiments.ts = {}));
    })(xperiments = io.xperiments || (io.xperiments = {}));
})(io || (io = {}));
'use strict';
module.exports = function (grunt) {
    grunt.registerMultiTask("embed", function () {
        var done = this.async();
        if (this.files[0].src.length == 0) {
            grunt.log.error('grunt-ts-embed: No files to processs');
            done();
            return;
        }
        var fs = require('fs');
        var path = require('path');
        var mime = require('mime');
        var outFile = this.data.out || 'ts-embed.ets';
        var fileSrcs = [];
        var diskMap = {};
        var diskPos = 0;
        var count = 0;
        this.files[0].src.forEach(parseSourceFile);
        fileSrcs.forEach(processDiskMapFile);
        if (fileSrcs.length == 0) {
            grunt.log.error('grunt-ts-embed: No files to processs');
            done();
            return;
        }
        var jsonDiskMap = JSON.stringify(diskMap);
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
        var todo = fileSrcs.length;
        rmerge();
        function rmerge() {
            if (count != todo) {
                merge(fileSrcs[count].path, rmerge);
                count++;
                return;
            }
            grunt.log.ok('grunt-ts-embed: Completed embeding assets into', outFile);
            done(true);
        }
        function parseSourceFile(file) {
            var fileContents = grunt.file.read(file);
            var lines = fileContents.match(/[^\r\n]+/g);
            var filePath = path.dirname(file);
            lines.forEach(function (line, i) {
                var hasEmbed = /@embed[\s]?\([\s]?(.*)[\s]?\)/.test(line);
                if (hasEmbed) {
                    var embedObj = null;
                    var embedOptions = /@embed[\s]?\([\s]?(.*)[\s]?\)/.exec(line)[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').replace((/'/g), "\"");
                    try {
                        eval("embedObj=" + embedOptions);
                    }
                    catch (e) {
                        grunt.log.error('ERROR parsing embed object: ', embedOptions);
                    }
                    if (embedObj) {
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
            });
        }
        function processDiskMapFile(file) {
            var fileSize = fs.statSync(file.path).size;
            diskMap[PJWHash(file.src)] = {
                format: (file.format || io.xperiments.ts.EmbedMimeMap[mime.lookup(file.path)] || 0 /* binary */),
                mime: mime.lookup(file.path) || "application/octet-stream",
                start: diskPos,
                length: fileSize
            };
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
    });
};
