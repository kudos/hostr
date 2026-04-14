import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useReconnectingWebSocket } from './useReconnectingWebSocket.js';
import { emitter } from './events.js';
import FilesPage from './FilesPage.jsx';
import AccountPage from './AccountPage.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

function GlobalWebSocket() {
  let wsURL = null;
  if (window.user) {
    const api = new URL(window.settings.apiURL);
    wsURL = (api.protocol === 'https:' ? 'wss' : 'ws') + '://' + api.host + api.pathname + '/user';
  }
  useReconnectingWebSocket(wsURL, (type, data) => emitter.emit(type, data));
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalWebSocket />
      <Routes>
        <Route path="/" element={<FilesPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppsPage() {
  return (
    <>
      <Header />
      <section className="container apps">
        <div className="row">
          <div className="col-lg-12 col-lg-offset-0 col-md-6 col-md-offset-3">
            <h1>Hostr for Mac and Windows</h1>
            <ul className="list-unstyled">
              <li>Drag and drop without opening your browser.</li>
              <li>Get links instantly without waiting for uploads to finish</li>
              <li>Easily capture and share screenshots.</li>
              <li>Quick access to recent files.</li>
            </ul>
          </div>
          <div className="col-md-6 col-md-offset-3">
            <div className="downloads">
              <a href="/apps/mac/Hostr-0.8.0.zip" className="btn btn-primary" target="_self">Download for Mac</a>
              <a href="/apps/windows/Hostr-0.7.1.exe" className="btn btn-primary" target="_self">Download for Windows</a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function TermsPage() {
  return (
    <>
      <Header />
      <section className="container">
        <div className="row">
          <div className="col-md-offset-2 col-md-8 col-sm-12">
            <h2>Hostr Terms of Service</h2>
            <h3>Prohibited Content</h3>
            <h4>Website Hosting</h4>
            <p>Hotlinking graphics is only permitted in the context of sharing, not for hosting your website.</p>
            <h4>Copyright Content</h4>
            <p>The use of warez, media files that you are not the rightful owner of, cracks, and any other forms of copyrighted software that you are not legally allowed to use/distribute are all strictly prohibited.</p>
            <h4>Pornography</h4>
            <p>Pornography of any kind is strictly prohibited.</p>
            <h4>Viruses and General Malware</h4>
            <p>Viruses, Trojans, and any other harmful files or malware are all strictly prohibited.</p>
            <h4>Passworded Archives</h4>
            <p>The use of passworded archives is strictly prohibited.</p>
            <h4>Split Archives</h4>
            <p>The use of split archives to circumvent the file size limit is strictly prohibited.</p>
            <hr />
            <p>Breaching any of the above terms may result in your account being terminated without warning.</p>
            <hr />
            <h3>Hotlinking</h3>
            <p>Hotlinking images is permitted. However, abuse of this service may result in temporary limitations on your ability to hotlink.</p>
            <hr />
            <p>Hostr reserves the right to remove content for any reason it deems appropriate.</p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function PrivacyPage() {
  return (
    <>
      <Header />
      <section className="container">
        <div className="row">
          <div className="col-md-offset-2 col-md-8 col-sm-12">
            <h2>Privacy Policy</h2>
            <h3>Introduction</h3>
            <p>Hostr values its visitors&apos; privacy. This privacy policy is effective 16th February 2013.</p>
            <h3>What we do with your personally identifiable information</h3>
            <p>It is always up to you whether to disclose personally identifiable information to us. We will not sell or rent it to a third party without your permission and will take commercially reasonable precautions to protect it.</p>
            <h3>Other information we collect</h3>
            <p>We may collect other information that cannot be readily used to identify you, such as the domain name and IP address of your computer.</p>
            <h3>Cookies</h3>
            <p>Hostr uses &ldquo;cookies&rdquo; to store personal data on your computer.</p>
            <h3>External data storage sites</h3>
            <p>We may store your data on servers provided by third party hosting vendors with whom we have contracted.</p>
            <h3>Changes to this privacy policy</h3>
            <p>We reserve the right to change this privacy policy as we deem necessary or appropriate.</p>
            <h3>Questions or comments?</h3>
            <p>If you have questions or comments about Hostr&apos;s privacy policy, send an email to support@hostr.com.</p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
