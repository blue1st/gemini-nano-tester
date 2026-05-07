# Aether AI - Chrome Prompt API Local Chat Client

Google Chrome (v148以上) に内蔵されたオンデバイスAI機能 **Built-in AI (Prompt API)** と **Gemini Nano** を活用した、100%完全ローカル＆プライベートで動作するPWAチャットクライアントです。

Vite + Tailwind CSS v4 でビルドされ、推論ログ可視化機能（Thinking Mode）などを実装しています。

👉 **[デモページはこちら（GitHub Pages）](https://blue1st.github.io/gemini-nano-tester/)**

---


## 🧠 LLM運用・開発用リファレンスコード 

Chrome built-in AI の API 仕様をラップし、ローカルでのパラメータ調整やストリーミング処理をオーケストレーションしたサンプルコードです。

開発やLLM運用において参照すべき [src/main.js](./src/main.js) の主要なコード箇所と、その役割を以下に解説します。

| 役割・機能 | 参照コード箇所 | 概要 |
| :--- | :--- | :--- |
| **API稼働可否チェック** | [getModelAvailability()](./src/main.js#L75-L92) | ブラウザが新型 `LanguageModel` API または旧型の `window.ai` に対応しているか、モデルダウンロードが必要かを診断します。 |
| **セッションの生成** | [createModelSession()](./src/main.js#L94-L105) | 環境差異を吸収して、互換性を保ちながら推論用AIセッションのインスタンスを作成します。 |
| **モデル weights のDL管理** | [triggerModelDownload()](./src/main.js#L166-L193) | ローカルストレージにモデル（Gemini Nano）がダウンロードされていない場合、`monitor` コールバックを渡し `downloadprogress` イベントによって進捗率（%）とダウンロード済バイト数をリアルタイム算出します。 |
| **システムプロンプト & パラメータ設定** | [handleMessageSubmission()](./src/main.js#L671-L680) | UI側のスライダーから取得した `temperature`（創造性）や `topK`、および入力されたシステムプロンプト指示（System Instructions）をセッション生成オプションに動的マッピングしてモデルを構築します。 |
| **推論のストリーミング処理** | [handleMessageSubmission()](./src/main.js#L682-L716) | `promptStreaming(prompt)` を呼び出し、非同期ジェネレータ（`for await (const chunk of stream)`）によって、文字が生成され次第即座にチャット画面を部分更新します。 |
| **CoT（Thinking Mode）誘導プロンプト** | [handleMessageSubmission()](./src/main.js#L659-L664) | モデルに論理的な自律思考を行わせるために、システム指示に「回答の前に `<think>` タグ内に日本語で思考プロセスを書き、タグを閉じた後に最終回答を出力せよ」というプロンプトを注入し、推論の開始時に `Assistant: <think>` を先行配置（Prefix Injection）して思考をトリガーします。 |
| **CoTリアルタイムパーサー** | [parseThinkingTags()](./src/main.js#L532-L551) | 生成中のストリームテキストに `<think>` や `</think>` が含まれているかを毎ステップ解析し、思考プロセス中のログとユーザー宛の最終回答部分をきれいに分離してUIに渡します。 |
| **ローカル用トークン換算** | [estimateTokens()](./src/main.js#L591-L604) | 完全にオフラインな環境で推論速度（Tokens/Sec）を可視化するために、英語ワード・記号（0.25トークン/字）とCJK/和文（約1トークン/字）を判別して換算する、Gemini Nanoに最適化された軽量トークンカウンタ・アルゴリズムです。 |

---

## 🛠️ 事前準備: Chrome 内蔵 AI の有効化手順

Chrome Built-in AI は、デバイス要件や空きストレージに非常に敏感です。有効化されない場合は以下のステップを実行してください。

1. **お使いのChromeのバージョン確認**:
   - `Chrome 148 以上`（CanaryやDev/Beta版、あるいは十分にアップデートされたStable版）であることを確認してください。
2. **Flags (設定フラグ) の変更**:
   - ChromeのURLバーに `chrome://flags` を入力し、以下の2項目を変更（Enabled）します。
     - **Prompt API for Gemini Nano**: `Enabled` または `Enabled with bypass` に設定。
     - **Enables optimization guide on-device model**: `Enabled BypassPerfRequirement` または `Enabled` に設定。
   - 設定後、Chromeを完全に再起動します（※Macでは `Cmd + Q` で確実にプロセスを落としてから再起動してください）。
3. **空きストレージ容量の確保 (最重要)**:
   - オンデバイスAIモデルの構築には **22GB以上のSSD空き容量** が必要です。空き容量が不足していると、Chromeが内部的にモデルのダウンロードを黙って中断するため、APIが `undefined` のままになります。
4. **内部ダウンロード状態の監視**:
   - `chrome://on-device-internals` を開き、「Model Status」タブから Gemini Nano のロード進捗状況や、ダウンロード中に発生しているリアルタイムなエラーログを確認・デバッグできます。

---

## 💻 開発 & プレビュー

### 依存関係のインストール
```bash
npm install
```

### ローカル起動 (開発サーバー)
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開いて動作を確認します。

### ローカルビルド & プレビュー (動作検証用)
```bash
npm run build
npm run preview
```

