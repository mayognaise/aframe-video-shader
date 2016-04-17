import { inlineVideo } from './lib/inline-video'
import timeout from 'callback-timeout'


if (typeof AFRAME === 'undefined') {
  throw 'Component attempted to register before AFRAME was available.'
}

/* get util from AFRAME */
const { parseUrl } = AFRAME.utils.srcLoader
const { debug } = AFRAME.utils
// debug.enable('shader:video:*')
debug.enable('shader:video:warn')
const warn = debug('shader:video:warn')
const log = debug('shader:video:debug')

/* store data so that you won't load same data */
const videoData = {}

let effect = 0

/* create error message */
function createError (err, src) {
  return { status: 'error', src: src, message: err, timestamp: Date.now() }
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
    volume: { default: undefined },

  },

  /**
   * Initialize material. Called once.
   * @protected
   */
  init (data) {

    log('init', data)
    log(this.el.components)
    this.__cnv = document.createElement('canvas')
    this.__cnv.width = 2
    this.__cnv.height = 2
    this.__ctx = this.__cnv.getContext('2d')
    this.__texture = new THREE.Texture(this.__cnv)
    this.__reset()
    this.material = new THREE.MeshBasicMaterial({ map: this.__texture })
    this.el.sceneEl.addBehavior(this)
    // this.__addPublicFunctions() /* [TODO] ask how to get shader from `a-entity` element */
    return this.material
  },

  /**
   * Update or create material.
   * @param {object|null} oldData
   */
  update (oldData) {

    /* if desktop, change shader with `flat` */
    // if (!AFRAME.utils.isMobile()) {
    //   const material = Object.assign({}, this.el.getAttribute('material'), { shader: 'flat' })
    //   this.el.removeAttribute('material')
    //   setTimeout(() => {
    //     this.el.setAttribute('material', material)
    //   }, 0)
    //   return
    // }

    log('update', oldData)
    this.__updateMaterial(oldData)
    this.__updateTexture(oldData)
    return this.material
  },

  /**
   * Called on each scene tick.
   * @protected
   */
  tick (t) {

    log('tick')

    if (this.__paused || !this.__canvasVideo) { return }
    this.__canvasVideo.tick()

  },

  /*================================
  =            material            =
  ================================*/
  
  /**
   * Updating existing material.
   * @param {object} data - Material component data.
   */
  __updateMaterial (data) {
    const { material } = this
    const newData = this.__getMaterialData(data)
    Object.keys(newData).forEach(key => {
      material[key] = newData[key]
    })
  },


  /**
   * Builds and normalize material data, normalizing stuff along the way.
   * @param {Object} data - Material data.
   * @return {Object} data - Processed material data.
   */
  __getMaterialData (data) {
    return {
      fog: data.fog,
      color: new THREE.Color(data.color),
    }
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
  
  __setTexure (data) {
    log('__setTexure', data)
    if (data.status === 'error') {
      warn(`Error: ${data.message}\nsrc: ${data.src}`)
      this.__reset()
    }
    else if (data.status === 'success' && data.src !== this.__textureSrc) {
      this.__reset()
      /* Texture added or changed */
      this.__ready(data)
    }
  },

  /**
   * Update or create texure.
   * @param {Object} data - Material component data.
   */
  __updateTexture (data) {
    const { src, autoplay, muted, volume, loop, fps } = data

    /* autoplay */
    if (typeof autoplay === 'boolean') { this.__autoplay = autoplay }
    else if (typeof autoplay === 'undefined') { this.__autoplay = this.schema.autoplay.default }
    if (this.__autoplay && this.__frames) { this.play() } 

    /* preload */
    if (typeof preload === 'boolean') { this.__preload = preload }
    else if (typeof preload === 'undefined') { this.__preload = this.schema.preload.default }

    /* muted */
    this.__muted = true
    // if (typeof muted === 'boolean') { this.__muted = muted }
    // else if (typeof muted === 'undefined') { this.__muted = this.schema.muted.default }

    /* volume */
    this.__volume = undefined
    // if (typeof volume === 'number') { this.__volume = volume }
    // else if (typeof volume === 'undefined') { this.__volume = 0 }

    /* loop */
    this.__loop = true
    // if (typeof loop === 'boolean') { this.__loop = loop }
    // else if (typeof loop === 'undefined') { this.__loop = this.schema.loop.default }

    /* fps */
    this.__fps = fps || this.schema.fps.default

    /* src */
    if (src) {
      this.__validateSrc(src, this.__setTexure.bind(this))
    } else {
      /* Texture removed */
      this.__reset()
    }
  },

  /*=============================================
  =            varidation for texure            =
  =============================================*/

  __validateSrc (src, cb) {

    /* check if src is a url */
    const url = parseUrl(src)
    if (url) {      
      this.__getVideoSrc(url, cb)
      return
    }

    let message

    /* check if src is a query selector */
    const el = this.__validateAndGetQuerySelector(src)
    if (!el || typeof el !== 'object') { return }
    if (el.error) {
      message = el.error
    }
    else {
      const tagName = el.tagName.toLowerCase()
      if (tagName === 'video') {
        src = el.src
        this.__getVideoSrc(src, cb, el)
      }
      else if (tagName === 'img') {
        message = `For <${tagName}> element, please use \`shader:flat\``
      }
      else {
        message = `For <${tagName}> element, please use \`aframe-html-shader\``
      }
    }

    /* if there is message, create error data */
    if (message) {
      const srcData = videoData[src]
      const errData = createError(message, src)
      /* callbacks */
      if (srcData && srcData.callbacks) {
        srcData.callbacks.forEach(cb => cb(errData))
      }
      else {
        cb(errData)
      }
      /* overwrite */
      videoData[src] = errData
    }

  },

  /**
   * Validate src is a valid image url
   * @param  {string} src - url that will be tested
   * @param  {function} cb - callback with the test result
   * @param  {VIDEO} el - video element
   */
  __getVideoSrc (src, cb, el) {

    /* if src is same as previous, ignore this */
    if (src === this.__textureSrc) { return }
    
    /* check if we already get the srcData */
    let srcData = videoData[src]
    if (!srcData || !srcData.callbacks) {
      /* create callback */
      srcData = videoData[src] = { callbacks: [] }
      srcData.callbacks.push(cb)
    }
    else if (srcData.src) {
      cb(srcData)
      return
    }
    else if (srcData.callbacks) {
      /* add callback */
      srcData.callbacks.push(cb)
      return
    }

    const options = {
      autoplay: this.__autoplay,
      preload: this.__preload,
      muted: this.__muted,
      volume: this.__volume,
      loop: this.__loop,
      fps: this.__fps,
      canvas: this.__cnv,
      context: this.__ctx,
      render: this.__render.bind(this),
      element: el,
    }

    inlineVideo(src, options, (err, canvasVideo) => {

      if (err) {

        /* create error data */
        const errData = createError(err, src)
        /* callbacks */
        if (srcData.callbacks) {
          srcData.callbacks.forEach(cb => cb(errData))
          /* overwrite */
          videoData[src] = errData
        }
        return
      }

      /* store data */
      const newData = { status: 'success', src: src, canvasVideo: canvasVideo, timestamp: Date.now() }
      /* callbacks */
      if (srcData.callbacks) {
        srcData.callbacks.forEach(cb => cb(newData))
        /* overwrite */
        videoData[src] = newData
      }
    })

  },
  

  /**
   * Query and validate a query selector,
   *
   * @param  {string} selector - DOM selector.
   * @return {object} Selected DOM element | error message object.
   */
  __validateAndGetQuerySelector (selector) {
    try {
      var el = document.querySelector(selector)
      if (!el) {
        return { error: 'No element was found matching the selector' }
      }
      return el
    } catch (e) {  // Capture exception if it's not a valid selector.
      return { error: 'no valid selector' }
    }
  },
  

  /*================================
  =            playback            =
  ================================*/

  /**
   * add public functions
   * @private
   */
  __addPublicFunctions () {
    this.el.shader = {
      play: this.play.bind(this),
      pause: this.pause.bind(this),
      togglePlayback: this.togglePlayback.bind(this),
      paused: this.paused.bind(this),
      nextFrame: this.nextFrame.bind(this),
    }
  },

  /**
   * Pause video
   * @public
   */
  pause () {
    log('pause')
    this.__paused = true
    this.__canvasVideo && this.__canvasVideo.pause()
  },

  /**
   * Play video
   * @public
   */
  play () {
    log('play')
    this.__paused = false
    this.__canvasVideo && this.__canvasVideo.play()
  },

  /**
   * Toggle playback. play if paused and pause if played.
   * @public
   */
  
  togglePlayback () {
    if (this.paused()) { this.play() }
    else { this.pause() }

  },
  
  /**
   * Return if the playback is paused.
   * @public
   * @return {boolean}
   */  
  paused () {
    return this.__paused
  },

  /*==============================
   =            canvas            =
   ==============================*/

  /**
   * clear canvas
   * @private
   */
  __clearCanvas () {
    this.__ctx.clearRect(0, 0, this.__width, this.__height)
    this.__texture.needsUpdate = true
  },

  /**
   * draw
   * @private
   */
  __draw (video) {
    this.__ctx.drawImage(video, 0, 0, this.__width, this.__height)
    this.__texture.needsUpdate = true
  },

  /**
   * render
   * @private
   */
  __render (video) {
    this.__clearCanvas()
    this.__draw(video)
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
  __ready ({ src, canvasVideo }) {
    log('__ready')
    this.__textureSrc = src
    this.__width = this.__cnv.width
    this.__height = this.__cnv.height
    this.__canvasVideo = canvasVideo
    if (this.__autoplay) {
      this.play()
    }
    else {
      this.pause()
    }
  },
  
  

  /*=============================
  =            reset            =
  =============================*/
  
  /**
   * @private
   */
  
  __reset () {
    this.pause()
    this.__clearCanvas()
    this.__textureSrc = null
    this.__startTime = 0
    // this.__nextFrameTime = 0
    // this.__frameIdx = 0
    // this.__frameCnt = 0
    // this.__delayTimes = null
    // this.__infinity = false
    // this.__loopCnt = 0
    // this.__frames = null
  },



})

