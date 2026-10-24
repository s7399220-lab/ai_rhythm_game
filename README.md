# 🎵 AI주간 리듬게임

HTML/CSS/JavaScript로 만든 4레인 웹 리듬게임입니다.

- 조작: 키보드 `D` `F` `J` `K` (태블릿/터치는 화면 탭), `ESC` 나가기
- 음원 방식 3가지 (게임 화면의 "음원 방식"에서 선택)
  - **유튜브 (기본, 무료)**: 곡마다 유튜브 영상 링크를 넣어 재생
  - **애플 뮤직**: 로그인한 구독 계정으로 재생 (Apple Developer 개발자 토큰 필요, 유료)
  - **파일**: `assets/songs/`의 음원 파일을 분석해 자동 채보
- 옵션: 난이도, 노트 속도, 싱크 보정(ms)

## 1. VS Code에서 실행

1. VS Code에서 `rhythm-game` 폴더 열기
2. 확장 프로그램 **Live Server** 설치
3. `index.html` 우클릭 → **Open with Live Server** (더블클릭으로 열면 동작하지 않아요)

## 2. 유튜브 방식 (추천, 무료)

1. `songs.js`의 곡마다 `youtube: ""`에 영상 링크를 붙여 넣기
   - 예: `youtube: "https://www.youtube.com/watch?v=XXXXXXXXXXX"` (11자리 영상 ID만 써도 됩니다)
   - 공식 채널 영상을 쓰세요. 임베드(다른 사이트에서 재생)가 막힌 영상은 재생되지 않고 안내 문구가 나와요.
2. 곡을 고르고 **🎙 채보 녹화**로 채보를 만들기 (아래 4번)
3. **광고**: 행사 PC의 브라우저에 유튜브 프리미엄 계정으로 로그인해 두면 광고 없이 재생됩니다. 행사 전에 꼭 테스트하세요.
4. 규정상 플레이어 화면을 숨길 수 없어서 게임 중 화면 한쪽(작은 창)에 영상이 보입니다.

## 3. 애플뮤직 방식 (선택)

Apple Developer Program(유료)이 있을 때만 쓸 수 있어요.

1. [developer.apple.com](https://developer.apple.com)에서 Media ID 생성 → Keys에서 MusicKit 키 생성 → `AuthKey_XXXXXXXXXX.p8` 받기
2. `node tools/make-token.js <TEAM_ID> <KEY_ID> <.p8 경로>`로 토큰 생성
3. 나온 줄을 `config.js`에 저장 (`config.example.js` 복사)
4. 게임 화면에서 애플뮤직 방식 선택 → 연결/로그인
- `config.js`와 `.p8` 파일은 절대 공유/업로드하지 마세요 (`.gitignore`에 제외돼 있어요).

## 4. 채보 만드는 법

유튜브/애플뮤직은 음원을 분석할 수 없어서 아래 방법을 씁니다.

**방법 A. 채보 녹화 (추천)**
1. 곡 선택 → **🎙 채보 녹화** 클릭
2. 카운트다운 후 곡이 나오면 노래에 맞춰 `D F J K`를 직접 입력
3. 곡이 끝나거나 `Enter`를 누르면 저장 (브라우저에 저장됨)
4. 결과 화면의 **채보 파일(JSON) 저장**으로 내려받아 `charts/` 폴더에 넣어두면 다른 PC에서도 사용 가능
   - 파일 이름은 결과 화면에 표시된 대로 `유튜브방식id.json` 형태예요. 예: `charts/youtube-bang3.json`
5. 쉬움/보통/어려움은 녹화한 노트를 간격에 따라 자동으로 솎아서 만듭니다
- 채보는 음원 방식별로 따로 저장돼요. (유튜브 영상과 애플뮤직 음원은 시작 위치가 다를 수 있어서)

**방법 B. 자동 BPM 채보**
- `songs.js`에 `bpm`과 `offset`(첫 박 시작 시간, 초)을 입력하면 박자에 맞춘 채보가 만들어집니다.

## 5. 알아둘 점

- 유튜브/애플뮤직 모드는 **인터넷 연결**이 필요해요. 행사 PC에서 미리 곡마다 재생과 채보를 확인해 두세요.
- 재생 시각을 주기적으로 읽어 맞추는 방식이라 기기에 따라 소리와 노트가 조금 어긋날 수 있어요. **싱크 보정**으로 맞추세요.
- 파일 모드의 음원은 저작권이 있으므로 `.gitignore`로 GitHub에 올라가지 않게 해두었습니다.

## 6. GitHub 연동

```bash
git init
git add .
git commit -m "리듬게임 첫 버전"
git branch -M main
git remote add origin https://github.com/내아이디/rhythm-game.git
git push -u origin main
```

## 7. 파일 구조

```
rhythm-game/
├─ index.html          화면 구성
├─ style.css           스타일
├─ songs.js            곡 목록 (유튜브 링크, 애플뮤직 ID, BPM, 파일명)
├─ game.js             게임 로직 (판정, 점수, 채보, 녹화)
├─ youtube.js          유튜브 재생 연결
├─ applemusic.js       애플뮤직(MusicKit) 연결
├─ config.example.js   토큰 설정 예시 (애플뮤직용)
├─ tools/make-token.js 개발자 토큰 생성기 (애플뮤직용)
├─ charts/             녹화 채보 JSON 보관 (선택)
└─ assets/songs/       파일 모드용 음원 폴더
```
