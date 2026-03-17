import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function App() {
  const today = new Date().toISOString().split("T")[0];

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [date, setDate] = useState(today);
  const [message, setMessage] = useState("");
  const [monthlyRanking, setMonthlyRanking] = useState([]);

  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage("로그인 실패: " + error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("로그아웃 실패: " + error.message);
      return;
    }

    setMessage("");
  };

  const makeMonthlyRanking = (data) => {
    const counts = {};

    data.forEach((item) => {
      const displayName = item.nickname?.trim() || "이름없음";

      if (!counts[displayName]) {
        counts[displayName] = 0;
      }

      counts[displayName] += 1;
    });

    const rankingArray = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    setMonthlyRanking(rankingArray);
  };

  const fetchAttendance = async () => {
    const now = new Date();

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .gte("attendance_date", firstDay)
      .lte("attendance_date", lastDay);

    if (error) {
      setMessage("출석 랭킹 조회 실패: " + error.message);
      return;
    }

    makeMonthlyRanking(data || []);
  };

  const handleAttendance = async () => {
    if (!user) {
      setMessage("먼저 카카오 로그인을 해주세요.");
      return;
    }

    const userId = user.id;
    const displayName =
      user.user_metadata?.name ||
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      "이름없음";

    const { data: existingRecord, error: checkError } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("attendance_date", date)
      .maybeSingle();

    if (checkError) {
      setMessage("중복 확인 실패: " + checkError.message);
      return;
    }

    if (existingRecord) {
      setMessage("이미 이 날짜에 출석했습니다.");
      return;
    }

    const { error: insertError } = await supabase.from("attendance").insert([
      {
        user_id: userId,
        nickname: displayName,
        attendance_date: date,
      },
    ]);

    if (insertError) {
      setMessage("저장 실패: " + insertError.message);
      return;
    }

    setMessage("출석이 저장되었습니다.");
    fetchAttendance();
  };

  useEffect(() => {
    fetchAttendance();

    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const displayName =
        currentSession?.user?.user_metadata?.name ||
        currentSession?.user?.user_metadata?.nickname ||
        currentSession?.user?.user_metadata?.full_name ||
        "";

      setNickname(displayName);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const displayName =
        currentSession?.user?.user_metadata?.name ||
        currentSession?.user?.user_metadata?.nickname ||
        currentSession?.user?.user_metadata?.full_name ||
        "";

      setNickname(displayName);
      fetchAttendance();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <button
          onClick={signInWithKakao}
          style={{
            padding: "16px 28px",
            fontSize: "18px",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          카카오로 로그인
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "8px" }}>크루 출석 체크</h1>
      <p style={{ marginBottom: "20px" }}>
        로그인됨: <strong>{nickname || "사용자"}</strong>
      </p>

      <div style={{ marginBottom: "12px" }}>
        <label>날짜: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button onClick={handleAttendance}>출석 체크</button>
        <button onClick={signOut}>로그아웃</button>
      </div>

      <p style={{ minHeight: "24px" }}>{message}</p>

      <hr style={{ margin: "30px 0" }} />

      <h2>이번 달 출석 랭킹</h2>
      {monthlyRanking.length === 0 ? (
        <p>이번 달 출석 데이터가 없습니다.</p>
      ) : (
        monthlyRanking.map((person, index) => (
          <div
            key={person.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>
              {index + 1}위 · {person.name}
            </span>
            <strong>{person.count}회</strong>
          </div>
        ))
      )}
    </div>
  );
}

export default App;