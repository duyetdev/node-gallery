var fs = require('fs'),
exif = require('./exif.js'),
walk = require('walk'),
util = require('util');

var gallery = {
  /*
   * Directory where the photos are contained
   */
  directory : undefined,

  /*
   * Optional static directory to prefix our directory references with
   * This won't get output in templates - only needed if we've defined a static
   * directory in a framework like express.
   */
  static: undefined,


  /*
   * root URL of the gallery - defaults to root, or '' - NOT '/'
   * an example would be '/gallery', NOT '/gallery/'
   * This has no reflection on where the static assets are stored
   * it's just where our gallery lies in a URL router
   */
  rootURL: '',

  /*
   * Our constructed album JSON lives here
   */
  album: undefined,
  /*
   * Name of our gallery
   */
  name: 'Photo Gallery',

  /*
   * Image to display when no thumbnail could be located
   */
  noThumbnail: '', // TODO: Bundle a default no thumbnail image?
  /*
   * Filter string to use for excluding filenames. Defaults to a regular expression that excludes dotfiles.
   */
  filter: /^Thumbs.db|^\.[a-zA-Z0-9]+/,
  /*
   * Private function to walk a directory and return an array of files
   */
  readFiles: function(params, cb){
    var files   = [],
    directoryPath = (this.static) ? this.static + "/" + this.directory : this.directory,
    me = this;


    var walker  = walk.walk(directoryPath, { followLinks: false });

    walker.on("directories", function (root, dirStatsArray, next) {
      // dirStatsArray is an array of `stat` objects with the additional attributes
      // * type
      // * error
      // * name

      next();
    });



    walker.on('file', function(root, stat, next) {
      if (stat.name.match(me.filter) != null){
        return next();
      }

      // Make the reference to the root photo have no ref to this.directory
      var rootlessRoot = root.replace(directoryPath + "/", "");
      rootlessRoot = rootlessRoot.replace(directoryPath, "");

      var file = {
        type: stat.type,
        name: stat.name,
        root: rootlessRoot
      };

      files.push(file);
      return next();

    });

    walker.on('end', function() {
      return cb(null, files);
    });
  },
  /*
   * Private function to build an albums object from the files[] array
   */
  buildAlbums: function(files, cb){
    var albums = {
      name: this.name,
      root: true,
      path: this.directory,
      photos: [],
      albums: []
    },
    dirHash = {};
    for (var i=0; i<files.length; i++){
      // Process a single file
      var file = files[i],
      dirs = file.root.split("/"),
      dirHashKey = "",
      curAlbum = albums; // reset current album to root at each new file

      // Iterate over it's directory path, checking if we've got an album for each
      // ""!==dirs[0] as we don't want to iterate if we have a file that is a photo at root
      for (var j=0; j<dirs.length && dirs[0]!==""; j++){
        var curDir = dirs[j];
        dirHashKey += curDir;


        if (!dirHash.hasOwnProperty(dirHashKey)){
          // If we've never seen this album before, let's create it
          var currentAlbumPath = dirs.slice(0, j+1).join('/'); // reconstruct the current path with the path slashes
          dirHash[dirHashKey] = true // TODO - consider binding the album to this hash, and even REDIS-ing..

          var newAlbum = {
            name: curDir,
            hash: dirHashKey,
            path: currentAlbumPath,
            photos: [],
            albums: []
          };

          curAlbum.albums.push(newAlbum);
          curAlbum = newAlbum;
        }else{
          // we've seen this album, we need to drill into it
          // search for the right album & update curAlbum
          var curAls = curAlbum.albums;
          for (var k=0; k<curAls.length; k++){
            var al = curAls[k];
            if (al.hash === dirHashKey){
              curAlbum = al;
              break;
            }
          }
        }
      }

      var photoName = file.name.replace(/.[^\.]+$/, "");
      var photo = {
        name: photoName,
        path: file.root + '/' + file.name
      };

      //curAlbum.photos.push(photo);

      // we have a photo object - let's try get it's exif data. We've
      // already pushed into curAlbum, no rush getting exif now!
      // Create a closure to give us scope to photo
      (function(photo, curAlbum){
        var fullPath = gallery.directory + "/" + photo.path;
        fullPath = (gallery.static) ? gallery.static + "/" + fullPath: fullPath;

        exif(fullPath, photo, function(err, exifPhoto){
          // no need to do anything with our result - we've altered
          // the photo object..
        });
      })(photo, curAlbum);
      curAlbum.photos.push(photo);
    }


    // Function to iterate over our completed albums, calling _buildThumbnails on each
    function _recurseOverAlbums(al){
      al.thumb = _buildThumbnails(al);
      if (al.albums.length>0){
        for (var i=0; i<al.albums.length; i++){
          _recurseOverAlbums(al.albums[i]);
        }
      }
    }

    var me = this;

    function _buildThumbnails(album){
      var photoChildren = album.photos,
      albumChildren = album.albums;

      if (photoChildren.length && photoChildren.length>0){
        return photoChildren[0].path;
      }else{
        if (albumChildren.length && albumChildren.length>1){
          return _buildThumbnails(albumChildren[0]);
        }else{
          // TODO: No image could be found
          return me.noThumbnail;
        }
      }
    }

    _recurseOverAlbums(albums);

    return cb(null, albums);
  },
  /*
   * Public API to node-gallery, currently just returns JSON block
   */
  init: function(params, cb){
    var me =  this,
    directory = params.directory,
    staticDir = params.static;

    // Massage our static directory and directory params into our expected format
    // might be easier by regex..
    if (staticDir.charAt(0)==="/"){
      staticDir = staticDir.substring(1, staticDir.length);
    }
    if (directory.charAt(0)==="/"){
      directory = directory.substring(1, directory.length);
    }
    if (directory.charAt(directory.length-1)==="/"){
      directory.substring(0, directory.length-1); // yes length-1 - .lenght is the full string remember
    }
    if (staticDir.charAt(staticDir.length-1)==="/"){
      staticDir.substring(0, staticDir.length-1); // yes length-1 - .lenght is the full string remember
    }
    this.rootURL = params.rootURL;
    this.directory = directory;
    this.static = staticDir;
    this.name = params.name || this.name;


    this.filter = params.filter || this.filter;

    this.readFiles(null, function(err, files){
      if (err){
        return cb(err);
      }

      me.buildAlbums(files, function(err, album){
        me.album = album;
        return cb(err, album);
      })
    });
  },
  /*
   * Returns a photo. Usage:
   * getPhoto({ photo: 'test.jpg', album: 'Ireland'}, function(err, photo){
   *   console.log(photo.path);
   * );
   */
  getPhoto: function(req, cb){
    // bind the album name to the request
    var params = req.params,
    photoName = params.photo.replace(/.[^\.]+$/, ""), // strip the extension
    albumPath = params.album;
    this.getAlbum(req, function(err, data){
      if (err){
        return cb(err);
      }
      var album = data.album;
      var photos = album.photos;
      for (var i=0; i<photos.length; i++){
        var photo = photos[i];
        if (photo.name===photoName){

          return gallery.afterGettingItem(null, {type: 'photo', photo: photo}, cb);
        }
      }

      return cb('Failed to load photo ' + photoName + ' in album ' + albumPath, null);
    });
  },
  /*
   * Function to return a specific album. Usage:
   * gallery.getAlbum({ album: 'Ireland/Waterford', function(err, album){
   *   console.log(album.path);
   * });
   */
  getAlbum: function(req, cb){
    var params = req.params || {},
    album = this.album,
    albumPath = params.album;

    if (!albumPath || albumPath==''){
      //return cb(null, album);
      return this.afterGettingItem(null, {type: 'album', album: album}, cb);
    }

    var dirs = albumPath.split('/');


    for (var i=0; i<dirs.length; i++){
      var dir = dirs[i];
      var aChildren = album.albums;
      for (var j=0; j<aChildren.length; j++){
        var aChild = aChildren[j];
        if (aChild.name === dir){
          album = aChild;
        }
      }
    }
    if (album.hash !== albumPath.replace(/\//g, "")){
      return cb('Failed to load album ' + albumPath, null);
    }
    return this.afterGettingItem(null, {type: 'album', album: album}, cb);

  },
  /*
   * Private function which massages the return type into something useful to a website.
   * Builds stuff like a breadcrumb, back URL..
   */
  afterGettingItem: function(err, data, cb){
    var item = data[data.type];
    var breadcrumb = item.path.split("/");
    var back = data.back = breadcrumb.slice(0, item.path.split("/").length-1).join("/"); // figure out up a level's URL

    // Construct the breadcrumb better.
    data.breadcrumb = [];
    var breadSoFar = "" + this.rootURL + "";
    // Add a root level to the breadcrumb
    data.breadcrumb.push({name: this.name, url: this.rootURL});
    for (var i=0; i<breadcrumb.length; i++){
      var b = breadcrumb[i];
      breadSoFar += "/" + breadcrumb[i];

      data.breadcrumb.push({
        name: breadcrumb[i],
        url: breadSoFar
      });
    }

    data.name = this.name;
    data.directory= this.directory;
    data.root = this.rootURL;

    return cb(err, data);
  },
  /*
   * TODO: Deprecate this / bring into middleware
   */
  request: function(req, callback){
    if (req && req.params && req.params.photo){
      this.getPhoto(req, callback);
    }else{
      this.getAlbum(req, callback);
    }
  }
};

module.exports = gallery;