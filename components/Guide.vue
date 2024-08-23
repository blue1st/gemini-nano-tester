<template>
  <div>
    <div>
      <h2>Step. 1: Google Chromeのバージョン確認</h2>
      <div>
        <a href="chrome://settings/help">chrome://settings/help</a>
        <p>バージョン128以降になっていることを確認してください。</p>
      </div>
    </div>
    <div>
      <h2>Step. 2: 機能の有効化</h2>
      <div>
        <a href="chrome://flags">chrome://flags</a>
        <p>
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
        <a href="chrome://components">chrome://components</a>
        <p><a @click="createSession">window.ai.createTextSession()<a>を何度か試行した上で、</p>
        <p>
          <b>Optimization Guide On Device Model </b>
          項目が出ていれば、「アップデートを確認」ボタンでモデルをダウンロード。
        </p>
         <p>項目が表示されない場合はPCの空き容量が22GB以上あるかを確認する。</p>
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
