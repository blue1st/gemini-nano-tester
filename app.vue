<template>
  <div>
    <Chat v-if="enableGemini === 'readily'"/>
    <Guide v-else/>
  </div>
</template>
<script setup lang="ts">
  const enableGemini = ref(null)
  onMounted(
    async () => {
      enableGemini.value = await window?.ai?.canCreateTextSession()
    }
  )
  // flagsでwindow.aiが使える
  // 容量不足で"no"
  // 容量OKでcomponentsの操作待ちで"after-download"
  // OKだと"readily"
</script>
