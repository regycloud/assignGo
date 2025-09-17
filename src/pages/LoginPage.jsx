import "../styles/LoginPage.css"; // Import CSS
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuthState } from "../hooks/useAuthState"; 



const LoginPage = () => {
    const { state } = useLocation();
    // const [errorMsg, setErrorMsg] = useState(state?.msg ?? "");
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuthState();
    const initialBanner =
  state?.reason === "logout" ? "" : (state?.msg ?? "");
  
  const [errorMsg, setErrorMsg] = useState(initialBanner);
    // Clear history state so the banner doesn't reappear on refresh/back
    useEffect(() => {
      if (state?.msg) {
        navigate("/login", { replace: true, state: null });
      }
    }, [state, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setErrMsg("");
    setErrorMsg("");
    setLoading(true);
    const email = e.currentTarget.email.value.trim();
    const password = e.currentTarget.password.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home"); // sukses → ke dashboard
    } catch (err) {
      const m = String(err.code || err.message);
      if (
        m.includes("auth/invalid-credential") ||
        m.includes("auth/wrong-password")
      )
        setErrMsg("Email atau password salah.");
      else if (m.includes("auth/user-not-found"))
        setErrMsg("Akun tidak ditemukan.");
      else if (m.includes("auth/too-many-requests"))
        setErrMsg("Terlalu banyak percobaan. Coba lagi nanti.");
      else setErrMsg("Login Failed, try again.");
    } finally {
      setLoading(false);
    }
  }

  // Avoid flicker: don't render login page until auth status known
  if (authLoading) return null; // or a small loader component

  // If already logged in, never render LoginPage — go to dashboard
  if (user) return <Navigate to="/home" replace />;

  return (
    <>
      <div className="container" role="main">
        {/* Background circles */}
        <div aria-hidden="true" className="circle circle1"></div>
        <div aria-hidden="true" className="circle circle2"></div>
        <div aria-hidden="true" className="circle circle3"></div>

        <div className="main-content">
          {/* Logo */}
          <div className="logo-wrapper" aria-label="Pgas International logo">
            <img
              src="/pti.png"
              alt="PTI Logo"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/180x180/png?text=Logo+Image+Not+Found";
              }}
            />
            {/* Top icon badge */}
            <div
              className="icon-badge icon-top"
              aria-hidden="true"
              title="Passport icon"
            >
              <img
                src="/passport.png"
                alt="Passport Logo"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/180x180/png?text=Logo+Image+Not+Found";
                }}
              />
            </div>
            {/* Bottom icon badge */}
            <div
              className="icon-badge icon-bottom"
              aria-hidden="true"
              title="Airplane icon"
            >
              <img
                src="/airplane.png"
                alt="Airplane Logo"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/180x180/png?text=Logo+Image+Not+Found";
                }}
              />
            </div>
          </div>

          {/* Login Box */}
          <section className="login-box" aria-label="Login form">
            <header className="login-header">
              <img
                src="/airplane2.png"
                alt="Airplane Logo"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/180x180/png?text=Logo+Image+Not+Found";
                }}
              />
              <div>
                <div>AssignGO</div>
                <small>Business Travel Management System</small>
              </div>
            </header>

            <form className="login-content" onSubmit={handleLogin}>
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
                    onChange={() => errorMsg && setErrorMsg("")}
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
                    onChange={() => errorMsg && setErrorMsg("")}
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

              {(errMsg || errorMsg) && (
                <div className="error-box" role="alert" aria-live="assertive">
                  {errMsg || errorMsg}
                </div>
              )}

              <div className="checkbox-row">
                <label htmlFor="remember-me">
                  <input type="checkbox" id="remember-me" name="remember-me" />
                  Remember me
                </label>
                <a
                  href="#forgot-password"
                  className="forgot-password"
                  tabIndex={0}
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="btn-login"
                aria-label="Login"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loading">Logging in…</span>
                ) : (
                  <>
                    <img
                      src="/login.png"
                      alt=""
                      aria-hidden="true"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://placehold.co/24x24/png?text=⏩";
                      }}
                    />
                    Login
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        {/* Language selector */}
        <div
          className="language-selector"
          aria-label="Language selector English"
        >
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
