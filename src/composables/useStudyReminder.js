import { ref } from "vue";

export function getTodayStats(fish) {
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = (fish.state.pomodoroLogs || []).filter(l => l.date === today);
  let studyMin = 0;
  let nonStudyMin = 0;
  todayLogs.forEach(l => {
    const m = Number(l.minutes) || 0;
    if (l.subject === 'nonStudy') nonStudyMin += m;
    else studyMin += m;
  });
  return { studyMin, nonStudyMin, total: studyMin + nonStudyMin };
}

export function shouldWarn(stats) {
  return stats.total >= 10 && stats.nonStudyMin > stats.total / 2;
}

export function buildReminderText(activeMinutes, todayStudyMinutes, isWarning) {
  if (isWarning) {
    return `今天非学习时间已经占大头了，再这样真要考不上了。回来学：当前已进行 ${activeMinutes} 分钟，今日有效学习 ${todayStudyMinutes} 分钟。`;
  }
  return `已学习 ${todayStudyMinutes} 分钟，当前这颗番茄已进行 ${activeMinutes} 分钟。`;
}

function sendSystemNotification(msg) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Kitty Focus', { body: msg, icon: '/favicon.ico' });
    return true;
  }
  return false;
}

export function useStudyReminder(fish, showToast) {
  let lastNotifiedBucket = null;
  let lastMinuteLogged = null;
  let firstCallDone = false;

  const permissionState = ref(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  function requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    Notification.requestPermission().then(perm => {
      permissionState.value = perm;
    });
  }

  function resetBucket() {
    lastNotifiedBucket = null;
    lastMinuteLogged = null;
  }

  function checkReminder(timerState) {
    if (!timerState.running || !timerState._startTimestamp) {
      return;
    }

    if (!firstCallDone) {
      firstCallDone = true;
      console.log('[reminder] checkReminder first call OK. running:', timerState.running, 'hasTs:', !!timerState._startTimestamp);
    }

    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timerState._startTimestamp).getTime()) / 1000));
    const elapsedMin = Math.floor(elapsedSec / 60);
    const bucket = Math.floor(elapsedMin / 5);

    if (elapsedMin > 0 && elapsedMin !== lastMinuteLogged) {
      lastMinuteLogged = elapsedMin;
      console.log('[reminder] tick min:', elapsedMin, 'bucket:', bucket, 'lastFired:', lastNotifiedBucket);
    }

    if (bucket < 1 || bucket === lastNotifiedBucket) return;

    lastNotifiedBucket = bucket;

    const stats = getTodayStats(fish);
    const activeMinutes = elapsedMin;
    const todayStudyMinutes = stats.studyMin + (timerState.subject !== 'nonStudy' ? activeMinutes : 0);
    const warn = shouldWarn(stats);
    const msg = buildReminderText(activeMinutes, todayStudyMinutes, warn);

    console.log('[reminder] FIRING bucket', bucket, ':', msg);

    try { sendSystemNotification(msg); } catch (e) { console.log('[reminder] notif error:', e); }
    showToast(msg);
    console.log('[reminder] showToast done');
  }

  return { checkReminder, resetBucket, permissionState, requestPermission, _debugFire() {
    const stats = getTodayStats(fish);
    const msg = buildReminderText(5, stats.studyMin, shouldWarn(stats));
    sendSystemNotification(msg);
    showToast(msg);
    console.log('[reminder] debugFire: showToast called with:', msg, 'notifPerm:', 'Notification' in window ? Notification.permission : 'none');
  } };
}
