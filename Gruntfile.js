/**
 * Created by xperiments on 01/04/15.
 */
module.exports = function (grunt) {


    grunt.initConfig(
        {
            ts: {
                build: {
                    src: ["./src/**/*.ts"],
                    reference: "./src/reference.ts",  // If specified, generate this file that you can use for your reference management
                    out: './tasks/grunt-ts-embed.js',
                    options: {                         // use to override the default options, http://gruntjs.com/configuring-tasks#options
                        target: 'es5',                 // 'es3' (default) | 'es5'
                        module: 'commonjs',            // 'amd' (default) | 'commonjs'
                        sourceMap: false,               // true (default) | false
                        declaration: false,            // true | false (default)
                        removeComments: true,           // true (default) | false
                        fast: "never"
                    }

                }
            },
            watch: {
                ts: {
                    files: ['./ts/**/*.ts'],
                    tasks: ['ts:build']
                }
            }
        });
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask("default", ["typescript","watch"]);
    grunt.registerTask("typescript", ["ts:build"]);
}