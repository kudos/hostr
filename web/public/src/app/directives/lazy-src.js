export default function lazySrc($window) {
  var lazyLoader = (function() {
    var images = [];
    var renderTimer = null;
    var renderDelay = 100;
    var documentHeight = document.documentElement.scrollHeight;
    var documentTimer = null;
    var documentDelay = 2000;
    var isWatchingWindow = false;

    // ---
    // PUBLIC METHODS.
    // ---
    function addImage(image) {
      images.push(image);
      if (!renderTimer) {
        startRenderTimer();
      }

      if (!isWatchingWindow) {
        startWatchingWindow();
      }
    }

    let removeImage = function(image) {
      for (let i = 0; i < images.length; i++) {
        if (images[i] === image ) {
          images.splice(i, 1);
          break;
        }
      }
      if ( !images.length ) {
        clearRenderTimer();
        stopWatchingWindow();
      }
    };

    // ---
    // PRIVATE METHODS.
    // ---

    function clearRenderTimer() {
      clearTimeout( renderTimer );
      renderTimer = null;
    }

    function checkImages() {
      var visible = [];
      var hidden = [];
      var windowHeight = $window.innerHeight;
      var scrollTop = $window.scrollY;
      var topFoldOffset = scrollTop;
      var bottomFoldOffset = ( topFoldOffset + windowHeight );

      for (let i = 0; i < images.length; i++) {
        var image = images[ i ];
        if ( image.isVisible( topFoldOffset, bottomFoldOffset ) ) {
          visible.push( image );
        } else {
          hidden.push( image );
        }
      }

      for (let i = 0; i < visible.length; i++) {
        visible[ i ].render();
      }

      images = hidden;

      clearRenderTimer();

      if ( !images.length ) {
        stopWatchingWindow();
      }
    }

    function startRenderTimer() {
      renderTimer = setTimeout( checkImages, renderDelay );
    }

    function checkDocumentHeight() {
      if ( renderTimer ) {
        return;
      }

      var currentDocumentHeight = document.documentElement.scrollHeight;
      if ( currentDocumentHeight === documentHeight ) {
        return;
      }

      documentHeight = currentDocumentHeight;

      startRenderTimer();
    }

    function windowChanged() {
      if (!renderTimer) {
        startRenderTimer();
      }
    }

    function startWatchingWindow() {

      isWatchingWindow = true;

      $window.addEventListener( 'resize', windowChanged );
      $window.addEventListener( 'scroll', windowChanged );

      documentTimer = setInterval( checkDocumentHeight, documentDelay );
    }

    function stopWatchingWindow() {
      isWatchingWindow = false;

      $window.removeEventListener( 'resize', windowChanged );
      $window.removeEventListener( 'scroll', windowChanged );

      clearInterval( documentTimer );
    }

    return ({
      addImage: addImage,
      removeImage: removeImage
    });
  })();

  function LazyImage( element ) {
    var source = null;
    var isRendered = false;
    var height = null;

    var el = element[0];

    // ---
    // PUBLIC METHODS.
    // ---
    function isVisible( topFoldOffset, bottomFoldOffset ) {
      if (el.offsetParent === null) {
        //return( false );
      }

      bottomFoldOffset = bottomFoldOffset + 50;

      if ( height === null ) {
        height = el.offsetHeight;
      }

      var top = el.getBoundingClientRect().top + $window.scrollY;
      var bottom = ( top + height );

      return (
          (
            ( top <= bottomFoldOffset ) &&
            ( top >= topFoldOffset )
          )
        ||
          (
            ( bottom <= bottomFoldOffset ) &&
            ( bottom >= topFoldOffset )
          )
        ||
          (
            ( top <= topFoldOffset ) &&
            ( bottom >= bottomFoldOffset )
          )
      );

    }

    function renderSource() {
      el.src = source;
      el.classList.add('loaded');
    }

    function render() {
      isRendered = true;
      renderSource();
    }

    function setSource( newSource ) {
      source = newSource;
      if ( isRendered ) {
        renderSource();
      }
    }

    return ({
      isVisible: isVisible,
      render: render,
      setSource: setSource
    });
  }

  function link( $scope, element, attributes ) {
    var lazyImage = new LazyImage( element );

    lazyLoader.addImage( lazyImage );

    attributes.$observe(
      'lazySrc',
      function( newSource ) {
        lazyImage.setSource( newSource );
      }
    );

    $scope.$on(
      '$destroy',
      function() {
        lazyLoader.removeImage( lazyImage );
      }
    );
  }

  return ({
    link: link,
    restrict: 'A'
  });
}
