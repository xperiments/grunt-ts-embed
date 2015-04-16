# grunt-ts-embed

A grunt multitask plugin that processes @embed decorators and generates the corresponding library**.tse**.

## Requirements

* [ts-embed](https://github.com/xperiments/ts-embed) utils to load the generated **.tse** files

## Installation
~~~sh
$> npm install grunt-ts-embed --save-dev
~~~
    
## Usage example
~~~js
grunt.initConfig({
    demo: {
        src: ['./demo/**/*.ts'],
        out:'./demo/bin/embedOutput.tse'
    }
});
grunt.loadNpmTasks('grunt-ts-embed');
~~~
