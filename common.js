var scene = document.querySelector('a-scene')
if (scene.hasLoaded) { ready() }
else { scene.addEventListener('loaded', ready) }

function ready () {

  /**
   * toggle visibility dom element when entering/exiting stereo mode.
   */
  scene.addEventListener('enter-vr', function () { document.body.setAttribute('data-vr', true) })
  scene.addEventListener('exit-vr', function () { document.body.setAttribute('data-vr', false) })


  
}