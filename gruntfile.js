module.exports = function (grunt) {
  'use strict';
  
  var _src = {
    vendor: ['public/vendor/js/jquery.js']
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    
    uglify: {
      vendor: {
        files: {
          'public/dist/js/vendor.min.js': _src.vendor
        }
      }
    },

    imagemin: {
      production: {
        files: [{
          expand: true,
          cwd: 'public/img/',
          src: ['*.png'],
          dest: 'public/dist/img/'
        }]
      }
    },

    shell: {
      bowerInstall: {
        command: 'bower install'
      },

      makeStructure: {
        command: [
          'mkdir -p public/vendor/js',
          'mkdir -p public/dist/js',
          'mkdir -p public/dist/img'
        ].join('&&')
      },

      copyJquery: {
        command: [
          'cp bower_components/jquery/dist/jquery.js public/vendor/js'
        ].join('&&')
      },

      clean: {
        command: [
          'rm -rf public/vendor',
          'rm -rf public/dist'
        ].join('&&')
      }
    }
  });

  grunt.loadNpmTasks("grunt-shell");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-imagemin");

  grunt.registerTask("build", [
    "shell:clean",
    "shell:makeStructure",
    "shell:bowerInstall",
    "shell:copyJquery",
    "uglify:vendor",
    "imagemin:production"
  ]);

};
