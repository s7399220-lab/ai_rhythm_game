/* 유튜브(IFrame Player API) 재생 모듈 - 개발자 가입/토큰 없이 무료
 * - songs.js의 youtube 항목에 영상 링크(또는 11자리 영상 ID)를 넣으면 됩니다.
 * - 규정상 플레이어 화면은 숨기지 않고 게임 중 화면 한쪽에 보여줍니다.
 * - 유튜브 프리미엄 계정으로 로그인한 브라우저에서 실행하면 광고 없이 재생됩니다.
 */
const YTP = {
  ready: false,
  player: null,
  lastError: "",
  error: "",
  _loading: null,

  init() {
    if (this.ready) return Promise.resolve(true);
    if (this._loading) return this._loading;
    this._loading = new Promise((resolve) => {
      const done = () => { this.ready = true; resolve(true); };
      if (window.YT && window.YT.Player) return done();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); done(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => {
        this.lastError = "유튜브 스크립트를 불러오지 못했어요 (인터넷 연결 확인)";
        this._loading = null;
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return this._loading;
  },

  get authorized() { return this.ready; },

  async login() {
    if (!(await this.init())) throw new Error(this.lastError);
    return true;
  },

  // 링크(watch?v=, youtu.be/, embed/, shorts/) 또는 11자리 ID 모두 허용
  parseId(v) {
    if (!v) return "";
    const s = String(v).trim();
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(s) ? s : "";
  },

  async resolve(song) {
    const id = this.parseId(song.youtube);
    if (!id) throw new Error(`songs.js의 "${song.title}"에 youtube 영상 링크를 넣어주세요`);
    return { id, name: song.title, artist: song.artist };
  },

  setErr(code) {
    const map = {
      2: "영상 주소가 올바르지 않아요",
      5: "플레이어 오류가 났어요 (새로고침 후 다시 시도)",
      100: "영상을 찾을 수 없어요 (삭제/비공개)",
      101: "이 영상은 다른 사이트에서 재생이 막혀 있어요. 다른 영상으로 바꿔주세요",
      150: "이 영상은 다른 사이트에서 재생이 막혀 있어요. 다른 영상으로 바꿔주세요",
    };
    this.error = map[code] || "유튜브 재생 오류 (코드 " + code + ")";
  },

  async prepare(id) {
    this.error = "";
    const box = document.getElementById("yt-box");
    box.hidden = false;
    if (!this.player) {
      await new Promise((resolve) => {
        this.player = new window.YT.Player("yt-player", {
          width: "356", height: "200", videoId: id,
          playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, modestbranding: 1, fs: 0 },
          events: { onReady: () => resolve(), onError: (e) => { this.setErr(e.data); resolve(); } },
        });
      });
    } else {
      this.player.cueVideoById(id);
      await new Promise((r) => setTimeout(r, 700));
    }
    if (this.error) { box.hidden = true; throw new Error(this.error); }
  },

  async play() { this.player.playVideo(); },

  stop() {
    try { this.player && this.player.stopVideo(); } catch {}
    const box = document.getElementById("yt-box");
    if (box) box.hidden = true;
  },

  get time() { try { return this.player.getCurrentTime() || 0; } catch { return 0; } },
  get duration() { try { return this.player.getDuration() || 0; } catch { return 0; } },
  get playing() { try { return this.player.getPlayerState() === 1; } catch { return false; } },
  get ended() { try { return this.player.getPlayerState() === 0; } catch { return false; } },
};
