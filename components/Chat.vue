<template>
  <div>
    <div class="timeline">
      <div class="tweet" v-for="tweet in timeline">
        <div class="name">{{ tweet.user }}:</div>
        <div class="message">{{ tweet.message }}</div>
      </div>
    </div>
    <div class="message-group">
      <textarea class="message-box" v-model="message" :disabled="wait"></textarea>
      <button
        class="input-button"
        @click="inputMessage"
        :disabled="wait || message.length == 0"
      >
        入力
      </button>
    </div>
  </div>
</template>
<style scope>
div.timeline {
  background-color: gray;
  height: 80vh;
  overflow-y: scroll;
}
div.tweet {
  background-color: white;
  margin: 5px;
}
div.tweet>div.name {
  font-weight: bold;
}
div.tweet>div.message {
  font-style: italic;
}
div.message-group {
  height: 15vh;
  display: flex;
}
textarea.message-box {
  width: 70vw;
  height: 100%;
}
button.input-button {
  width: 20vw;
  height: 100%;
}
</style>
<script setup lang="ts">
const wait = ref(false);
const message = ref("");
const timeline = ref([]);

const session = await window.ai.createTextSession();

const inputMessage = async () => {
  wait.value = true;
  timeline.value.push({
    user: "あなた",
    message: message.value,
    timestamp: Date.now(),
  });
  const response = await session.prompt(message.value);
  message.value = "";
  timeline.value.push({
    user: "gemini-nano",
    message: response,
    timestamp: Date.now(),
  });
  wait.value = false;
};
</script>
