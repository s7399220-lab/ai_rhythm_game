// 곡 목록
// - id      : 곡 고유 이름 (채보 저장에 사용, 겹치면 안 됨)
// - youtube : 유튜브 영상 링크 (공식 채널 영상 권장. 임베드가 막힌 영상은 재생 안 됨)
// - apple   : 애플뮤직 곡 ID (애플뮤직 방식에서만 사용, 개발자 토큰 필요)
// - search  : 애플뮤직 검색어 (apple이 비어 있을 때만 사용)
// - bpm     : 박자 수 (자동 BPM 채보용, 채보를 녹화했다면 필요 없음)
// - offset  : 첫 박이 시작되는 시간(초) (자동 BPM 채보용)
// - length  : 곡 길이(초) (모르면 생략 가능, 재생 길이를 자동으로 읽음)
// - file    : "파일" 모드에서 쓸 음원 파일 (assets/songs/, 공개 저장소에 올리지 마세요)
const SONGS = [
  { id: "pajama",   title: "파자마파티즈",            artist: "치이카와",  youtube: "", search: "ちいかわ パジャマパーティーズ", apple: "1728618786", bpm: 0, offset: 0, file: "assets/songs/pajama.mp3",       color: "#ffb3d9" },
  { id: "usagi",    title: "우사기 랩",               artist: "치이카와",  youtube: "", search: "ちいかわ ウサギ ラップ",       apple: "6807091739", bpm: 0, offset: 0, file: "assets/songs/usagi.mp3",        color: "#ff9ecb" },
  { id: "lastlike", title: "마지막처럼",              artist: "BLACKPINK", youtube: "", search: "BLACKPINK As If It's Your Last", apple: "1251249891", bpm: 0, offset: 0, file: "assets/songs/lastlike.mp3",     color: "#ff5fa2" },
  { id: "bang3",    title: "뱅뱅뱅 (BANG BANG BANG)", artist: "BIGBANG",   youtube: "", search: "BIGBANG BANG BANG BANG",        apple: "1314237014", bpm: 0, offset: 0, file: "assets/songs/bangbangbang.mp3", color: "#ffd24a" },
  { id: "redred",   title: "Red Red",                 artist: "CORTIS",    youtube: "", search: "CORTIS Red Red",                apple: "1887671067", bpm: 0, offset: 0, file: "assets/songs/redred.mp3",       color: "#ff4b4b" },
  { id: "neon",     title: "NEON",                    artist: "A20 Lite",  youtube: "", search: "A20 Lite NEON",                 apple: "6820428730", bpm: 0, offset: 0, file: "assets/songs/neon.mp3",         color: "#4be3ff" },
  { id: "bad",      title: "BAD",                     artist: "ATEEZ",     youtube: "", search: "ATEEZ BAD",                     apple: "6770401926", bpm: 0, offset: 0, file: "assets/songs/bad.mp3",          color: "#a78bff" },
];
