import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { LogIn } from "lucide-react";

const Login = () => {
  const { setIsAuthenticated, setUser } = useAuth();

  const handleLoginSuccess = async (codeResponse: any) => {
    console.log("Authorization Code:", codeResponse.code);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/google/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeResponse.code }),
      });

      const data = await res.json();
      console.log("Backend Response name:", data);
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
    flow: "auth-code",
    scope:
      "openid profile email https://www.googleapis.com/auth/classroom.courses https://www.googleapis.com/auth/classroom.rosters https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/classroom.profile.emails ",
    onSuccess: handleLoginSuccess,
    onError: (error) => console.log("Login Failed", error),
  });

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={() => login()}
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <LogIn className="h-5 w-5 mr-2" />
        Connect with Google Classroom
      </button>
    </div>
  );
};

export default Login;
