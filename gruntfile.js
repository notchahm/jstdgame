module.exports = function (grunt) {
  'use strict';
  
  var m_source_files = {
    app: ['app/*.js'],
    test: ['test/*.test.js'],
    vendor: [
      'public/vendor/js/jquery.js',
      'public/vendor/js/three.js'
    ]
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    
    jshint: {
      options: {
        jshintrc: true
      },
      all: [
        m_source_files.app,
        m_source_files.test
      ]
    },

    uglify: {
      vendor: {
        files: {
          'public/dist/js/vendor.min.js': m_source_files.vendor
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

    watch: {
      files: '*/*.js',
      tasks: ['jshint', 'shell:test']
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

      copyVendor: {
        command: [
          'cp bower_components/jquery/dist/jquery.js public/vendor/js',
          'cp bower_components/threejs/build/three.js public/vendor/js'
        ].join('&&')
      },

      test: {
        command: 'mocha'
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
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-imagemin");

  grunt.registerTask("default", [
    "jshint",
    "shell:test",
  ]);

  grunt.registerTask("build", [
    "shell:clean",
    "shell:makeStructure",
    "shell:bowerInstall",
    "shell:copyVendor",
    "uglify:vendor",
    "imagemin:production"
  ]);

};
