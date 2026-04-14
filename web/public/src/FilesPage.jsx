import { useEffect, useRef, useState } from 'react';
import Dropzone from 'dropzone';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import LazyImage from './LazyImage.jsx';
import { getFiles, deleteFile } from './api.js';
import { fileSize, formatDate, guid } from './utils.js';
import { emitter } from './events.js';

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const errorTimeoutRef = useRef(null);

  useEffect(() => {
    getFiles().then(data => {
      setFiles(data || []);
      setLoading(false);
    });
  }, []);

  // WebSocket events from global connection
  useEffect(() => {
    const onFileAdded = (newFile) => {
      setFiles(prev => prev.some(f => f.id === newFile.id) ? prev : [newFile, ...prev]);
    };
    const onFileAccepted = (data) => {
      setUploadingFiles(prev =>
        prev.map(f => f.guid === data.guid ? { ...f, id: data.id, href: data.href } : f),
      );
    };
    const onFileDeleted = (data) => {
      setFiles(prev => prev.filter(f => f.id !== data.id));
    };

    emitter.on('file-added', onFileAdded);
    emitter.on('file-accepted', onFileAccepted);
    emitter.on('file-deleted', onFileDeleted);
    return () => {
      emitter.off('file-added', onFileAdded);
      emitter.off('file-accepted', onFileAccepted);
      emitter.off('file-deleted', onFileDeleted);
    };
  }, []);

  // Dropzone setup
  useEffect(() => {
    const overlay = document.getElementById('filedrop-overlay');
    const clickable = [...document.querySelectorAll('.choose-file')];

    const dz = new Dropzone(document.body, {
      url: window.settings.apiURL + '/file',
      maxFilesize: window.user.maxFileSize / 1024 / 1024,
      maxThumbnailFilesize: 5,
      thumbnailWidth: 150,
      thumbnailHeight: 98,
      parallelUploads: 1,
      uploadMultiple: false,
      clickable: clickable.length ? clickable : false,
      autoDiscover: false,
      headers: { 'Authorization': ':' + window.user.token },
      previewsContainer: false,
    });

    dz.on('thumbnail', (file, thumbnail) => {
      file.thumbnail = thumbnail;
      setUploadingFiles(prev => [...prev]);
    });
    dz.on('addedfile', (file) => {
      file.guid = guid();
      setUploadingFiles(prev => [...prev, file]);
    });
    dz.on('sending', (file, xhr) => {
      xhr.setRequestHeader('hostr-guid', file.guid);
    });
    dz.on('uploadprogress', (file, pct) => {
      setProgress({ name: file.name, percent: pct, status: pct === 100 ? 'Processing' : 'Uploading' });
    });
    dz.on('complete', (file) => {
      setProgress(null);
      setUploadingFiles(prev => prev.filter(f => f.guid !== file.guid));
    });
    dz.on('error', (evt, error) => {
      let msg;
      if (error?.error) {
        msg = 'Error uploading file: ' + evt.name + '. ' + error.error.message;
      } else if (evt.name) {
        msg = 'Error uploading file: ' + evt.name + '. ' + error;
      } else if (typeof error === 'string' && error[0] !== '<') {
        msg = 'Unknown error during upload';
      }
      if (msg) {
        setUploadError(msg);
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => setUploadError(''), 5000);
      }
    });
    dz.on('success', (file, response) => {
      setFiles(prev => prev.some(f => f.id === response.id) ? prev : [response, ...prev]);
    });

    document.body.addEventListener('dragenter', () => {
      overlay.style.display = 'block';
    });
    overlay.addEventListener('dragleave', (e) => {
      if (e.target.outerText !== 'Drop files to upload' || e.x === 0) {
        overlay.style.display = 'none';
      }
    });
    overlay.addEventListener('drop', () => {
      overlay.style.display = 'none';
    });

    return () => {
      dz.destroy();
      clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const remove = async (file) => {
    await deleteFile(file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
  };

  const filtered = files.filter(f =>
    !f.trashed &&
    (!searchText || f.name?.toLowerCase().includes(searchText.toLowerCase())),
  );

  return (
    <>
      {(progress || uploadError) && (
        <div id="header-messages">
          {progress && (
            <div id="header-progress">
              <div className="meter" style={{ width: Math.round(progress.percent) + '%' }}></div>
              <div className="message-label">
                {progress.status} {progress.name} &bull; {Math.round(progress.percent)}%
              </div>
            </div>
          )}
          {uploadError && (
            <div id="header-error">
              <div className="message-label">{uploadError}</div>
            </div>
          )}
        </div>
      )}

      <Header searchText={searchText} onSearch={setSearchText} />

      <section className="container files">
        <div className="row">
          <div className="col-sm-12">
            <header className="add">
              <h3>Files</h3>
              <a className="choose-file"><img src="/images/plus.png" alt="Upload" /></a>
            </header>

            {uploadingFiles.map(file => (
              <UploadingFileItem key={file.guid} file={file} />
            ))}

            {filtered.map(file => (
              <FileItem key={file.id} file={file} onRemove={remove} />
            ))}

            {!loading && uploadingFiles.length === 0 && files.length === 0 && (
              <div className="jumbotron info">
                <div className="drop-zone">
                  <div>
                    <p>Right now you have no files!</p>
                    <p className="plus">
                      Drop a file onto the page or click{' '}
                      <a className="choose-file"><img src="/images/plus.png" alt="" /></a>{' '}
                      to begin.
                    </p>
                    <p>
                      For even easier uploading and sharing{' '}
                      <a href="/apps">download our apps</a> for Mac and Windows.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function UploadingFileItem({ file }) {
  if (file.href) {
    return (
      <div className="file">
        <a href={file.href} title={file.name}>
          <div className="uploading"><div className="throbber"></div></div>
        </a>
        <span className="title truncate">
          <a href={file.href} title={file.name}>{file.name}</a>
        </span>
        <FileMenu>
          <li><a href={file.href}>Copy Link</a></li>
        </FileMenu>
      </div>
    );
  }
  return (
    <div className="file">
      <div className="image"><img src="/images/clock-25.png" width="25" alt="" /></div>
      <span className="title truncate">{file.name}</span>
    </div>
  );
}

function FileItem({ file, onRemove }) {
  const thumb = file.direct?.['150x'] || '/images/file-adjusted.png';
  return (
    <div className="file">
      <div className="image">
        <a href={file.href}>
          <LazyImage src={thumb} alt={file.name} width="160" />
        </a>
      </div>
      <span className="title truncate">
        <a href={file.href} title={file.name}>{file.name}</a>
      </span>
      <FileMenu>
        <li><a href={file.href}>Copy Link</a></li>
        <li>{formatDate(file.added)}</li>
        <li>{fileSize(file.size)}</li>
        <li className="sep">
          {(file.downloads || 0).toLocaleString()}{' '}
          {file.direct?.['970x'] ? 'views' : 'downloads'}
        </li>
        <li><a style={{ cursor: 'pointer' }} onClick={() => onRemove(file)}>Delete</a></li>
      </FileMenu>
    </div>
  );
}

function FileMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  return (
    <div className="menu" ref={ref} onClick={() => setOpen(o => !o)}>
      <img src="/images/gear.png" height="13" width="13" alt="" />
      {open && (
        <div className="dropdown" style={{ display: 'block' }}>
          <div className="file-info">
            <ul className="list-unstyled">{children}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
