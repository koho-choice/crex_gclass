import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
const Login = () => {
  const { setIsAuthenticated, setUser } = useAuth();
  const handleLoginSuccess = async (codeResponse: any) => {
    // Instead of an ID token, you'll now get an authorization code
    console.log("Authorization Code:", codeResponse.code);
    // Send this code to your backend for exchange
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/google/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeResponse.code }),
      });

      const data = await res.json();
      console.log("Backend Response name:", data.user.name);
      setIsAuthenticated(true);
      setUser({
        name: data.user.name,
        email: data.user.email,
      });
    } catch (error) {
      console.error("Error sending authorization code to backend:", error);
    }
  };

  const login = useGoogleLogin({
    flow: "auth-code", // Tell it to use the code flow
    scope:
      "openid profile email https://www.googleapis.com/auth/classroom.courses https://www.googleapis.com/auth/classroom.rosters",
    onSuccess: handleLoginSuccess,
    onError: (error) => console.log("Login Failed", error),
  });

  return (
    <div>
      <button onClick={() => login()}>Login with Google</button>
    </div>
  );
};

export default Login;
