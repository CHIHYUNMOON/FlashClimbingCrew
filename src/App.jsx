import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function App() {
  const today = new Date().toISOString().split("T")[0];

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");

  const [date, setDate] = useState(today);
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState([]);
  const [monthlyRanking, setMonthlyRanking] = useState([]);

  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: "https://flash-climbing-crew.vercel.app/",
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

    setMessage("로그아웃되었습니다.");
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

    const rankingArray = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));

    rankingArray.sort((a, b) => b.count - a.count);
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
      .lte("attendance_date", lastDay)
      .order("attendance_date", { ascending: false });

    if (error) {
      setMessage("출석 기록 조회 실패: " + error.message);
      return;
    }

    setRecords(data || []);
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
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>크루 출석 체크</h1>

      {!session ? (
        <button onClick={signInWithKakao}>카카오로 로그인</button>
      ) : (
        <div style={{ marginBottom: "20px" }}>
          <p>
            로그인됨: <strong>{nickname || "사용자"}</strong>
          </p>
          <button onClick={signOut}>로그아웃</button>
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
        <label>이름: </label>
        <input value={nickname} disabled />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>날짜: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <button onClick={handleAttendance} disabled={!session}>
        출석 체크
      </button>

      <p style={{ marginTop: "16px" }}>{message}</p>

      <hr style={{ margin: "30px 0" }} />

      <h2>이번 달 참여 랭킹</h2>
      {monthlyRanking.length === 0 ? (
        <p>이번 달 출석 데이터가 없습니다.</p>
      ) : (
        monthlyRanking.map((person, index) => (
          <div key={person.name} style={{ marginBottom: "8px" }}>
            {index + 1}위 - {person.name} ({person.count}회)
          </div>
        ))
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>이번 달 출석 기록</h2>
      {records.length === 0 ? (
        <p>이번 달 저장된 출석 기록이 없습니다.</p>
      ) : (
        records.map((record) => (
          <div key={record.id} style={{ marginBottom: "8px" }}>
            {record.nickname} / {record.attendance_date}
          </div>
        ))
      )}
    </div>
  );
}

export default App;