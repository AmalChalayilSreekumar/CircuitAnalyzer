import { useAuth0 } from "@auth0/auth0-react";
import "./App.css";

function App() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();

  const handleSignup = () =>
    loginWithRedirect({
      authorizationParams: { screen_hint: "signup" },
    });

  const handleLogout = () =>
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });

  if (isLoading) {
    return (
      <div className="page">
        <div className="card">
          <h2>Loading...</h2>
          <p>Please wait while we connect to Auth0.</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="page">
        <div className="card profile-card">
          <h1>Welcome</h1>
          <p className="subtitle">You are logged in with Auth0.</p>

          <div className="profile-box">
            <p><strong>Name:</strong> {user?.name || "Not available"}</p>
            <p><strong>Email:</strong> {user?.email || "Not available"}</p>
          </div>

          <h3>User Profile</h3>
          <pre className="profile-json">{JSON.stringify(user, null, 2)}</pre>

          <button className="primary-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page split-layout">
      <section className="hero-section">
        <div className="hero-content">
          <p className="badge">Secure Authentication</p>
          <h1>Build a secure login experience with Auth0</h1>
          <p className="hero-text">
            Auth0 helps secure your applications without spending hours building
            features like social sign-in, Multi-Factor Authentication, and
            passwordless login from scratch.
          </p>
          <p className="hero-text">
            You can also secure AI applications with Auth0 for AI Agents.
          </p>
          <p className="hero-text">
            Auth0 is free to try, does not require a credit card, and gives you
            a fast way to add modern authentication to your app.
          </p>
        </div>
      </section>

      <section className="login-section">
        <div className="card">
          <h2>Login</h2>
          <p className="subtitle">
            Continue securely using Auth0 Universal Login.
          </p>

          {error && <p className="error-text">Error: {error.message}</p>}

          <button className="primary-btn" onClick={() => loginWithRedirect()}>
            Login
          </button>

          <button className="secondary-btn" onClick={handleSignup}>
            Sign up
          </button>

          <p className="small-text">
            You will be redirected to Auth0 to authenticate securely.
          </p>
        </div>
      </section>
    </div>
  );
}

export default App;