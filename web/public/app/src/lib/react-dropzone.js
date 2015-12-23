/* eslint-disable */
import React from 'react';
import accept from 'attr-accept';

var Dropzone = React.createClass({

  getDefaultProps: function() {
    return {
      disableClick: false,
      multiple: true,
      thumbnailWidth: 150,
      thumbnailHeight: 100,
    };
  },

  getInitialState: function() {
    return {
      isDragActive: false
    };
  },

  propTypes: {
    onDrop: React.PropTypes.func,
    onDropAccepted: React.PropTypes.func,
    onDropRejected: React.PropTypes.func,
    onDragEnter: React.PropTypes.func,
    onDragLeave: React.PropTypes.func,

    style: React.PropTypes.object,
    activeStyle: React.PropTypes.object,
    className: React.PropTypes.string,
    activeClassName: React.PropTypes.string,
    rejectClassName: React.PropTypes.string,

    disableClick: React.PropTypes.bool,
    multiple: React.PropTypes.bool,
    accept: React.PropTypes.string,
    thumbnailWidth: React.PropTypes.number,
    thumbnailHeight: React.PropTypes.number,
  },

  allFilesAccepted: function(files) {
    return files.every(file => accept(file, this.props.accept))
  },

  onDragEnter: function(e) {
    e.preventDefault();

    var dataTransferItems = Array.prototype.slice.call(e.dataTransfer ? e.dataTransfer.items : e.target.files);
    var allFilesAccepted = this.allFilesAccepted(dataTransferItems);

    this.setState({
      isDragActive: allFilesAccepted,
      isDragReject: !allFilesAccepted
    });

    if (this.props.onDragEnter) {
      this.props.onDragEnter(e);
    }
  },

  onDragOver: function (e) {
    e.preventDefault();
  },

  onDragLeave: function(e) {
    e.preventDefault();

    this.setState({
      isDragActive: false,
      isDragReject: false
    });

    if (this.props.onDragLeave) {
      this.props.onDragLeave(e);
    }
  },

  onDrop: function* (e) {
    e.preventDefault();

    this.setState({
      isDragActive: false,
      isDragReject: false
    });

    var droppedFiles = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    var max = this.props.multiple ? droppedFiles.length : 1;
    var files = [];

    for (var file of droppedFiles) {
      file.thumbnail = yield this.createThumbnail(file);
      files.push(file);
    }

    if (this.props.onDrop) {
      this.props.onDrop(files, e);
    }

    if (this.allFilesAccepted(files)) {
      if (this.props.onDropAccepted) {
        this.props.onDropAccepted(files, e);
      }
    } else {
      if (this.props.onDropRejected) {
        this.props.onDropRejected(files, e);
      }
    }
  },

  createThumbnail: function* (file) {
    return new Promise((resolve, reject) => {
      var fileReader;
      fileReader = new FileReader;
      fileReader.onload = () => {
        if (file.type === "image/svg+xml") {
          return resolve(fileReader.result);
        }
        this.createThumbnailFromUrl(file, fileReader.result, (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
      };
      return resolve(fileReader.readAsDataURL(file));
    });
  },

  createThumbnailFromUrl: function(file, imageUrl, callback) {
    var img;
    img = document.createElement("img");
    img.onload = () => {
      file.width = img.width;
      file.height = img.height;
      var resizeInfo = this.resize(file);
      if (resizeInfo.trgWidth == null) {
        resizeInfo.trgWidth = resizeInfo.optWidth;
      }
      if (resizeInfo.trgHeight == null) {
        resizeInfo.trgHeight = resizeInfo.optHeight;
      }
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = resizeInfo.trgWidth;
      canvas.height = resizeInfo.trgHeight;
      ctx.drawImage(img, resizeInfo.srcX || 0, resizeInfo.srcY || 0, resizeInfo.srcWidth, resizeInfo.srcHeight, resizeInfo.trgX || 0, resizeInfo.trgY || 0, resizeInfo.trgWidth, resizeInfo.trgHeight);
      var thumbnail = canvas.toDataURL("image/png");
      if (callback != null) {
        return callback(false, thumbnail);
      }
    };
    if (callback != null) {
      img.onerror = callback;
    }
    return img.src = imageUrl;
  },

  resize: function(file) {
    var info, srcRatio, trgRatio;
    info = {
      srcX: 0,
      srcY: 0,
      srcWidth: file.width,
      srcHeight: file.height
    };
    srcRatio = file.width / file.height;
    info.optWidth = this.props.thumbnailWidth;
    info.optHeight = this.props.thumbnailHeight;
    if ((info.optWidth == null) && (info.optHeight == null)) {
      info.optWidth = info.srcWidth;
      info.optHeight = info.srcHeight;
    } else if (info.optWidth == null) {
      info.optWidth = srcRatio * info.optHeight;
    } else if (info.optHeight == null) {
      info.optHeight = (1 / srcRatio) * info.optWidth;
    }
    trgRatio = info.optWidth / info.optHeight;
    if (file.height < info.optHeight || file.width < info.optWidth) {
      info.trgHeight = info.srcHeight;
      info.trgWidth = info.srcWidth;
    } else {
      if (srcRatio > trgRatio) {
        info.srcHeight = file.height;
        info.srcWidth = info.srcHeight * trgRatio;
      } else {
        info.srcWidth = file.width;
        info.srcHeight = info.srcWidth / trgRatio;
      }
    }
    info.srcX = (file.width - info.srcWidth) / 2;
    info.srcY = (file.height - info.srcHeight) / 2;
    return info;
  },

  onClick: function () {
    if (!this.props.disableClick) {
      this.open();
    }
  },

  open: function() {
    var fileInput = this.refs.fileInput;
    fileInput.value = null;
    fileInput.click();
  },

  render: function() {

    var className;
    if (this.props.className) {
      className = this.props.className;
      if (this.state.isDragActive) {
        className += ' ' + this.props.activeClassName;
      };
      if (this.state.isDragReject) {
        className += ' ' + this.props.rejectClassName;
      };
    };

    var style, activeStyle;
    if (this.props.style) {
      style = this.props.style;
      activeStyle = this.props.activeStyle;
    } else if (!className) {
      style = {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: '#666',
        borderStyle: 'dashed',
        borderRadius: 5,
      };
      activeStyle = {
        borderStyle: 'solid',
        backgroundColor: '#eee'
      };
    }

    var appliedStyle;
    if (style && this.state.isDragActive) {
      appliedStyle = {
        ...style,
        ...activeStyle
      };
    } else {
      appliedStyle = {
        ...style
      };
    };

    return (
      <div
        className={className}
        style={appliedStyle}
        onClick={this.onClick}
        onDragEnter={this.onDragEnter}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDrop={this.onDrop}
      >
        {this.props.children}
        <input
          type='file'
          ref='fileInput'
          style={{ display: 'none' }}
          multiple={this.props.multiple}
          accept={this.props.accept}
          onChange={this.onDrop}
        />
      </div>
    );
  }

});

export default Dropzone;
