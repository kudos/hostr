import Dropzone from 'dropzone';

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

export default function dropzone(FileService, $cacheFactory) {
  var dropOverlay = document.getElementById('filedrop-overlay');
  var dropzoneEl;
  var errorTimeout;
  return function($scope) {
    $scope.$on('$viewContentLoaded', function() {
      if (!dropzoneEl) {
        $scope.$root.uploadingFiles = [];
        var clickable = [].slice.call(document.querySelectorAll('.choose-file'));

        dropzoneEl = new Dropzone(document.body, {
            url: window.settings.apiURL + '/file',
            maxFilesize: window.user.maxFileSize / 1024 / 1024,
            maxThumbnailFilesize: 5,
            thumbnailWidth: 150,
            thumbnailHeight: 98,
            parallelUploads: 1,
            uploadMultiple: false,
            clickable: clickable.length ? clickable : false,
            autoDiscover: false,
            headers: {'Authorization': ':' + window.user.token},
            previewsContainer: false
        });
        dropzoneEl.on('thumbnail', function(file, thumbnail){
          file.thumbnail = thumbnail;
          $scope.$apply();
        });
        dropzoneEl.on('addedfile', function(file){
          var id = guid();
          file.guid = id;
          $scope.$root.uploadingFiles.push(file);
          $scope.$apply();
        });
        dropzoneEl.on('sending', function(file, xhr) {
          xhr.setRequestHeader('hostr-guid', file.guid);
        });
        dropzoneEl.on('uploadprogress', function(file, progress) {
          $scope.$root.progress = {
            name: file.name,
            percent: progress,
            status: 'Uploading'
          };
          if (progress === 100) {
            $scope.$root.progress.status = 'Processing';
          }
          $scope.$apply();
        });
        dropzoneEl.on('complete', function(file){
          delete $scope.$root.progress;
          $scope.$apply();
          $scope.$root.uploadingFiles.some(function(uploadingFile, index) {
            if (uploadingFile.guid === file.guid) {
              $scope.$root.uploadingFiles.splice(index, 1);
              $scope.$apply();
              return true;
            }
            return false;
          });
        });
        dropzoneEl.on('error', function(evt, error){
          if (error.error) {
            $scope.$root.uploadError = 'Error uploading file: ' + evt.name + '. ' + error.error.message;
          }
          else if (evt.name) {
            $scope.$root.uploadError = 'Error uploading file: ' + evt.name + '. ' + error;
          } else {
            if (error[0] !== '<') {
              $scope.$root.uploadError = 'Uknown error during upload';
            }
          }
          $scope.$apply();
          clearTimeout(errorTimeout);
          errorTimeout = setTimeout(function() {
            $scope.$root.uploadError = '';
            $scope.$apply();
          }, 5000);
        });

        var addFile = function(newFile) {
          if (!$scope.$root.files.some(function (file) {
              return file.id === newFile.id;
            })) {
            var cache = $cacheFactory.get('files-cache');
            cache.removeAll();
            var file = new FileService(newFile);
            $scope.$root.files.unshift(file);
            $scope.$root.user.uploads_today++;
            $scope.$apply();
          }
        };

        dropzoneEl.on('success', function(file, response){
          addFile(response);
        });
        $scope.$on('file-added', function(event, data){
          addFile(data);
        });
        $scope.$on('file-accepted', function(event, data){
          $scope.$root.uploadingFiles.some(function(file) {
            if (file.guid === data.guid) {
              file.id = data.id;
              file.href = data.href;
              $scope.$apply();
              return true;
            }
          });
        });
        $scope.$on('file-deleted', function(evt, data) {
          $scope.$root.files.forEach(function(file, index) {
            if(data.id === file.id) {
              delete $scope.$root.files[index];
              $scope.$digest();
            }
          });
        });

        document.body.addEventListener('dragenter', function(){
          dropOverlay.style.display = 'block';
        });

        dropOverlay.addEventListener('dragleave', function(event){
          if (event.target.outerText !== 'Drop files to upload' || event.x === 0) {
            dropOverlay.style.display = 'none';
          }
        });

        dropOverlay.addEventListener('drop', function(){
          dropOverlay.style.display = 'none';
        });
      } else {
        var clicker = [].slice.call(document.querySelectorAll('.choose-file'));
        if (clicker) {
          clicker.forEach(function(el) {
            el.addEventListener('click', function() {
              return dropzoneEl.hiddenFileInput.click();
            });
          });
        }
      }
    });
  };
}
