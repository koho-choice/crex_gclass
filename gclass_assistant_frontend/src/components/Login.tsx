import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const handleLoginSuccess = async (response: any) => {
    const credential = response.credential;
    //const credential = "hi";
    console.log("Raw authorization code", credential);

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      });

      const data = await res.json();
      console.log("Backend Response:", data);

      if (data.token) {
        localStorage.setItem("session_token", data.token); // Store JWT
      }
    } catch (error) {
      console.error("Error sending token to backend:", error);
    }
  };

  return (
    <div>
      <h2>Sign in with Google</h2>
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={() => console.log("Login Failed")}
        useOneTap
        access_type="offline" // Request offline access to get a refresh token
        prompt="consent"
        response_type="code" // Request an authorization code instead of an ID token
        scope="
    openid
    profile
    email
    https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.courses https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/classroom.rosters"
      />
    </div>
  );
};

export default Login;
