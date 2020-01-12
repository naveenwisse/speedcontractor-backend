module.exports = function(grunt) {

    grunt.initConfig({
        eslint: {
            target: [
                'server.js',
                'app/**/*.js'
            ]
        },
        watch: {
            express: {
                files: [
                    'server.js',
                    'app/**/*.js'
                ],
                tasks: ['eslint', 'express:server'],
                options: {
                    spawn: false
                }
            }
        },
        express: {
            server: {
                options: {
                    script: 'server.js',
                    port: 8080
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');

    grunt.registerTask('server', ['default']);
    grunt.registerTask('default', ['eslint', 'express:server', 'watch']);
};
