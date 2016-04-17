/**
 * original data is by @Jam3
 * @see https://github.com/Jam3/ios-video-test
 */

function noop () {}

var createSource = require('./source-element')

module.exports.video = simpleMediaElement.bind(null, 'video')
module.exports.audio = simpleMediaElement.bind(null, 'audio')

function simpleMediaElement (elementName, sources, opt, cb) {
  if (typeof opt === 'function') {
    cb = opt
    opt = {}
  }
  cb = cb || noop
  opt = opt || {}

  if (!Array.isArray(sources)) {
    sources = [ sources ]
  }

  var media = opt.element || document.createElement(elementName)

  if (opt.loop) media.setAttribute('loop', true)
  if (opt.muted) media.setAttribute('muted', 'muted')
  if (opt.autoplay) media.setAttribute('autoplay', 'autoplay')
  if (opt.preload) media.setAttribute('preload', opt.preload)
  if (typeof opt.volume !== 'undefined') media.setAttribute('volume', opt.volume)
  media.setAttribute('crossorigin', 'anonymous')
  media.setAttribute('webkit-playsinline', '')
  
  sources.forEach(function (source) {
    media.appendChild(createSource(source))
  })

  process.nextTick(start)
  return media

  function start () {
    media.addEventListener('canplay', function () {
      cb(null, media)
      cb = noop
    }, false)
    media.addEventListener('error', function (err) {
      cb(err)
      cb = noop
    }, false)
    media.addEventListener('readystatechange', checkReadyState, false)
    media.load()
    checkReadyState()
  }
  
  function checkReadyState () {
    if (media.readyState > media.HAVE_FUTURE_DATA) {
      cb(null, media)
      cb = noop
    }
  }
}
