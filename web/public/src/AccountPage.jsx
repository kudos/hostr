import { useEffect, useState } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { getUser, updateSettings, deleteAccount } from './api.js';

export default function AccountPage() {
  const [user, setUser] = useState({ email: window.user.email });
  const [userDelete, setUserDelete] = useState({});
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getUser().then(data => setUser(u => ({ ...u, ...data })));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setUpdated(false);
    setError('');
    try {
      await updateSettings(user);
      setUpdated(true);
      setUser(u => ({ ...u, new_password: '', current_password: '' }));
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (e) => {
    e.preventDefault();
    setUpdated(false);
    setError('');
    try {
      await deleteAccount(userDelete);
      window.location = '/logout';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Header />
      <section className="container admin">
        <div className="row">
          <div className="col-sm-2">
            <ul className="nav nav-pills nav-stacked">
              <li className="active"><a href="/account">Account</a></li>
            </ul>
          </div>
          <div className="col-sm-10">
            <div className="holder">
              <form role="form" onSubmit={submit}>
                {error && <div className="alert alert-danger">{error}</div>}
                {updated && <div className="alert alert-success">Updated your details successfully</div>}
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email" className="form-control" id="email"
                    value={user.email || ''}
                    onChange={e => setUser(u => ({ ...u, email: e.target.value }))}
                  />
                  <span><strong>Required.</strong> Password resets will be sent to this address.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password" className="form-control" id="newPassword"
                    autoComplete="new-password"
                    value={user.new_password || ''}
                    onChange={e => setUser(u => ({ ...u, new_password: e.target.value }))}
                  />
                  <span>Leave this field blank unless you want to update your password.</span>
                </div>
                <hr />
                <div className="form-group">
                  <label htmlFor="password">Current Password</label>
                  <input
                    type="password" className="form-control" id="password"
                    value={user.current_password || ''}
                    onChange={e => setUser(u => ({ ...u, current_password: e.target.value }))}
                  />
                  <span><strong>Required.</strong> When updating your details we require your current password.</span>
                </div>
                <button type="submit" className="btn btn-signup">Save Changes</button>
              </form>

              <hr />

              <div className="panel panel-default panel-danger">
                <div className="panel-body">
                  <h3>Danger Zone</h3>
                  <form role="form" onSubmit={remove}>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="form-group">
                      <label htmlFor="deletePassword">Current Password</label>
                      <input
                        type="password" className="form-control" id="deletePassword"
                        autoComplete="new-password"
                        value={userDelete.current_password || ''}
                        onChange={e => setUserDelete(u => ({ ...u, current_password: e.target.value }))}
                      />
                      <span><strong>Required.</strong> When deleting your account we require your current password.</span>
                    </div>
                    <div className="form-group">
                      <label htmlFor="deleteConfirm">Please enter &ldquo;DELETE&rdquo; below</label>
                      <input
                        type="text" className="form-control" id="deleteConfirm"
                        value={userDelete.delete_confirm || ''}
                        onChange={e => setUserDelete(u => ({ ...u, delete_confirm: e.target.value }))}
                      />
                    </div>
                    <button
                      type="submit" className="btn btn-danger"
                      disabled={userDelete.delete_confirm !== 'DELETE'}
                    >
                      Delete Account
                    </button>
                    <button type="button" className="btn">Cancel</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
