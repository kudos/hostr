import { useEffect, useRef, useState } from 'react';

export default function Header({ searchText, onSearch }) {
  const user = window.user;
  const inputRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!onSearch) return;
    function handler(e) {
      if (e.which === 47 && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keypress', handler);
    return () => document.removeEventListener('keypress', handler);
  }, [onSearch]);

  useEffect(() => {
    function handler(e) {
      if (dropdownOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  return (
    <section className="container header clearfix">
      <div className="row">
        <div className="col-sm-4 col-sm-push-4 col-xs-12">
          <div className="logo">
            <a href="/"><img src="/images/logo-dark.png" height="22" width="26" alt="" /></a>
          </div>
        </div>
        <div className="col-sm-4 col-sm-pull-4 col-xs-12">
          <span className="user menu" ref={menuRef} onClick={() => setDropdownOpen(o => !o)}>
            <span className="chevron">
              <img
                src={`//www.gravatar.com/avatar/${user.md5}?s=56&d=blank`}
                height="28" width="28" alt="" className="avatar"
              />
            </span>
            {user.email}
            {dropdownOpen && (
              <div className="dropdown left" style={{ display: 'block' }}>
                <div className="file-info">
                  <a href="/account">Account</a>
                  <a href="/logout" target="_self">Logout</a>
                  <hr />
                  <a href="/apps" target="_self">Get the app</a>
                </div>
              </div>
            )}
          </span>
        </div>
        <div className="col-sm-4 col-xs-12">
          {onSearch !== undefined && (
            <form id="search" onSubmit={(e) => e.preventDefault()}>
              <input
                ref={inputRef}
                name="query"
                type="search"
                value={searchText}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search…"
              />
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
