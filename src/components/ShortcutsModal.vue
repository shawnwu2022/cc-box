<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <header class="modal-header">
            <h2>{{ t('keyboardShortcuts') }}</h2>
            <button class="close-btn" @click="$emit('close')">
              <img src="@/assets/icons/close.svg" :alt="t('close')" />
            </button>
          </header>

          <div class="modal-body">
            <section v-for="group in groups" :key="group.title" class="shortcuts-section">
              <h3>{{ group.title }}</h3>
              <p v-if="group.hint" class="hint">{{ group.hint }}</p>
              <div class="shortcuts-list">
                <div v-for="item in group.items" :key="item.key" class="shortcut-item">
                  <kbd>{{ item.key }}</kbd>
                  <span>{{ item.desc }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ctrl, alt, cmd, isMac } from '@/utils/platform'

const { t } = useI18n()

defineProps<{
  visible: boolean
}>()

defineEmits<{
  close: []
}>()

const groups = computed(() => [
  {
    title: t('applicationShortcuts'),
    items: [
      { key: `${cmd}+Shift+N`, desc: t('shortcut_openNewWindow') },
      { key: `${cmd}+Shift+← / →`, desc: t('shortcut_snapWindow') },
      { key: `${cmd}+Shift+R`, desc: t('shortcut_restartApp') },
      { key: `${cmd}+Shift+H`, desc: t('shortcut_toggleHome') },
      { key: `${cmd}+Shift+/`, desc: t('shortcut_showShortcuts') },
      { key: `${cmd}+Shift+S`, desc: t('shortcut_toggleSessions') },
      { key: `${cmd}+Shift+T`, desc: t('shortcut_toggleAlwaysOnTop') },
      { key: `${cmd},`, desc: t('shortcut_toggleSettings') },
      { key: `${cmd}+Plus / −`, desc: t('shortcut_fontSize') },
      { key: `${cmd}+0`, desc: t('shortcut_resetFontSize') },
    ]
  },
  {
    title: t('sessionManagement'),
    items: [
      { key: `${alt}+N`, desc: t('shortcut_newSession') },
      { key: `${alt}+R`, desc: t('shortcut_restartSession') },
      { key: `${alt}+W`, desc: t('shortcut_closeTab') },
      { key: `${ctrl}+Tab`, desc: t('shortcut_switchNext') },
      { key: `${ctrl}+Shift+Tab`, desc: t('shortcut_switchPrev') },
      { key: `${alt}+↑ / ↓`, desc: t('shortcut_switchAlt') },
    ]
  },
  {
    title: t('claudeCodeShortcuts'),
    hint: t('claudeCodeShortcutsHint'),
    items: [
      { key: `${ctrl}+C`, desc: t('shortcut_cancelInput') },
      { key: `${ctrl}+D`, desc: t('shortcut_exitSession') },
      { key: `${alt}+P`, desc: t('shortcut_switchModel') },
      { key: `${alt}+T`, desc: t('shortcut_toggleThinking') },
      { key: `${alt}+O`, desc: t('shortcut_toggleFast') },
      { key: `${ctrl}+L`, desc: t('shortcut_clearPrompt') },
      { key: `${ctrl}+R`, desc: t('shortcut_reverseSearch') },
      { key: `${ctrl}+O`, desc: t('shortcut_toggleTranscript') },
      { key: `${ctrl}+B`, desc: t('shortcut_backgroundTask') },
      { key: `${ctrl}+T`, desc: t('shortcut_toggleTaskList') },
      { key: 'Esc Esc', desc: t('shortcut_rewind') },
    ]
  },
  {
    title: t('textEditing'),
    items: [
      { key: `${ctrl}+A`, desc: t('shortcut_cursorStart') },
      { key: `${ctrl}+E`, desc: t('shortcut_cursorEnd') },
      { key: `${ctrl}+W`, desc: t('shortcut_deletePrevWord') },
      { key: `${ctrl}+K`, desc: t('shortcut_deleteToEnd') },
      { key: `${ctrl}+U`, desc: t('shortcut_deleteToStart') },
      { key: `${ctrl}+Y`, desc: t('shortcut_pasteDeleted') },
      { key: `${alt}+B`, desc: t('shortcut_moveBackWord') },
      { key: `${alt}+F`, desc: t('shortcut_moveForwardWord') },
    ]
  },
  {
    title: t('multilineInput'),
    items: [
      { key: '\\ + Enter', desc: t('shortcut_insertNewline') },
      { key: `${ctrl}+J`, desc: t('shortcut_insertNewlineAny') },
      ...(isMac
        ? [{ key: 'Shift+Enter', desc: t('shortcut_insertNewlineIterm') }]
        : [{ key: 'Shift+Enter', desc: t('shortcut_insertNewlineSupported') }]
      ),
    ]
  },
  {
    title: t('quickInput'),
    items: [
      { key: '/ at start', desc: t('shortcut_commandOrSkill') },
      { key: '! at start', desc: t('shortcut_bashMode') },
      { key: '@', desc: t('shortcut_fileMention') },
    ]
  },
  {
    title: t('slashCommands'),
    hint: t('slashCommandsHint'),
    items: [
      { key: '/help', desc: t('shortcut_slashHelp') },
      { key: '/clear', desc: t('shortcut_slashClear') },
      { key: '/compact', desc: t('shortcut_slashCompact') },
      { key: '/model', desc: t('shortcut_slashModel') },
      { key: '/cost', desc: t('shortcut_slashCost') },
      { key: '/permissions', desc: t('shortcut_slashPermissions') },
      { key: '/config', desc: t('shortcut_slashConfig') },
      { key: '/init', desc: t('shortcut_slashInit') },
      { key: '/resume', desc: t('shortcut_slashResume') },
      { key: '/diff', desc: t('shortcut_slashDiff') },
      { key: '/plan', desc: t('shortcut_slashPlan') },
      { key: '/review', desc: t('shortcut_slashReview') },
      { key: '/doctor', desc: t('shortcut_slashDoctor') },
      { key: '/exit', desc: t('shortcut_slashExit') },
    ]
  },
])
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 460px;
  max-height: 80vh;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
}

.close-btn img {
  width: 16px;
  height: 16px;
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  max-height: calc(80vh - 93px);
  overflow-y: auto;
}

.shortcuts-section {
  margin-bottom: 20px;
}

.shortcuts-section:last-child {
  margin-bottom: 0;
}

.shortcuts-section h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 6px;
  border-radius: 4px;
}

.shortcut-item:hover {
  background: var(--bg-secondary);
}

kbd {
  display: inline-block;
  padding: 3px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 100px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.shortcut-item span {
  font-size: 12px;
  color: var(--text-primary);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
