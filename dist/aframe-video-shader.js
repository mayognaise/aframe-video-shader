/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var _inlineVideo = __webpack_require__(1);

	if (typeof AFRAME === 'undefined') {
	  throw 'Component attempted to register before AFRAME was available.';
	}

	/* get util from AFRAME */
	var parseUrl = AFRAME.utils.srcLoader.parseUrl;
	var debug = AFRAME.utils.debug;
	// debug.enable('shader:video:*')

	debug.enable('shader:video:warn');
	var warn = debug('shader:video:warn');
	var log = debug('shader:video:debug');

	/* store data so that you won't load same data */
	var videoData = {};

	var effect = 0;

	/* create error message */
	function createError(err, src) {
	  return { status: 'error', src: src, message: err, timestamp: Date.now() };
	}

	AFRAME.registerShader('video', {

	  /**
	   * For material component:
	   * @see https://github.com/aframevr/aframe/blob/60d198ef8e2bfbc57a13511ae5fca7b62e01691b/src/components/material.js
	   * For example of `registerShader`:
	   * @see https://github.com/aframevr/aframe/blob/41a50cd5ac65e462120ecc2e5091f5daefe3bd1e/src/shaders/flat.js
	   * For MeshBasicMaterial
	   * @see http://threejs.org/docs/#Reference/Materials/MeshBasicMaterial
	   */

	  schema: {

	    /* For material */
	    color: { type: 'color' },
	    fog: { default: true },

	    /* For texuture */
	    src: { default: null },
	    autoplay: { default: true },
	    preload: { default: true },
	    muted: { default: true },
	    loop: { default: true },
	    fps: { default: 60 },
	    volume: { default: undefined }

	  },

	  /**
	   * Initialize material. Called once.
	   * @protected
	   */
	  init: function init(data) {

	    log('init', data);
	    log(this.el.components);
	    this.__cnv = document.createElement('canvas');
	    this.__cnv.width = 2;
	    this.__cnv.height = 2;
	    this.__ctx = this.__cnv.getContext('2d');
	    this.__texture = new THREE.Texture(this.__cnv);
	    this.__reset();
	    this.material = new THREE.MeshBasicMaterial({ map: this.__texture });
	    this.el.sceneEl.addBehavior(this);
	    // this.__addPublicFunctions() /* [TODO] ask how to get shader from `a-entity` element */
	    return this.material;
	  },


	  /**
	   * Update or create material.
	   * @param {object|null} oldData
	   */
	  update: function update(oldData) {

	    /* if desktop, change shader with `flat` */
	    // if (!AFRAME.utils.isMobile()) {
	    //   const material = Object.assign({}, this.el.getAttribute('material'), { shader: 'flat' })
	    //   this.el.removeAttribute('material')
	    //   setTimeout(() => {
	    //     this.el.setAttribute('material', material)
	    //   }, 0)
	    //   return
	    // }

	    log('update', oldData);
	    this.__updateMaterial(oldData);
	    this.__updateTexture(oldData);
	    return this.material;
	  },


	  /**
	   * Called on each scene tick.
	   * @protected
	   */
	  tick: function tick(t) {

	    log('tick');

	    if (this.__paused || !this.__canvasVideo) {
	      return;
	    }
	    this.__canvasVideo.tick();
	  },


	  /*================================
	  =            material            =
	  ================================*/

	  /**
	   * Updating existing material.
	   * @param {object} data - Material component data.
	   */
	  __updateMaterial: function __updateMaterial(data) {
	    var material = this.material;

	    var newData = this.__getMaterialData(data);
	    Object.keys(newData).forEach(function (key) {
	      material[key] = newData[key];
	    });
	  },


	  /**
	   * Builds and normalize material data, normalizing stuff along the way.
	   * @param {Object} data - Material data.
	   * @return {Object} data - Processed material data.
	   */
	  __getMaterialData: function __getMaterialData(data) {
	    return {
	      fog: data.fog,
	      color: new THREE.Color(data.color)
	    };
	  },


	  /*==============================
	  =            texure            =
	  ==============================*/

	  /**
	   * set texure
	   * @private
	   * @param {Object} data
	   * @property {string} status - success / error
	   * @property {string} src - src url
	   * @property {Object} canvasVideo - response from inline-video.js
	   * @property {Date} timestamp - created at the texure
	   */

	  __setTexure: function __setTexure(data) {
	    log('__setTexure', data);
	    if (data.status === 'error') {
	      warn('Error: ' + data.message + '\nsrc: ' + data.src);
	      this.__reset();
	    } else if (data.status === 'success' && data.src !== this.__textureSrc) {
	      this.__reset();
	      /* Texture added or changed */
	      this.__ready(data);
	    }
	  },


	  /**
	   * Update or create texure.
	   * @param {Object} data - Material component data.
	   */
	  __updateTexture: function __updateTexture(data) {
	    var src = data.src;
	    var autoplay = data.autoplay;
	    var muted = data.muted;
	    var volume = data.volume;
	    var loop = data.loop;
	    var fps = data.fps;

	    /* autoplay */

	    if (typeof autoplay === 'boolean') {
	      this.__autoplay = autoplay;
	    } else if (typeof autoplay === 'undefined') {
	      this.__autoplay = this.schema.autoplay.default;
	    }
	    if (this.__autoplay && this.__frames) {
	      this.play();
	    }

	    /* preload */
	    if (typeof preload === 'boolean') {
	      this.__preload = preload;
	    } else if (typeof preload === 'undefined') {
	      this.__preload = this.schema.preload.default;
	    }

	    /* muted */
	    this.__muted = true;
	    // if (typeof muted === 'boolean') { this.__muted = muted }
	    // else if (typeof muted === 'undefined') { this.__muted = this.schema.muted.default }

	    /* volume */
	    this.__volume = undefined;
	    // if (typeof volume === 'number') { this.__volume = volume }
	    // else if (typeof volume === 'undefined') { this.__volume = 0 }

	    /* loop */
	    this.__loop = true;
	    // if (typeof loop === 'boolean') { this.__loop = loop }
	    // else if (typeof loop === 'undefined') { this.__loop = this.schema.loop.default }

	    /* fps */
	    this.__fps = fps || this.schema.fps.default;

	    /* src */
	    if (src) {
	      this.__validateSrc(src, this.__setTexure.bind(this));
	    } else {
	      /* Texture removed */
	      this.__reset();
	    }
	  },


	  /*=============================================
	  =            varidation for texure            =
	  =============================================*/

	  __validateSrc: function __validateSrc(src, cb) {

	    /* check if src is a url */
	    var url = parseUrl(src);
	    if (url) {
	      this.__getVideoSrc(url, cb);
	      return;
	    }

	    var message = void 0;

	    /* check if src is a query selector */
	    var el = this.__validateAndGetQuerySelector(src);
	    if (!el || (typeof el === 'undefined' ? 'undefined' : _typeof(el)) !== 'object') {
	      return;
	    }
	    if (el.error) {
	      message = el.error;
	    } else {
	      var tagName = el.tagName.toLowerCase();
	      if (tagName === 'video') {
	        src = el.src;
	        this.__getVideoSrc(src, cb, el);
	      } else if (tagName === 'img') {
	        message = 'For <' + tagName + '> element, please use `shader:flat`';
	      } else {
	        message = 'For <' + tagName + '> element, please use `aframe-html-shader`';
	      }
	    }

	    /* if there is message, create error data */
	    if (message) {
	      (function () {
	        var srcData = videoData[src];
	        var errData = createError(message, src);
	        /* callbacks */
	        if (srcData && srcData.callbacks) {
	          srcData.callbacks.forEach(function (cb) {
	            return cb(errData);
	          });
	        } else {
	          cb(errData);
	        }
	        /* overwrite */
	        videoData[src] = errData;
	      })();
	    }
	  },


	  /**
	   * Validate src is a valid image url
	   * @param  {string} src - url that will be tested
	   * @param  {function} cb - callback with the test result
	   * @param  {VIDEO} el - video element
	   */
	  __getVideoSrc: function __getVideoSrc(src, cb, el) {

	    /* if src is same as previous, ignore this */
	    if (src === this.__textureSrc) {
	      return;
	    }

	    /* check if we already get the srcData */
	    var srcData = videoData[src];
	    if (!srcData || !srcData.callbacks) {
	      /* create callback */
	      srcData = videoData[src] = { callbacks: [] };
	      srcData.callbacks.push(cb);
	    } else if (srcData.src) {
	      cb(srcData);
	      return;
	    } else if (srcData.callbacks) {
	      /* add callback */
	      srcData.callbacks.push(cb);
	      return;
	    }

	    var options = {
	      autoplay: this.__autoplay,
	      preload: this.__preload,
	      muted: this.__muted,
	      volume: this.__volume,
	      loop: this.__loop,
	      fps: this.__fps,
	      canvas: this.__cnv,
	      context: this.__ctx,
	      render: this.__render.bind(this),
	      element: el
	    };

	    (0, _inlineVideo.inlineVideo)(src, options, function (err, canvasVideo) {

	      if (err) {
	        var _ret2 = function () {

	          /* create error data */
	          var errData = createError(err, src);
	          /* callbacks */
	          if (srcData.callbacks) {
	            srcData.callbacks.forEach(function (cb) {
	              return cb(errData);
	            });
	            /* overwrite */
	            videoData[src] = errData;
	          }
	          return {
	            v: void 0
	          };
	        }();

	        if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
	      }

	      /* store data */
	      var newData = { status: 'success', src: src, canvasVideo: canvasVideo, timestamp: Date.now() };
	      /* callbacks */
	      if (srcData.callbacks) {
	        srcData.callbacks.forEach(function (cb) {
	          return cb(newData);
	        });
	        /* overwrite */
	        videoData[src] = newData;
	      }
	    });
	  },


	  /**
	   * Query and validate a query selector,
	   *
	   * @param  {string} selector - DOM selector.
	   * @return {object} Selected DOM element | error message object.
	   */
	  __validateAndGetQuerySelector: function __validateAndGetQuerySelector(selector) {
	    try {
	      var el = document.querySelector(selector);
	      if (!el) {
	        return { error: 'No element was found matching the selector' };
	      }
	      return el;
	    } catch (e) {
	      // Capture exception if it's not a valid selector.
	      return { error: 'no valid selector' };
	    }
	  },


	  /*================================
	  =            playback            =
	  ================================*/

	  /**
	   * add public functions
	   * @private
	   */
	  __addPublicFunctions: function __addPublicFunctions() {
	    this.el.shader = {
	      play: this.play.bind(this),
	      pause: this.pause.bind(this),
	      togglePlayback: this.togglePlayback.bind(this),
	      paused: this.paused.bind(this),
	      nextFrame: this.nextFrame.bind(this)
	    };
	  },


	  /**
	   * Pause video
	   * @public
	   */
	  pause: function pause() {
	    log('pause');
	    this.__paused = true;
	    this.__canvasVideo && this.__canvasVideo.pause();
	  },


	  /**
	   * Play video
	   * @public
	   */
	  play: function play() {
	    log('play');
	    this.__paused = false;
	    this.__canvasVideo && this.__canvasVideo.play();
	  },


	  /**
	   * Toggle playback. play if paused and pause if played.
	   * @public
	   */

	  togglePlayback: function togglePlayback() {
	    if (this.paused()) {
	      this.play();
	    } else {
	      this.pause();
	    }
	  },


	  /**
	   * Return if the playback is paused.
	   * @public
	   * @return {boolean}
	   */
	  paused: function paused() {
	    return this.__paused;
	  },


	  /*==============================
	   =            canvas            =
	   ==============================*/

	  /**
	   * clear canvas
	   * @private
	   */
	  __clearCanvas: function __clearCanvas() {
	    this.__ctx.clearRect(0, 0, this.__width, this.__height);
	    this.__texture.needsUpdate = true;
	  },


	  /**
	   * draw
	   * @private
	   */
	  __draw: function __draw(video) {
	    this.__ctx.drawImage(video, 0, 0, this.__width, this.__height);
	    this.__texture.needsUpdate = true;
	  },


	  /**
	   * render
	   * @private
	   */
	  __render: function __render(video) {
	    this.__clearCanvas();
	    this.__draw(video);
	  },


	  /*============================
	  =            ready            =
	  ============================*/

	  /**
	   * setup video animation and play if autoplay is true
	   * @private
	   * @property {string} src - src url
	   * @property {Object} canvasVideo - response from inline-video.js
	   */
	  __ready: function __ready(_ref) {
	    var src = _ref.src;
	    var canvasVideo = _ref.canvasVideo;

	    log('__ready');
	    this.__textureSrc = src;
	    this.__width = this.__cnv.width;
	    this.__height = this.__cnv.height;
	    this.__canvasVideo = canvasVideo;
	    if (this.__autoplay) {
	      this.play();
	    } else {
	      this.pause();
	    }
	  },


	  /*=============================
	  =            reset            =
	  =============================*/

	  /**
	   * @private
	   */

	  __reset: function __reset() {
	    this.pause();
	    this.__clearCanvas();
	    this.__textureSrc = null;
	    this.__startTime = 0;
	    // this.__nextFrameTime = 0
	    // this.__frameIdx = 0
	    // this.__frameCnt = 0
	    // this.__delayTimes = null
	    // this.__infinity = false
	    // this.__loopCnt = 0
	    // this.__frames = null
	  }
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _runParallel = __webpack_require__(2);

	var _runParallel2 = _interopRequireDefault(_runParallel);

	var _mediaElement = __webpack_require__(4);

	var _mediaElement2 = _interopRequireDefault(_mediaElement);

	var _rightNow = __webpack_require__(8);

	var _rightNow2 = _interopRequireDefault(_rightNow);

	var _raf = __webpack_require__(9);

	var _raf2 = _interopRequireDefault(_raf);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/* get util from AFRAME */
	/**
	 * original data is by @Jam3
	 * @see https://github.com/Jam3/ios-video-test
	 */

	var debug = AFRAME.utils.debug;
	// debug.enable('shader:video:*')

	debug.enable('shader:video:warn');
	var warn = debug('shader:video:warn');
	var log = debug('shader:video:debug');

	var fallback = /i(Pad|Phone)/i.test(navigator.userAgent);
	// const fallback = true

	var noop = function noop() {};

	exports.inlineVideo = function (source, opt, cb) {
	  var autoplay = opt.autoplay;
	  var preload = opt.preload;
	  var muted = opt.muted;
	  var loop = opt.loop;
	  var fps = opt.fps;
	  var canvas = opt.canvas;
	  var context = opt.context;
	  var render = opt.render;
	  var element = opt.element;

	  var video = element || document.createElement('video');
	  var lastTime = (0, _rightNow2.default)();
	  var elapsed = 0;
	  var duration = Infinity;
	  var audio = void 0;

	  if (fallback) {

	    if (!opt.muted) {
	      audio = document.createElement('audio');
	      /* disable autoplay for this scenario */
	      opt.autoplay = false;
	    }

	    /* load audio and muted video */
	    (0, _runParallel2.default)([function (next) {
	      _mediaElement2.default.video(source, Object.assign({}, opt, {
	        muted: true,
	        element: video
	      }), next);
	    }, function (next) {
	      _mediaElement2.default.audio(source, Object.assign({}, opt, {
	        element: audio
	      }), next);
	    }], ready);
	  } else {
	    _mediaElement2.default.video(source, Object.assign({}, opt, {
	      element: video
	    }), ready);
	  }

	  /*=============================
	  =            ready            =
	  =============================*/

	  function ready(err) {
	    if (err) {
	      warn(err);
	      cb('Somehow there is error during loading video');
	      return;
	    }
	    canvas.width = THREE.Math.nearestPowerOfTwo(video.videoWidth);
	    canvas.height = THREE.Math.nearestPowerOfTwo(video.videoHeight);

	    if (fallback) {
	      video.addEventListener('timeupdate', drawFrame, false);
	      if (audio) {
	        audio.addEventListener('ended', function () {
	          if (loop) {
	            audio.currentTime = 0;
	          } else {
	            /**
	              TODO:
	              - add stop logic
	             */

	          }
	        }, false);
	      }
	    }

	    duration = video.duration;
	    (0, _raf2.default)(drawFrame);

	    var canvasVideo = {
	      play: play,
	      pause: pause,
	      tick: tick,
	      canvas: canvas,
	      video: video,
	      audio: audio,
	      fallback: fallback
	    };

	    cb(null, canvasVideo);
	  }

	  /*================================
	  =            playback            =
	  ================================*/

	  function play() {
	    lastTime = (0, _rightNow2.default)();
	    if (audio) audio.play();
	    if (!fallback) video.play();
	  }

	  function pause() {
	    if (audio) audio.pause();
	    if (!fallback) video.pause();
	  }

	  function tick() {
	    /* render immediately in desktop */
	    if (!fallback) {
	      return drawFrame();
	    }

	    /*
	     * in iPhone, we render based on audio (if it exists)
	     * otherwise we step forward by a target FPS
	     */
	    var time = (0, _rightNow2.default)();
	    elapsed = (time - lastTime) / 1000;
	    if (elapsed >= 1000 / fps / 1000) {
	      if (fallback) {
	        /* seek and wait for timeupdate */
	        if (audio) {
	          video.currentTime = audio.currentTime;
	        } else {
	          video.currentTime = video.currentTime + elapsed;
	        }
	      }
	      lastTime = time;
	    }

	    /**
	     * in iPhone, when audio is not present we need
	     * to track duration
	     */

	    if (fallback && !audio) {
	      if (Math.abs(video.currentTime - duration) < 0.1) {
	        /* whether to restart or just stop the raf loop */
	        if (loop) {
	          video.currentTime = 0;
	        } else {
	          /**
	            TODO:
	            - add stop logic
	           */
	        }
	      }
	    }
	  }

	  /*============================
	  =            draw            =
	  ============================*/

	  function drawFrame() {
	    render(video);
	  }
	};

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {module.exports = function (tasks, cb) {
	  var results, pending, keys
	  var isSync = true

	  if (Array.isArray(tasks)) {
	    results = []
	    pending = tasks.length
	  } else {
	    keys = Object.keys(tasks)
	    results = {}
	    pending = keys.length
	  }

	  function done (err) {
	    function end () {
	      if (cb) cb(err, results)
	      cb = null
	    }
	    if (isSync) process.nextTick(end)
	    else end()
	  }

	  function each (i, err, result) {
	    results[i] = result
	    if (--pending === 0 || err) {
	      done(err)
	    }
	  }

	  if (!pending) {
	    // empty
	    done(null)
	  } else if (keys) {
	    // object
	    keys.forEach(function (key) {
	      tasks[key](function (err, result) { each(key, err, result) })
	    })
	  } else {
	    // array
	    tasks.forEach(function (task, i) {
	      task(function (err, result) { each(i, err, result) })
	    })
	  }

	  isSync = false
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 3 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	/**
	 * original data is by @Jam3
	 * @see https://github.com/Jam3/ios-video-test
	 */

	function noop() {}

	var createSource = __webpack_require__(5);

	module.exports.video = simpleMediaElement.bind(null, 'video');
	module.exports.audio = simpleMediaElement.bind(null, 'audio');

	function simpleMediaElement(elementName, sources, opt, cb) {
	  if (typeof opt === 'function') {
	    cb = opt;
	    opt = {};
	  }
	  cb = cb || noop;
	  opt = opt || {};

	  if (!Array.isArray(sources)) {
	    sources = [sources];
	  }

	  var media = opt.element || document.createElement(elementName);

	  if (opt.loop) media.setAttribute('loop', true);
	  if (opt.muted) media.setAttribute('muted', 'muted');
	  if (opt.autoplay) media.setAttribute('autoplay', 'autoplay');
	  if (opt.preload) media.setAttribute('preload', opt.preload);
	  if (typeof opt.volume !== 'undefined') media.setAttribute('volume', opt.volume);
	  media.setAttribute('crossorigin', 'anonymous');
	  media.setAttribute('webkit-playsinline', '');

	  sources.forEach(function (source) {
	    media.appendChild(createSource(source));
	  });

	  process.nextTick(start);
	  return media;

	  function start() {
	    media.addEventListener('canplay', function () {
	      cb(null, media);
	      cb = noop;
	    }, false);
	    media.addEventListener('error', function (err) {
	      cb(err);
	      cb = noop;
	    }, false);
	    media.addEventListener('readystatechange', checkReadyState, false);
	    media.load();
	    checkReadyState();
	  }

	  function checkReadyState() {
	    if (media.readyState > media.HAVE_FUTURE_DATA) {
	      cb(null, media);
	      cb = noop;
	    }
	  }
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * original data is by @Jam3
	 * @see https://github.com/Jam3/ios-video-test
	 */

	var extname = __webpack_require__(6).extname;

	var mimeTypes = __webpack_require__(7);
	var mimeLookup = {};
	Object.keys(mimeTypes).forEach(function (key) {
	  var extensions = mimeTypes[key];
	  extensions.forEach(function (ext) {
	    mimeLookup[ext] = key;
	  });
	});

	module.exports = createSourceElement;
	function createSourceElement(src, type) {
	  var source = document.createElement('source');
	  source.src = src;
	  if (!type) type = lookup(src);
	  source.type = type;
	  return source;
	}

	function lookup(src) {
	  var ext = extname(src);
	  if (ext.indexOf('.') === 0) {
	    ext = mimeLookup[ext.substring(1).toLowerCase()];
	  }
	  if (!ext) {
	    throw new TypeError('could not determine mime-type from source: ' + src);
	  }
	  return ext;
	}

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// resolves . and .. elements in a path array with directory names there
	// must be no slashes, empty elements, or device names (c:\) in the array
	// (so also no leading and trailing slashes - it does not distinguish
	// relative and absolute paths)
	function normalizeArray(parts, allowAboveRoot) {
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = parts.length - 1; i >= 0; i--) {
	    var last = parts[i];
	    if (last === '.') {
	      parts.splice(i, 1);
	    } else if (last === '..') {
	      parts.splice(i, 1);
	      up++;
	    } else if (up) {
	      parts.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (allowAboveRoot) {
	    for (; up--; up) {
	      parts.unshift('..');
	    }
	  }

	  return parts;
	}

	// Split a filename into [root, dir, basename, ext], unix version
	// 'root' is just a slash, or nothing.
	var splitPathRe =
	    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
	var splitPath = function(filename) {
	  return splitPathRe.exec(filename).slice(1);
	};

	// path.resolve([from ...], to)
	// posix version
	exports.resolve = function() {
	  var resolvedPath = '',
	      resolvedAbsolute = false;

	  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
	    var path = (i >= 0) ? arguments[i] : process.cwd();

	    // Skip empty and invalid entries
	    if (typeof path !== 'string') {
	      throw new TypeError('Arguments to path.resolve must be strings');
	    } else if (!path) {
	      continue;
	    }

	    resolvedPath = path + '/' + resolvedPath;
	    resolvedAbsolute = path.charAt(0) === '/';
	  }

	  // At this point the path should be resolved to a full absolute path, but
	  // handle relative paths to be safe (might happen when process.cwd() fails)

	  // Normalize the path
	  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
	    return !!p;
	  }), !resolvedAbsolute).join('/');

	  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
	};

	// path.normalize(path)
	// posix version
	exports.normalize = function(path) {
	  var isAbsolute = exports.isAbsolute(path),
	      trailingSlash = substr(path, -1) === '/';

	  // Normalize the path
	  path = normalizeArray(filter(path.split('/'), function(p) {
	    return !!p;
	  }), !isAbsolute).join('/');

	  if (!path && !isAbsolute) {
	    path = '.';
	  }
	  if (path && trailingSlash) {
	    path += '/';
	  }

	  return (isAbsolute ? '/' : '') + path;
	};

	// posix version
	exports.isAbsolute = function(path) {
	  return path.charAt(0) === '/';
	};

	// posix version
	exports.join = function() {
	  var paths = Array.prototype.slice.call(arguments, 0);
	  return exports.normalize(filter(paths, function(p, index) {
	    if (typeof p !== 'string') {
	      throw new TypeError('Arguments to path.join must be strings');
	    }
	    return p;
	  }).join('/'));
	};


	// path.relative(from, to)
	// posix version
	exports.relative = function(from, to) {
	  from = exports.resolve(from).substr(1);
	  to = exports.resolve(to).substr(1);

	  function trim(arr) {
	    var start = 0;
	    for (; start < arr.length; start++) {
	      if (arr[start] !== '') break;
	    }

	    var end = arr.length - 1;
	    for (; end >= 0; end--) {
	      if (arr[end] !== '') break;
	    }

	    if (start > end) return [];
	    return arr.slice(start, end - start + 1);
	  }

	  var fromParts = trim(from.split('/'));
	  var toParts = trim(to.split('/'));

	  var length = Math.min(fromParts.length, toParts.length);
	  var samePartsLength = length;
	  for (var i = 0; i < length; i++) {
	    if (fromParts[i] !== toParts[i]) {
	      samePartsLength = i;
	      break;
	    }
	  }

	  var outputParts = [];
	  for (var i = samePartsLength; i < fromParts.length; i++) {
	    outputParts.push('..');
	  }

	  outputParts = outputParts.concat(toParts.slice(samePartsLength));

	  return outputParts.join('/');
	};

	exports.sep = '/';
	exports.delimiter = ':';

	exports.dirname = function(path) {
	  var result = splitPath(path),
	      root = result[0],
	      dir = result[1];

	  if (!root && !dir) {
	    // No dirname whatsoever
	    return '.';
	  }

	  if (dir) {
	    // It has a dirname, strip trailing slash
	    dir = dir.substr(0, dir.length - 1);
	  }

	  return root + dir;
	};


	exports.basename = function(path, ext) {
	  var f = splitPath(path)[2];
	  // TODO: make this comparison case-insensitive on windows?
	  if (ext && f.substr(-1 * ext.length) === ext) {
	    f = f.substr(0, f.length - ext.length);
	  }
	  return f;
	};


	exports.extname = function(path) {
	  return splitPath(path)[3];
	};

	function filter (xs, f) {
	    if (xs.filter) return xs.filter(f);
	    var res = [];
	    for (var i = 0; i < xs.length; i++) {
	        if (f(xs[i], i, xs)) res.push(xs[i]);
	    }
	    return res;
	}

	// String.prototype.substr - negative index don't work in IE8
	var substr = 'ab'.substr(-1) === 'b'
	    ? function (str, start, len) { return str.substr(start, len) }
	    : function (str, start, len) {
	        if (start < 0) start = str.length + start;
	        return str.substr(start, len);
	    }
	;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = {
		"audio/adpcm": [
			"adp"
		],
		"audio/basic": [
			"au",
			"snd"
		],
		"audio/midi": [
			"mid",
			"midi",
			"kar",
			"rmi"
		],
		"audio/mp4": [
			"mp4a",
			"m4a"
		],
		"audio/mpeg": [
			"mpga",
			"mp2",
			"mp2a",
			"mp3",
			"m2a",
			"m3a"
		],
		"audio/ogg": [
			"oga",
			"ogg",
			"spx"
		],
		"audio/s3m": [
			"s3m"
		],
		"audio/silk": [
			"sil"
		],
		"audio/vnd.dece.audio": [
			"uva",
			"uvva"
		],
		"audio/vnd.digital-winds": [
			"eol"
		],
		"audio/vnd.dra": [
			"dra"
		],
		"audio/vnd.dts": [
			"dts"
		],
		"audio/vnd.dts.hd": [
			"dtshd"
		],
		"audio/vnd.lucent.voice": [
			"lvp"
		],
		"audio/vnd.ms-playready.media.pya": [
			"pya"
		],
		"audio/vnd.nuera.ecelp4800": [
			"ecelp4800"
		],
		"audio/vnd.nuera.ecelp7470": [
			"ecelp7470"
		],
		"audio/vnd.nuera.ecelp9600": [
			"ecelp9600"
		],
		"audio/vnd.rip": [
			"rip"
		],
		"audio/webm": [
			"weba"
		],
		"audio/x-aac": [
			"aac"
		],
		"audio/x-aiff": [
			"aif",
			"aiff",
			"aifc"
		],
		"audio/x-caf": [
			"caf"
		],
		"audio/x-flac": [
			"flac"
		],
		"audio/x-matroska": [
			"mka"
		],
		"audio/x-mpegurl": [
			"m3u"
		],
		"audio/x-ms-wax": [
			"wax"
		],
		"audio/x-ms-wma": [
			"wma"
		],
		"audio/x-pn-realaudio": [
			"ram",
			"ra"
		],
		"audio/x-pn-realaudio-plugin": [
			"rmp"
		],
		"audio/x-wav": [
			"wav"
		],
		"audio/xm": [
			"xm"
		],
		"video/3gpp": [
			"3gp"
		],
		"video/3gpp2": [
			"3g2"
		],
		"video/h261": [
			"h261"
		],
		"video/h263": [
			"h263"
		],
		"video/h264": [
			"h264"
		],
		"video/jpeg": [
			"jpgv"
		],
		"video/jpm": [
			"jpm",
			"jpgm"
		],
		"video/mj2": [
			"mj2",
			"mjp2"
		],
		"video/mp2t": [
			"ts"
		],
		"video/mp4": [
			"mp4",
			"mp4v",
			"mpg4"
		],
		"video/mpeg": [
			"mpeg",
			"mpg",
			"mpe",
			"m1v",
			"m2v"
		],
		"video/ogg": [
			"ogv"
		],
		"video/quicktime": [
			"qt",
			"mov"
		],
		"video/vnd.dece.hd": [
			"uvh",
			"uvvh"
		],
		"video/vnd.dece.mobile": [
			"uvm",
			"uvvm"
		],
		"video/vnd.dece.pd": [
			"uvp",
			"uvvp"
		],
		"video/vnd.dece.sd": [
			"uvs",
			"uvvs"
		],
		"video/vnd.dece.video": [
			"uvv",
			"uvvv"
		],
		"video/vnd.dvb.file": [
			"dvb"
		],
		"video/vnd.fvt": [
			"fvt"
		],
		"video/vnd.mpegurl": [
			"mxu",
			"m4u"
		],
		"video/vnd.ms-playready.media.pyv": [
			"pyv"
		],
		"video/vnd.uvvu.mp4": [
			"uvu",
			"uvvu"
		],
		"video/vnd.vivo": [
			"viv"
		],
		"video/webm": [
			"webm"
		],
		"video/x-f4v": [
			"f4v"
		],
		"video/x-fli": [
			"fli"
		],
		"video/x-flv": [
			"flv"
		],
		"video/x-m4v": [
			"m4v"
		],
		"video/x-matroska": [
			"mkv",
			"mk3d",
			"mks"
		],
		"video/x-mng": [
			"mng"
		],
		"video/x-ms-asf": [
			"asf",
			"asx"
		],
		"video/x-ms-vob": [
			"vob"
		],
		"video/x-ms-wm": [
			"wm"
		],
		"video/x-ms-wmv": [
			"wmv"
		],
		"video/x-ms-wmx": [
			"wmx"
		],
		"video/x-ms-wvx": [
			"wvx"
		],
		"video/x-msvideo": [
			"avi"
		],
		"video/x-sgi-movie": [
			"movie"
		],
		"video/x-smv": [
			"smv"
		]
	};

/***/ },
/* 8 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {module.exports =
	  global.performance &&
	  global.performance.now ? function now() {
	    return performance.now()
	  } : Date.now || function now() {
	    return +new Date
	  }

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {var now = __webpack_require__(10)
	  , root = typeof window === 'undefined' ? global : window
	  , vendors = ['moz', 'webkit']
	  , suffix = 'AnimationFrame'
	  , raf = root['request' + suffix]
	  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

	for(var i = 0; !raf && i < vendors.length; i++) {
	  raf = root[vendors[i] + 'Request' + suffix]
	  caf = root[vendors[i] + 'Cancel' + suffix]
	      || root[vendors[i] + 'CancelRequest' + suffix]
	}

	// Some versions of FF have rAF but not cAF
	if(!raf || !caf) {
	  var last = 0
	    , id = 0
	    , queue = []
	    , frameDuration = 1000 / 60

	  raf = function(callback) {
	    if(queue.length === 0) {
	      var _now = now()
	        , next = Math.max(0, frameDuration - (_now - last))
	      last = next + _now
	      setTimeout(function() {
	        var cp = queue.slice(0)
	        // Clear queue here to prevent
	        // callbacks from appending listeners
	        // to the current frame's queue
	        queue.length = 0
	        for(var i = 0; i < cp.length; i++) {
	          if(!cp[i].cancelled) {
	            try{
	              cp[i].callback(last)
	            } catch(e) {
	              setTimeout(function() { throw e }, 0)
	            }
	          }
	        }
	      }, Math.round(next))
	    }
	    queue.push({
	      handle: ++id,
	      callback: callback,
	      cancelled: false
	    })
	    return id
	  }

	  caf = function(handle) {
	    for(var i = 0; i < queue.length; i++) {
	      if(queue[i].handle === handle) {
	        queue[i].cancelled = true
	      }
	    }
	  }
	}

	module.exports = function(fn) {
	  // Wrap in a new function to prevent
	  // `cancel` potentially being assigned
	  // to the native rAF function
	  return raf.call(root, fn)
	}
	module.exports.cancel = function() {
	  caf.apply(root, arguments)
	}
	module.exports.polyfill = function() {
	  root.requestAnimationFrame = raf
	  root.cancelAnimationFrame = caf
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Generated by CoffeeScript 1.7.1
	(function() {
	  var getNanoSeconds, hrtime, loadTime;

	  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
	    module.exports = function() {
	      return performance.now();
	    };
	  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
	    module.exports = function() {
	      return (getNanoSeconds() - loadTime) / 1e6;
	    };
	    hrtime = process.hrtime;
	    getNanoSeconds = function() {
	      var hr;
	      hr = hrtime();
	      return hr[0] * 1e9 + hr[1];
	    };
	    loadTime = getNanoSeconds();
	  } else if (Date.now) {
	    module.exports = function() {
	      return Date.now() - loadTime;
	    };
	    loadTime = Date.now();
	  } else {
	    module.exports = function() {
	      return new Date().getTime() - loadTime;
	    };
	    loadTime = new Date().getTime();
	  }

	}).call(this);

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ }
/******/ ]);