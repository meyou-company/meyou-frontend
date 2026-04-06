import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  useEffect(() => {
    addLog("[AuthCallback] Starting...");
    
    authApi.me()
      .then((user) => {
        addLog("[AuthCallback] me() success");
        if (user.profileCompleted === false) {
          navigate("/users/profile/complete", { replace: true });
        } else {
          navigate("/profile", { replace: true });
        }
      })
      .catch((err) => {
        addLog(`[AuthCallback] me() failed: ${err?.response?.status || 'no status'} - ${err?.message || 'no message'}`);
        
        authApi.refresh()
          .then(() => authApi.me())
          .then((user) => {
            addLog("[AuthCallback] refresh + me() success");
            if (user.profileCompleted === false) {
              navigate("/users/profile/complete", { replace: true });
            } else {
              navigate("/profile", { replace: true });
            }
          })
          .catch((err2) => {
            addLog(`[AuthCallback] refresh failed: ${err2?.response?.status || 'no status'} - ${err2?.message || 'no message'}`);
            navigate("/auth/login", { replace: true });
          });
      });
  }, [navigate]);

  return (
    <div style={{padding: 20, fontSize: 14}}>
      <h3>Loading...</h3>
      <div style={{marginTop: 20, fontFamily: 'monospace', background: '#f0f0f0', padding: 10}}>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
}
