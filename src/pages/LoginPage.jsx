import '../styles/LoginPage.css'; // Import CSS


const LoginPage = () => {
  return (
    <>

      {/* Background circles */}
      <div aria-hidden="true" className="circle circle1"></div>
      <div aria-hidden="true" className="circle circle2"></div>
      <div aria-hidden="true" className="circle circle3"></div>

      <div className="container" role="main">
        <div className="main-content">
          {/* Logo */}
          <div className="logo-wrapper" aria-label="Pgass International logo">
            <img
              src="/pti.png"
              alt="Logo with colorful circular swirl and text 'Pgas international' in center, vibrant colors including purple, green, orange"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/180x180/png?text=Logo+Image+Not+Found";
              }}
            />
            {/* Top icon badge */}
            <div className="icon-badge icon-top" aria-hidden="true" title="Passport icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.63 1.93 4.88 5 5.83v3.34a1 1 0 0 0 1.55.83L12 18l3.45 1.99a1 1 0 0 0 1.55-.83v-3.34c3.07-.95 5-3.2 5-5.83 0-4.42-4.48-8-10-8zm0 14a7 7 0 0 1-7-7c0-3.1 3.58-5.58 7-5.58S19 5.9 19 9a7 7 0 0 1-7 7z" />
                <path d="M12 6a3 3 0 0 0 0 6 3 3 0 0 0 0-6zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
              </svg>
            </div>
            {/* Bottom icon badge */}
            <div className="icon-badge icon-bottom" aria-hidden="true" title="Airplane icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21 16v-2l-8-5V3.5a.5.5 0 0 0-1 0V9l-8 5v2l8-2.5V21l-2 1v1l4-1 4 1v-1l-2-1v-7.5l8 2.5z" />
              </svg>
            </div>
          </div>

          {/* Login Box */}
          <section className="login-box" aria-label="Login form">
            <header className="login-header">
              <svg
                aria-hidden="true"
                focusable="false"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M21 16v-2l-8-5V3.5a.5.5 0 0 0-1 0V9l-8 5v2l8-2.5V21l-2 1v1l4-1 4 1v-1l-2-1v-7.5l8 2.5z" />
              </svg>
              <div>
                <div>
                  AssignGO
                </div>
                <small>Business Travel Management System</small>
              </div>
            </header>

            <form className="login-content" onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <label htmlFor="email">Email</label>
                <div className="input-icon">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    aria-required="true"
                    aria-describedby="email-desc"
                  />
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 8l8 5 8-5v-2l-8 5-8-5v2z" />
                  </svg>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="password">Password</label>
                <div className="input-icon">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-required="true"
                    aria-describedby="password-desc"
                  />
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 0 0-4 0v3a2 2 0 0 0 2 2z" />
                    <path d="M17 8V7a5 5 0 0 0-10 0v1a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3zM9 7a3 3 0 0 1 6 0v1H9V7zm6 11H9a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1z" />
                  </svg>
                </div>
              </div>

              <div className="checkbox-row">
                <label htmlFor="remember-me">
                  <input type="checkbox" id="remember-me" name="remember-me" />
                  Remember me
                </label>
                <a href="#forgot-password" className="forgot-password" tabIndex={0}>
                  Forgot password?
                </a>
              </div>

              <button type="submit" className="btn-login" aria-label="Login">
                <svg
                  aria-hidden="true"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 17l5-5-5-5v10zM5 19h2v-14H5v14z" />
                </svg>
                Login
              </button>
            </form>
          </section>
        </div>

        {/* Language selector */}
        <div className="language-selector" aria-label="Language selector English">
          <svg
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9zm-7-7h3.25A6.98 6.98 0 0 0 5 12zm14 0a7.07 7.07 0 0 0-1.42-3.75h-4.38c-.05.29-.1.57-.14.87l.79 4.57 2-1.13v3.5zm-4.58-5.62c.18-.24.4-.42.66-.62 1.37 2 1.9 4.27 1.81 6.74H9.08l1-5.7a4.29 4.29 0 0 1 .7 2.03c0 .19-.01.37-.04.54L12 21c-.03-.06-.06-.12-.09-.19l-1-5.7a36.28 36.28 0 0 1-4.15.12 7.008 7.008 0 0 1 2.53-3.82l.6-.47z" />
          </svg>
          English
        </div>
      </div>
    </>
  );
};

export default LoginPage;
