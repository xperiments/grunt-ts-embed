/// <reference path="../es6-promise/es6-promise.d.ts" />
declare module ts {
    interface EmbedDiskMap {
        [key: string]: EmbedDiskFile;
    }
    interface EmbedDiskFile {
        format: string;
        mime: string;
        start: number;
        length: number;
        content: string | Uint8Array;
    }
    enum EmbedDecompressor {
        binary = 0,
        utf8 = 1,
        ascii = 2,
    }
    class EmbedLoader {
        url: string;
        private _xhr;
        private _loadBind;
        private _resolve;
        private _reject;
        private _promise;
        load(url: string): Promise<EmbedDiskMap>;
        private _onLoad();
    }
    module Embed {
        function HTMLImageElement(params: IEmbedParams): any;
        function HTMLScriptElement(params: IEmbedParams): any;
        function HTMLStyleElement(params: IEmbedParams): any;
        function getDataURL(file: EmbedDiskFile): string;
    }
    class EmbedUtils {
        static getFile(src: string): EmbedDiskFile;
        static assign(embedParams: IEmbedParams, proto: any, propertyName: string): void;
        static processFile(data: ArrayBuffer): EmbedDiskMap;
        static UTF8ArrayToString(array: Uint8Array): string;
        static Uint8ArrayToBase64(aBytes: Uint8Array): string;
        protected static MAP: EmbedDiskMap;
        protected static decompressFormat: any;
        protected static assingProperties: IEmbedDecoratorParams[];
        protected static readAscii(data: ArrayBuffer, file: EmbedDiskFile): void;
        protected static readBinary(data: ArrayBuffer, file: EmbedDiskFile): void;
        protected static readUTF8(data: ArrayBuffer, file: EmbedDiskFile): void;
        protected static extractBuffer(src: ArrayBuffer, offset: any, length: any): Uint8Array;
        protected static unpack(key: string, data: ArrayBuffer, diskMapObject: EmbedDiskMap): void;
        protected static PJWHash(str: string): number;
    }
}
interface IEmbedDecompressor {
    (params: IEmbedParams): any;
}
interface IEmbedParams {
    src: string;
    as?: IEmbedDecompressor;
    symbol?:string;

}
interface IEmbedDecoratorParams {
    params: IEmbedParams;
    proto: any;
    propertyName: string;
    processed: boolean;
}
declare function embed(embedParams: IEmbedParams): PropertyDecorator;
