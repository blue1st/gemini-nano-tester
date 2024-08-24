<template>
  <div>
    <div>
      <h2>Step. 1: Google Chromeのバージョン確認</h2>
      <div>
        <img src="~/assets/img/step1.png" alt="Chromeバージョンチェック">
        <p>
          アドレスバーに<b>chrome://settings/help</b>を入力し、バージョン128以降になっていることを確認してください。</p>
      </div>
    </div>
    <div>
      <h2>Step. 2: 機能の有効化</h2>
      <div>
        <img src="~/assets/img/step2-1.png" alt="Enables optimization guide on device">
        <img src="~/assets/img/step2-2.png" alt="Prompt API for Gemini Nano">
        <p>
          アドレスバーに<b>chrome://flags</b>を入力してフラグ画面を開き、
          <b>Enables optimization guide on device</b>
          および
          <b>Prompt API for Gemini Nano</b>
          をEnable（有効）に変更し、再起動ボタンを押してください。
        </p>
      </div>
    </div>
    <div>
      <h2>Step. 3: モデルのダウンロード</h2>
      <div>
        <img src="~/assets/img/step3.png" alt="Optimization Guide On Device Model">
        <p>
          <button @click="createSession">window.ai.createTextSession()</button>を何度か試行した上で、
          アドレスバーに<b>chrome://components</b>を入力してコンポーネント画面を開き、
          <b>Optimization Guide On Device Model </b>
          項目が出ていれば、「アップデートを確認」ボタンでモデルをダウンロード。
        </p>
         <p>＊ PCの空き容量が22GB以上ないと上記は表示されないようです。</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  const createSession = async () => {
    await window.ai.createTextSession() 
    alert('実行してみました')
  }
</script>
