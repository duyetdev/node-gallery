Node Gallery
============

NodeJS Photo Gallery built on Express 4.  
Feed it a directory of photos, get back a JSON object & a styled photo gallery ready for the web.  

* No database needed
* Strictly no frills
* Folders titles => Album titles
* Image titles => Photo Titles
* EXIF title => Description
* Displays camera capture info (exposure, aperture, ISO..)

Installation
============

    $ npm install --save node-gallery
    
Usage    
=====
Node gallery can be used standalone, or in an existing node.js application. The example code has support for the Openshift and Heroku PaaS. 

## In Existing Applications
Node Gallery exposes express style middleware, meaning it can be mounted to any route within your application.

    /*
    @param {string, required} staticFiles The directory where your album starts - can contain photos or images
    @param {string, required} urlRoot The root URL which you pass into the epxress router in app.use (no way of obtaining this otherwise)
    @param {string, optional} title Yup, you guessed it - the title to display on the root gallery
    @param {boolean, optional} render Default to true. If explicitly set to false, rendering is left to the next function in the chain - see below. 
    @param {string, optional} thumbnail.width Thumbnail image width, defaults '200'
    @param {string, optional} thumbnail.height as above
    @param {string, optional} image.width Large images width defaults '100%'
    @param {string, optional} image.height as above
    */
    app.use('/gallery', require('node-gallery')({
      staticFiles : 'resources/photos',
      urlRoot : 'gallery', 
      title : 'Example Gallery'
    }));

Now, you can access the gallery by going to your application's url /gallery - in the case of our example, http://localhost:3000/gallery. 

### Providing Views
The middleware renders the views in the `views` directory by default, but you can override this behavior & provide your own view rendering by setting `render` to false.  
When this happens, the gallery HTML is returned in `req.html`, the raw JSON data in `req.data`. 

    app.use('/gallery', require('node-gallery')({
      staticFiles : 'resources/photos',
      urlRoot : 'gallery', 
      title : 'Example Gallery',
      render : false
    }), function(req, res, next){
      /*
       We MUST add another middleware function to the chain when render is false. 
       just return the raw HTML data - we could partial into another template here,
       pass the JSON data into a template
       */
      return res.send(req.html);
    });


For a more detailed example, see [examples/app.js](examples/app.js).


### Middleware Routes
There are three main routes exposed under whatever root directory you provide.  
  
To receive **JSON Responses** rather than a rendered HTML page, just send an `accept: application/json` header. 

**Album Pages**  

    /:albumName/      
    /:albumName/:subalbum  
    /:albumName/:subalbum/:anothersubalbum  


**Photo Pages**  
    
    /:albumName/photo/:photoName
    /:albumName/:subalbum/photo/:photoName
    
**Image Files**  
    
    /:albumName/:subAlbum/:photoname.(png|jpg|tif|jpeg|gif)
    
## Running Standalone
Node Gallery can be run standalone for testing.
Modify [examples/app.js](examples/app.js) to your liking, then add your albums & images to `examples/resources/photos` & run using:
    
	cd example
	npm install -d 
	node app.js
	

Examples
===================
Node Gallery with out-of-the-box configuration is deployed to Heroku - [see it here.](http://nodegallery.herokuapp.com/gallery)  

A basic usage example showing how to use node-gallery with Express can be found in [examples/basic.js](examples/basic.js).  
  
A more advanced example, showing how to take control of the rendering of your pages is shown in [examples/app.js](examples/app.js).  
  
To try these examples:
    
    cd examples
    npm install -d
    node app.js # or node basic.js
    

Photos
===================
Photos are added to your specified `staticFiles` directory. Albums are created for every folder we encounter, and thumbnails are automatically generated by using the first image we come across in this album.  

Tests
============
Tests are written in raw javascript. To run,

    $ npm test

ImageMagick
===========
Node Gallery does require ImageMagick. Installation instructions for mac can be found at: http://www.imagemagick.org/script/binary-releases.php#macosx  
  
For windows:

1. Select imagemagick installer for your system, e.g., http://sourceforge.net/projects/imagemagick/files/6.8.9-exes/ImageMagick-6.8.9-4-Q16-x64-dll.exe/download
2. Install imagemagick
3. Make sure that imagemagick tools are available on system path (e.g., you can test if you can run "convert.exe" from CMD)
4. Restart cygwin, CMD or whatever you use to fire up node.js


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/duyetdev/node-gallery/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

